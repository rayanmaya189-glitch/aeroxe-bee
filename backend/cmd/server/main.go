package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/textbee/backend/internal/api"
	"github.com/textbee/backend/internal/api/handlers"
	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/circuitbreaker"
	"github.com/textbee/backend/internal/config"
	"github.com/textbee/backend/internal/database"
	"github.com/textbee/backend/internal/deliveryconf"
	"github.com/textbee/backend/internal/encryption"
	"github.com/textbee/backend/internal/fraud"
	"github.com/textbee/backend/internal/idempotency"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/mqtt"
	"github.com/textbee/backend/internal/ratecontrol"
	"github.com/textbee/backend/internal/routing"
	"github.com/textbee/backend/internal/services"
	"github.com/textbee/backend/internal/simhealth"
	"github.com/textbee/backend/internal/telemetry"
	"github.com/textbee/backend/internal/webhook"
	"github.com/textbee/backend/internal/worker"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	logger := telemetry.NewLogger(cfg.Telemetry.LogLevel, cfg.Telemetry.LogFormat)
	logger.Info("starting AeroXe Bee backend", "version", "1.0.0", "env", cfg.App.Environment)

	postgres, err := database.NewPostgres(cfg.Database)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer postgres.Close()
	logger.Info("postgres connected", "pool_size", cfg.Database.MaxOpenConns)

	redisDB, err := database.NewRedis(cfg.Redis)
	if err != nil {
		logger.Error("redis connection failed", "error", err)
		os.Exit(1)
	}
	defer redisDB.Close()
	logger.Info("redis connected", "addr", cfg.RedisAddr())

	encMgr, err := encryption.New(cfg.Encryption.MasterKey)
	if err != nil {
		logger.Warn("encryption disabled: master key not configured")
	}

	svc := services.NewServiceRegistry(postgres.Pool, redisDB.Client, cfg.OTP)
	userService := services.NewUserService(postgres.Pool)

	// Seed admin user on startup
	seedAdminUser(context.Background(), postgres.Pool, logger)

	idempotencyStore := idempotency.NewStore(redisDB.Client, cfg.App.IdempotencyTTL)
	rateMgr := ratecontrol.NewManager(redisDB.Client, cfg.RateLimit)

	queue := worker.NewQueue(redisDB.Client, cfg.Queue, logger.Logger)
	if err := queue.CreateConsumerGroup(context.Background()); err != nil {
		logger.Error("failed to create consumer groups", "error", err)
		os.Exit(1)
	}
	logger.Info("redis streams ready",
		"otp_queue", cfg.Queue.OTPStream,
		"tx_queue", cfg.Queue.TransactionalStream,
		"mkt_queue", cfg.Queue.MarketingStream)

	metrics := telemetry.NewMetrics()

	simHealthEngine := simhealth.NewEngine(cfg.SIMHealth)
	deliveryEngine := deliveryconf.NewEngine(cfg.Delivery)
	routingSelector := routing.NewSelector(models.RoutingStrategyHighestReliability)
	cbManager := circuitbreaker.NewStateManager(redisDB.Client, cfg.CircuitBreaker)
	fraudDetector := fraud.NewDetector(redisDB.Client)
	webhookDispatcher := webhook.NewDispatcher(cfg.Webhook)

	mqttClient := mqtt.NewClient(cfg.MQTT, logger.Logger)
	if err := mqttClient.Connect(); err != nil {
		logger.Warn("mqtt not available, SMS dispatch will fail until broker connects", "error", err)
	} else {
		defer mqttClient.Disconnect()
		logger.Info("mqtt broker connected")

		if err := mqttClient.Subscribe("devices/+/status", func(topic string, payload []byte) {
			var statusReport struct {
				MessageID      string  `json:"message_id"`
				DeviceID       string  `json:"device_id"`
				Status         string  `json:"status"`
				DeliveryStatus string  `json:"delivery_status"`
				Error          *string `json:"error,omitempty"`
				SIMSlot        int     `json:"sim_slot"`
				Timestamp      int64   `json:"timestamp"`
			}
			if err := json.Unmarshal(payload, &statusReport); err != nil {
				logger.Error("failed to parse device status", "topic", topic, "error", err)
				return
			}
			switch statusReport.Status {
			case "SENT", "DELIVERED":
				if err := svc.Messages.UpdateDeliveryStatus(context.Background(), statusReport.MessageID,
					models.DeliveryStatus(statusReport.DeliveryStatus), 1.0); err != nil {
					logger.Error("mqtt status: update delivery failed", "msg_id", statusReport.MessageID, "error", err)
				}
				if statusReport.DeviceID != "" {
					if err := svc.Devices.UpdatePong(context.Background(), statusReport.DeviceID); err != nil {
						logger.Error("mqtt status: update pong failed", "device_id", statusReport.DeviceID, "error", err)
					}
				}
			case "FAILED":
				reason := "device reported failure"
				if statusReport.Error != nil {
					reason = *statusReport.Error
				}
				if err := svc.Messages.MarkFailed(context.Background(), statusReport.MessageID, reason); err != nil {
					logger.Error("mqtt status: mark failed", "msg_id", statusReport.MessageID, "error", err)
				}
				if statusReport.DeviceID != "" {
					if err := svc.Devices.UpdateStatus(context.Background(), statusReport.DeviceID, models.DeviceStatusOffline); err != nil {
						logger.Error("mqtt status: update status failed", "device_id", statusReport.DeviceID, "error", err)
					}
				}
			}
		}); err != nil {
			logger.Warn("failed to subscribe to device status", "error", err)
		}

		if err := mqttClient.Subscribe("devices/+/ping", func(topic string, payload []byte) {
			var pingReport struct {
				DeviceID  string `json:"device_id"`
				Timestamp int64  `json:"timestamp"`
			}
			if err := json.Unmarshal(payload, &pingReport); err != nil {
				logger.Error("failed to parse device ping", "topic", topic, "error", err)
				return
			}
			if pingReport.DeviceID != "" {
				if err := mqttClient.SendPong(context.Background(), pingReport.DeviceID); err != nil {
					logger.Error("mqtt ping: send pong failed", "device_id", pingReport.DeviceID, "error", err)
				}
			}
		}); err != nil {
			logger.Warn("failed to subscribe to device ping", "error", err)
		}

		if err := mqttClient.Subscribe("devices/+/ack", func(topic string, payload []byte) {
			var ackReport struct {
				DeviceID  string `json:"device_id"`
				Timestamp int64  `json:"timestamp"`
			}
			if err := json.Unmarshal(payload, &ackReport); err != nil {
				logger.Error("failed to parse device ack", "topic", topic, "error", err)
				return
			}
			if ackReport.DeviceID != "" {
				if err := svc.Devices.UpdatePong(context.Background(), ackReport.DeviceID); err != nil {
					logger.Error("mqtt ack: update pong failed", "device_id", ackReport.DeviceID, "error", err)
				}
			}
		}); err != nil {
			logger.Warn("failed to subscribe to device ack", "error", err)
		}
	}

	workerCount := cfg.Queue.WorkerCount
	if workerCount < 1 {
		workerCount = 3
	}

	for i := 0; i < workerCount; i++ {
		consumer := queue.NewConsumer(
			fmt.Sprintf("%s-%d", cfg.Queue.ConsumerName, i),
			func(ctx context.Context, lane worker.PriorityLane, msg *worker.QueueMessage) error {
				return processMessage(ctx, msg, svc, mqttClient, simHealthEngine, deliveryEngine,
					routingSelector, cbManager, rateMgr, fraudDetector, webhookDispatcher,
					encMgr, cfg, metrics, lane, logger)
			},
		)
		go consumer.Start(context.Background())
	}
	logger.Info("workers started", "count", workerCount)
	metrics.WorkersActive.Set(float64(workerCount))

	authMiddleware := middleware.NewAuthMiddleware(svc.APIKeys, svc.Accounts, cfg.JWT.Secret)

	authHandler := handlers.NewAuthHandler(svc.Accounts, svc.Admin, userService, authMiddleware)
	messageHandler := handlers.NewMessageHandler(svc.Messages, svc.Devices, svc.Accounts,
		idempotencyStore, queue, encMgr, cfg.App, metrics)
	deviceHandler := handlers.NewDeviceHandler(svc.Devices, svc.Messages, svc.APIKeys, svc.MQTTCredentials, svc.Accounts, encMgr, cfg.MQTT.BrokerURL(), authMiddleware)
	accountHandler := handlers.NewAccountHandler(svc.Accounts, svc.APIKeys, svc.Subscriptions, svc.Billing)
	adminHandler := handlers.NewAdminHandler(svc.Admin, cbManager, metrics)
	userHandler := handlers.NewUserHandler(userService, authMiddleware)
	templateHandler := handlers.NewTemplateHandler(svc.Templates)
	webhookHandler := handlers.NewWebhookHandler(svc.Webhooks)
	otpHandler := handlers.NewOTPHandler(svc.OTP, metrics)
	billingHandler := handlers.NewBillingHandler(svc.Billing, svc.Subscriptions)
	fraudHandler := handlers.NewFraudHandler(fraudDetector)
	memberHandler := handlers.NewMemberHandler(svc.Accounts, svc.Devices, svc.Messages, svc.Billing, svc.Subscriptions, svc.Templates, svc.Webhooks)

	router := api.NewRouter(authHandler, messageHandler, deviceHandler, accountHandler,
		adminHandler, userHandler, templateHandler, webhookHandler, otpHandler, billingHandler,
		fraudHandler, memberHandler, authMiddleware, metrics, postgres, redisDB)

	promMux := http.NewServeMux()
	promMux.Handle("/metrics", promhttp.Handler())
	promServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Telemetry.PrometheusPort),
		Handler: promMux,
	}

	apiServer := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      corsMiddleware(metrics, router),
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("prometheus metrics", "port", cfg.Telemetry.PrometheusPort)
		if err := promServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("prometheus server error", "error", err)
		}
	}()

	go func() {
		logger.Info("api server listening", "addr", apiServer.Addr)
		if err := apiServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api server error", "error", err)
		}
	}()

	go startBackgroundJobs(context.Background(), svc, simHealthEngine, cbManager, queue, metrics, logger)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	logger.Info("shutting down", "signal", sig)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := apiServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("api server shutdown error", "error", err)
	}
	if err := promServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("prometheus server shutdown error", "error", err)
	}

	queue.Close()
	logger.Info("shutdown complete")
}

func processMessage(
	ctx context.Context,
	msg *worker.QueueMessage,
	svc *services.ServiceRegistry,
	mqttClient *mqtt.Client,
	simHealth *simhealth.Engine,
	deliveryEngine *deliveryconf.Engine,
	selector *routing.Selector,
	cbManager *circuitbreaker.StateManager,
	rateMgr *ratecontrol.Manager,
	fraudDetector *fraud.Detector,
	webhookDispatcher *webhook.Dispatcher,
	encMgr *encryption.Manager,
	cfg *config.Config,
	metrics *telemetry.Metrics,
	lane worker.PriorityLane,
	logger *telemetry.Logger,
) error {
	startTime := time.Now()

	if cbManager.IsOpen(ctx, models.CBScopeAccount, msg.AccountID) {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("account circuit breaker open: %s", msg.AccountID)
	}

	fraudInput := fraud.DetectionInput{
		AccountID:   msg.AccountID,
		DeviceID:    "",
		Recipient:   msg.Recipient,
		MessageType: msg.MessageType,
	}
	if result := fraudDetector.Analyze(ctx, fraudInput); result.Flagged {
		logger.Warn("fraud detected on message", "msg_id", msg.ID, "reason", result.Reason)
		fraudDetector.AddFraudFlag(ctx, models.FraudFlag{
			ID:          uuid.New().String(),
			AccountID:   msg.AccountID,
			FlagType:    result.Reason,
			Description: fmt.Sprintf("Message %s blocked by fraud detection: %s", msg.ID, result.Reason),
			Severity:    "high",
			Weight:      result.Weight,
			CreatedAt:   time.Now(),
		})
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("fraud blocked: %s", result.Reason)
	}

	devices, err := svc.Devices.GetEligibleDevices(ctx, services.DeviceFilterOptions{
		AccountID:            msg.AccountID,
		Status:               string(models.DeviceStatusOnline),
		ExcludeBlocked:       true,
		CircuitBreakerClosed: true,
		Limit:                10,
	})
	if err != nil {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("get eligible devices: %w", err)
	}
	if len(devices) == 0 {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("no eligible devices for account %s", msg.AccountID)
	}

	costMap, err := svc.CostTracking.GetCostMap(ctx, deviceIDs(devices))
	if err != nil {
		return fmt.Errorf("get cost map: %w", err)
	}

	recipientCountry := detectCountryFromPhone(msg.Recipient)
	opts := routing.DeviceOptions{
		Strategy:         msg.RoutingStrategy,
		RecipientCountry: recipientCountry,
		MaxResults:       3,
		ExcludeBlocked:   true,
		RequireOnline:    true,
	}
	scored := selector.FilterAndScore(devices, opts, costMap)
	if len(scored) == 0 {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("no device passed routing gates")
	}

	var lastErr error
	for _, scoredDevice := range scored {
		device := scoredDevice.Device

		if cbManager.IsOpen(ctx, models.CBScopeDevice, device.ID) {
			continue
		}

		carrierOK, err := rateMgr.CheckGlobalThrottle(ctx, "carrier", device.Carrier)
		if err != nil {
			lastErr = fmt.Errorf("throttle check failed: %w", err)
			continue
		}
		if !carrierOK {
			lastErr = fmt.Errorf("carrier throttled: %s", device.Carrier)
			continue
		}

		deviceOK, err := rateMgr.CheckDeviceRate(ctx, device.ID)
		if err != nil {
			lastErr = fmt.Errorf("rate check failed: %w", err)
			continue
		}
		if !deviceOK {
			lastErr = fmt.Errorf("device rate exceeded: %s", device.ID)
			continue
		}

		simStatus, slope := simHealth.EvaluateDevice(device.ID, device.SIMHealthStatus, device.SuccessRate24h)
		if simStatus == models.SIMHealthBlocked {
			lastErr = fmt.Errorf("sim blocked: %s", device.ID)
			continue
		}
		if simStatus != device.SIMHealthStatus || slope != device.HealthTrendSlope {
			if err := svc.Devices.UpdateHealthStatus(ctx, device.ID, simStatus, slope); err != nil {
				logger.Error("failed to update health status", "device_id", device.ID, "error", err)
			}
		}

		if mqttClient == nil || !mqttClient.IsConnected() {
			lastErr = fmt.Errorf("mqtt broker not connected, cannot send SMS")
			cbManager.RecordFailure(ctx, models.CBScopeDevice, device.ID)
			simHealth.RecordDelivery(device.ID, false)
			metrics.ObserveMessageFailed()
			continue
		}

		priority := "NORMAL"
		switch msg.Priority {
		case worker.LaneOTP:
			priority = "HIGH"
		case worker.LaneMarketing:
			priority = "LOW"
		}
		if err := mqttClient.SendSMSCommand(ctx, device.ID, msg.ID, msg.AccountID, msg.Recipient, msg.Message, priority); err != nil {
			cbManager.RecordFailure(ctx, models.CBScopeDevice, device.ID)
			simHealth.RecordDelivery(device.ID, false)
			lastErr = fmt.Errorf("mqtt send failed: %w", err)
			metrics.ObserveMessageFailed()
			continue
		}
		simHealth.RecordDelivery(device.ID, true)

		hasDeliveryReport := device.LastPongAt != nil && device.SuccessRate24h > 0
		carrierReturnsReceipts := device.Carrier == "AT&T" || device.Carrier == "Verizon" || device.Carrier == "T-Mobile"
		confidenceResult := deliveryEngine.CalculateFromDevice(device, hasDeliveryReport, carrierReturnsReceipts)

		if err := svc.Messages.UpdateDeliveryStatus(ctx, msg.ID, confidenceResult.DeliveryStatus, confidenceResult.Score); err != nil {
			logger.Error("failed to update delivery status", "msg_id", msg.ID, "error", err)
		}
		if err := svc.Messages.UpdateDeviceID(ctx, msg.ID, device.ID); err != nil {
			logger.Error("failed to update device id", "msg_id", msg.ID, "error", err)
		}

		if err := rateMgr.IncrementDeviceCounters(ctx, device.ID); err != nil {
			logger.Error("failed to increment device counter", "device_id", device.ID, "error", err)
		}
		if err := rateMgr.IncrementGlobalThrottle(ctx, "carrier", device.Carrier); err != nil {
			logger.Error("failed to increment throttle", "carrier", device.Carrier, "error", err)
		}
		if err := svc.Devices.RecordSent(ctx, device.ID); err != nil {
			logger.Error("failed to record sent", "device_id", device.ID, "error", err)
		}
		if err := svc.Accounts.IncrementUsage(ctx, msg.AccountID); err != nil {
			logger.Error("failed to increment usage", "account_id", msg.AccountID, "error", err)
		}

		cbManager.RecordSuccess(ctx, models.CBScopeDevice, device.ID)

		latency := time.Since(startTime)
		metrics.ObserveMessageDelivered(confidenceResult.Score)
		metrics.ObserveMessageLatency(latency)
		metrics.ObserveQueueProcessed(string(lane), true)

		logger.Info("message delivered",
			"msg_id", msg.ID,
			"device", device.ID,
			"carrier", device.Carrier,
			"status", confidenceResult.DeliveryStatus,
			"confidence", fmt.Sprintf("%.2f", confidenceResult.Score),
			"latency", telemetry.FormatDuration(latency),
			"routing_strategy", msg.RoutingStrategy,
		)

		go dispatchWebhooks(ctx, svc, webhookDispatcher, msg, device, confidenceResult, logger)

		return nil
	}

	if lastErr != nil {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
	}
	return lastErr
}

func dispatchWebhooks(
	ctx context.Context,
	svc *services.ServiceRegistry,
	dispatcher *webhook.Dispatcher,
	msg *worker.QueueMessage,
	device models.Device,
	result deliveryconf.ConfidenceResult,
	logger *telemetry.Logger,
) {
	webhooks, err := svc.Webhooks.GetActiveByAccountAndEvent(ctx, msg.AccountID, "message.delivered")
	if err != nil {
		logger.Error("failed to fetch webhooks", "error", err)
		return
	}
	if len(webhooks) == 0 {
		return
	}

	payload := webhook.Payload{
		Event:           "message.delivered",
		MessageID:       msg.ID,
		Recipient:       msg.Recipient,
		Sender:          msg.Sender,
		MessageType:     string(msg.MessageType),
		DeliveryStatus:  result.DeliveryStatus,
		ConfidenceScore: result.Score,
		Timestamp:       time.Now(),
	}

	for _, wh := range webhooks {
		state := dispatcher.DispatchWithRetry(ctx, wh, payload)
		logger.Info("webhook dispatched",
			"webhook_id", wh.ID,
			"message_id", msg.ID,
			"status", state.LastStatus,
			"attempts", state.Attempts,
		)
	}
}

func startBackgroundJobs(
	ctx context.Context,
	svc *services.ServiceRegistry,
	simHealth *simhealth.Engine,
	cbManager *circuitbreaker.StateManager,
	queue *worker.Queue,
	metrics *telemetry.Metrics,
	logger *telemetry.Logger,
) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			depths := queue.GetQueueDepths(ctx)
			for lane, depth := range depths {
				metrics.ObserveQueueDepth(string(lane), depth)
			}

			simHealth.Cleanup()

			cbEvents := cbManager.GetAllStates(ctx)
			for _, ev := range cbEvents {
				stateVal := 0
				if ev.State == models.CBStateOpen {
					stateVal = 2
				} else if ev.State == models.CBStateHalfOpen {
					stateVal = 1
				}
				metrics.ObserveCircuitBreakerState(string(ev.Scope), ev.ScopeValue, stateVal)
			}

			if devices, err := svc.Devices.ListAll(ctx); err == nil {
				onlineCount := 0
				carrierFailures := make(map[string]int)
				carrierTotal := make(map[string]int)
				for _, d := range devices {
					if d.Status == models.DeviceStatusOnline {
						onlineCount++
					}
					metrics.ObserveDeviceHealth(d.ID, d.Carrier, simHealthStatusToInt(d.SIMHealthStatus))
					metrics.DeviceUptime.WithLabelValues(d.ID, d.Carrier).Set(d.UptimeRatio24h)
					if d.Carrier != "" {
						carrierTotal[d.Carrier]++
						if d.SIMHealthStatus == models.SIMHealthBlocked || d.SIMHealthStatus == models.SIMHealthDegraded {
							carrierFailures[d.Carrier]++
						}
					}
				}
				metrics.ActiveDevices.Set(float64(onlineCount))
				for carrier, total := range carrierTotal {
					failures := carrierFailures[carrier]
					rate := float64(failures) / float64(total)
					metrics.CarrierFailureRate.WithLabelValues(carrier).Set(rate)
				}
			}

			if err := svc.Admin.RecordAnalyticsDaily(ctx); err != nil {
				logger.Error("failed to record daily analytics", "error", err)
			}

			if err := svc.Messages.DeleteOld(ctx); err != nil {
				logger.Error("failed to cleanup old messages", "error", err)
			}
		}
	}
}

func detectCountryFromPhone(phone string) string {
	if len(phone) < 3 {
		return ""
	}
	prefixes := map[string]string{
		"1":   "US",
		"44":  "GB",
		"91":  "IN",
		"86":  "CN",
		"81":  "JP",
		"82":  "KR",
		"49":  "DE",
		"33":  "FR",
		"39":  "IT",
		"34":  "ES",
		"61":  "AU",
		"55":  "BR",
		"7":   "RU",
		"52":  "MX",
		"971": "AE",
		"855": "KH",
	}
	if phone[0] == '+' {
		phone = phone[1:]
	}
	for prefix, country := range prefixes {
		if len(phone) >= len(prefix) && phone[:len(prefix)] == prefix {
			return country
		}
	}
	return ""
}

func simHealthStatusToInt(s models.SIMHealthStatus) int {
	switch s {
	case models.SIMHealthHealthy:
		return 0
	case models.SIMHealthDegraded:
		return 1
	case models.SIMHealthBlocked:
		return 2
	default:
		return 0
	}
}

func deviceIDs(devices []models.Device) []string {
	ids := make([]string, len(devices))
	for i, d := range devices {
		ids[i] = d.ID
	}
	return ids
}

func corsMiddleware(metrics *telemetry.Metrics, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Signature")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
		metrics.ObserveAPILatency(r.Method, r.URL.Path, 200, time.Since(start))
	})
}

// seedAdminUser ensures the users table exists and a default admin user is available.
// This runs on every server start and is idempotent.
func seedAdminUser(ctx context.Context, pool *pgxpool.Pool, logger *telemetry.Logger) {
	// Create users table
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL DEFAULT 'staff',
		status VARCHAR(50) NOT NULL DEFAULT 'active',
		avatar VARCHAR(512) DEFAULT '',
		last_login TIMESTAMPTZ,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		logger.Warn("seed: failed to create users table", "error", err)
		return
	}

	// Create activity_log table
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS activity_log (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID REFERENCES users(id) ON DELETE SET NULL,
		user_name VARCHAR(255) NOT NULL DEFAULT '',
		action VARCHAR(100) NOT NULL,
		resource VARCHAR(100) NOT NULL,
		resource_id VARCHAR(255) DEFAULT '',
		details TEXT DEFAULT '',
		ip_address VARCHAR(45) DEFAULT '',
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		logger.Warn("seed: failed to create activity_log table", "error", err)
		return
	}

	// Create indexes
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
		`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`,
	}
	for _, idx := range indexes {
		if _, err := pool.Exec(ctx, idx); err != nil {
			logger.Warn("seed: failed to create index", "error", err)
		}
	}

	// Check if admin user already exists
	var exists bool
	err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@textbee.dev' LIMIT 1)`).Scan(&exists)
	if err != nil {
		logger.Warn("seed: failed to check admin user", "error", err)
		return
	}
	if exists {
		logger.Info("seed: admin user already exists, skipping creation", "email", "admin@textbee.dev")
		return
	}

	// Create admin user
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)
	if err != nil {
		logger.Warn("seed: failed to hash password", "error", err)
		return
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)`,
		"Admin", "admin@textbee.dev", string(hash), "admin", "active",
	); err != nil {
		logger.Warn("seed: failed to create admin user", "error", err)
		return
	}
	logger.Info("seed: admin user created", "email", "admin@textbee.dev", "password", "admin123456")
}
