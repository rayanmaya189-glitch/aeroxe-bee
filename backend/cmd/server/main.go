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

	"crypto/rand"
	"encoding/hex"
	"strings"

	"github.com/aeroxe-bee/backend/internal/api"
	"github.com/aeroxe-bee/backend/internal/api/handlers"
	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/circuitbreaker"
	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/database"
	"github.com/aeroxe-bee/backend/internal/deliveryconf"
	"github.com/aeroxe-bee/backend/internal/encryption"
	"github.com/aeroxe-bee/backend/internal/fcm"
	"github.com/aeroxe-bee/backend/internal/fraud"
	"github.com/aeroxe-bee/backend/internal/idempotency"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/mqtt"
	"github.com/aeroxe-bee/backend/internal/ratecontrol"
	"github.com/aeroxe-bee/backend/internal/routing"
	"github.com/aeroxe-bee/backend/internal/scheduler"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/simhealth"
	"github.com/aeroxe-bee/backend/internal/telemetry"
	"github.com/aeroxe-bee/backend/internal/webhook"
	"github.com/aeroxe-bee/backend/internal/worker"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()
	logger := telemetry.NewLogger(cfg.Telemetry.LogLevel, cfg.Telemetry.LogFormat)
	logger.Info("starting AeroXe Bee backend", "version", "1.0.0", "env", cfg.App.Environment, "copyright", "Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India")

	// Validate production secrets before starting
	if err := config.ValidateProduction(cfg); err != nil {
		logger.Error("startup validation failed", "error", err)
		os.Exit(1)
	}

	postgres, err := database.NewPostgres(cfg.Database)
	if err != nil {
		logger.Error("postgres connection failed", "error", err)
		os.Exit(1)
	}
	defer postgres.Close()
	logger.Info("postgres connected", "pool_size", cfg.Database.MaxOpenConns)

	// Ensure critical schema changes exist (defensive migration for non-Docker setups)
	ensureMQTTCredentialsMigration(context.Background(), postgres.Pool, logger)
	ensureWebhookDeliveriesMigration(context.Background(), postgres.Pool, logger)

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
	twoFAService := services.NewTwoFAService(postgres.Pool)
	sessionService := services.NewSessionService(postgres.Pool)

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

	// SSE handler for real-time device status updates
	sseHandler := handlers.NewSSEHandler(svc)
	// Perform initial device status sync for any already-connected SSE clients
	if devices, err := svc.Devices.ListAll(context.Background()); err == nil {
		for _, d := range devices {
			sseHandler.BroadcastDeviceStatus(d.ID, string(d.Status))
		}
	}

	simHealthEngine := simhealth.NewEngine(cfg.SIMHealth)
	deliveryEngine := deliveryconf.NewEngine(cfg.Delivery)
	routingSelector := routing.NewSelector()
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
				MessageID       string   `json:"message_id"`
				DeviceID        string   `json:"device_id"`
				Status          string   `json:"status"`
				DeliveryStatus  string   `json:"delivery_status"`
				ConfidenceScore *float64 `json:"confidence_score,omitempty"`
				Error           *string  `json:"error,omitempty"`
				SIMSlot         int      `json:"sim_slot"`
				Timestamp       int64    `json:"timestamp"`
			}
			if err := json.Unmarshal(payload, &statusReport); err != nil {
				logger.Error("failed to parse device status", "topic", topic, "error", err)
				return
			}
			switch statusReport.Status {
			case "SENT", "DELIVERED":
				// Honor the device-reported confidence when present; otherwise fall back to a
				// status-based default so a carrier-confirmed DELIVERED outranks a mere SENT.
				confidence := 1.0
				if statusReport.ConfidenceScore != nil {
					confidence = *statusReport.ConfidenceScore
				} else if statusReport.Status == "SENT" {
					confidence = 0.85
				}
				if err := svc.Messages.UpdateDeliveryStatus(context.Background(), statusReport.MessageID,
					models.DeliveryStatus(statusReport.DeliveryStatus), confidence); err != nil {
					logger.Error("mqtt status: update delivery failed", "msg_id", statusReport.MessageID, "error", err)
				}
				if statusReport.DeviceID != "" {
					if err := svc.Devices.UpdatePong(context.Background(), statusReport.DeviceID); err != nil {
						logger.Error("mqtt status: update pong failed", "device_id", statusReport.DeviceID, "error", err)
					}
					if sseHandler != nil {
						sseHandler.BroadcastMessageStatus(statusReport.MessageID, statusReport.DeviceID, statusReport.Status, statusReport.DeliveryStatus, confidence)
						sseHandler.BroadcastDeviceStatus(statusReport.DeviceID, "ONLINE")
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
					// Device is still connected to MQTT — only the SMS send failed.
					// UpdatePong to keep the device alive; don't mark it OFFLINE.
					if err := svc.Devices.UpdatePong(context.Background(), statusReport.DeviceID); err != nil {
						logger.Error("mqtt status: update pong failed", "device_id", statusReport.DeviceID, "error", err)
					}
					if sseHandler != nil {
						sseHandler.BroadcastMessageStatus(statusReport.MessageID, statusReport.DeviceID, statusReport.Status, "FAILED", 0.0)
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
				if sseHandler != nil {
					sseHandler.BroadcastDeviceStatus(ackReport.DeviceID, "ONLINE")
				}
			}
		}); err != nil {
			logger.Warn("failed to subscribe to device ack", "error", err)
		}

		// Inbound (received) SMS forwarded by device nodes — enables two-way SMS.
		if err := mqttClient.Subscribe("devices/+/inbox", func(topic string, payload []byte) {
			var inbound struct {
				DeviceID  string `json:"device_id"`
				Sender    string `json:"sender"`
				Recipient string `json:"recipient"`
				Body      string `json:"body"`
				SIMSlot   int    `json:"sim_slot"`
				Timestamp int64  `json:"timestamp"`
			}
			if err := json.Unmarshal(payload, &inbound); err != nil {
				logger.Error("failed to parse inbound sms", "topic", topic, "error", err)
				return
			}
			if inbound.DeviceID == "" {
				return
			}
			bgctx := context.Background()
			device, err := svc.Devices.GetByID(bgctx, inbound.DeviceID)
			if err != nil || device == nil {
				logger.Error("inbound sms: unknown device", "device_id", inbound.DeviceID, "error", err)
				return
			}
			// Encrypt the body at rest, mirroring outbound message storage.
			body := inbound.Body
			if encMgr != nil {
				if enc, encErr := encMgr.Encrypt([]byte(inbound.Body)); encErr == nil {
					body = enc
				} else {
					logger.Error("inbound sms: encrypt failed", "device_id", inbound.DeviceID, "error", encErr)
				}
			}
			im := &models.InboundMessage{
				DeviceID:   inbound.DeviceID,
				AccountID:  device.AccountID,
				Sender:     inbound.Sender,
				Recipient:  inbound.Recipient,
				Body:       body,
				SIMSlot:    inbound.SIMSlot,
				ReceivedAt: time.Now(),
			}
			if err := svc.InboundMessages.Create(bgctx, im); err != nil {
				logger.Error("inbound sms: persist failed", "device_id", inbound.DeviceID, "error", err)
				return
			}
			// Keep the device marked alive on inbound activity.
			if err := svc.Devices.UpdatePong(bgctx, inbound.DeviceID); err != nil {
				logger.Error("inbound sms: update pong failed", "device_id", inbound.DeviceID, "error", err)
			}
			if sseHandler != nil {
				sseHandler.BroadcastInboundMessage(device.AccountID, inbound.DeviceID, inbound.Sender, inbound.Body)
			}
		}); err != nil {
			logger.Warn("failed to subscribe to device inbox", "error", err)
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
				return processMessage(ctx, msg, svc, mqttClient, simHealthEngine, deliveryEngine, routingSelector, cbManager, rateMgr, fraudDetector, webhookDispatcher,
					encMgr, cfg, metrics, lane, logger)
			},
		)
		go consumer.Start(context.Background())
	}
	logger.Info("workers started", "count", workerCount)
	metrics.WorkersActive.Set(float64(workerCount))

	authMiddleware := middleware.NewAuthMiddleware(svc.APIKeys, svc.Accounts, cfg.JWT.Secret)
	planMiddleware := middleware.NewPlanMiddleware(svc.Accounts)

	passwordResetService := services.NewPasswordResetService(postgres.Pool)
	mailer := services.NewMailer(cfg.SMTP)

	authHandler := handlers.NewAuthHandler(svc.Accounts, svc.Admin, userService, authMiddleware, twoFAService, sessionService, passwordResetService, mailer, cfg.AppURL.BaseURL)
	twoFAHandler := handlers.NewTwoFAHandler(twoFAService)
	messageHandler := handlers.NewMessageHandler(svc.Messages, svc.Devices, svc.Accounts,
		idempotencyStore, queue, encMgr, cfg.App, metrics)
	deviceHandler := handlers.NewDeviceHandler(svc.Devices, svc.Messages, svc.APIKeys, svc.MQTTCredentials, svc.Accounts, encMgr, cfg.MQTT.BrokerURL(), authMiddleware, cfg.MQTT.DevicePassword)
	accountHandler := handlers.NewAccountHandler(svc.Accounts, svc.APIKeys, svc.Subscriptions, svc.Billing)
	adminHandler := handlers.NewAdminHandler(svc.Admin, cbManager, metrics)
	userHandler := handlers.NewUserHandler(userService, authMiddleware)
	templateHandler := handlers.NewTemplateHandler(svc.Templates, svc.Subscriptions)
	webhookHandler := handlers.NewWebhookHandler(svc.Webhooks, svc.WebhookDeliveries, webhookDispatcher)
	otpHandler := handlers.NewOTPHandler(svc.OTP, metrics)
	billingHandler := handlers.NewBillingHandler(svc.Billing, svc.Subscriptions)
	fraudHandler := handlers.NewFraudHandler(fraudDetector)
	preferencesService := services.NewUserPreferencesService(postgres.Pool)
	kycService := services.NewKycService(postgres.Pool)
	memberHandler := handlers.NewMemberHandler(svc.Accounts, svc.Devices, svc.Messages, svc.Billing, svc.Subscriptions, svc.Templates, svc.Webhooks, svc.WebhookDeliveries, webhookDispatcher, preferencesService, kycService, svc.InboundMessages, encMgr)
	qrPairingHandler := handlers.NewQRPairingHandler(svc.Devices, svc.Accounts, svc.MQTTCredentials, encMgr, cfg.MQTT.BrokerURL(), authMiddleware, cfg.MQTT.DevicePassword)
	releaseService := services.NewAppReleaseService(postgres.Pool)
	firebaseConfigService := services.NewFirebaseConfigService(postgres.Pool)
	releaseHandler := handlers.NewAppReleaseHandler(releaseService)
	firebaseConfigHandler := handlers.NewFirebaseConfigHandler(firebaseConfigService)

	sessionHandler := handlers.NewSessionHandler(sessionService)
	kycAdminHandler := handlers.NewKycAdminHandler(postgres.Pool)
	paymentConfigHandler := handlers.NewPaymentConfigHandler(svc.PaymentConfigs)
	paymentRequestHandler := handlers.NewPaymentRequestHandler(svc.PaymentRequests, svc.PaymentConfigs)
	subscriptionRequestHandler := handlers.NewSubscriptionRequestHandler(svc.SubscriptionRequests, svc.Subscriptions, svc.Billing)
	planChangeRequestService := services.NewPlanChangeRequestService(postgres.Pool)
	planChangeRequestHandler := handlers.NewPlanChangeRequestHandler(planChangeRequestService, svc.Billing)

	aiConfigService := services.NewAIConfigService(postgres.Pool)
	aiHandler := handlers.NewAIHandler(aiConfigService)

	router := api.NewRouter(authHandler, messageHandler, deviceHandler, accountHandler,
		adminHandler, userHandler, templateHandler, webhookHandler, otpHandler, billingHandler,
		fraudHandler, memberHandler, twoFAHandler, paymentConfigHandler, paymentRequestHandler,
		subscriptionRequestHandler, planChangeRequestHandler, sessionHandler,
		aiHandler,
		kycAdminHandler, qrPairingHandler, releaseHandler, firebaseConfigHandler, svc.Billing, svc.PaymentConfigs, authMiddleware, planMiddleware, metrics, postgres, redisDB, mqttClient, cfg, sseHandler)

	promMux := http.NewServeMux()
	promMux.Handle("/metrics", promhttp.Handler())
	promServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Telemetry.PrometheusPort),
		Handler: promMux,
	}

	apiServer := &http.Server{
		Addr:           fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:        securityPipeline(cfg, metrics, router),
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB max headers
	}

	go func() {
		logger.Info("prometheus metrics", "port", cfg.Telemetry.PrometheusPort)
		if err := promServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("prometheus server error", "error", err)
		}
	}()

	go func() {
		printBanner(apiServer.Addr, cfg)
		if err := apiServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api server error", "error", err)
		}
	}()

	fcmHandler := handlers.NewFCMTokenHandler(postgres.Pool, metrics)

	// Initialize FCM sender if configured (requires Firebase service account)
	var fcmSender *fcm.Sender
	if cfg.FCM.Enabled && cfg.FCM.ProjectID != "" {
		var err error
		fcmSender, err = fcm.NewSender(cfg.FCM.ProjectID, cfg.FCM.ServiceAccountPath)
		if err != nil {
			logger.Warn("FCM sender not available", "error", err)
		} else {
			logger.Info("FCM sender ready", "project_id", cfg.FCM.ProjectID)
		}
	}

	// Start the message scheduler for future-dated messages
	sched := scheduler.New(svc.Messages, queue, encMgr, logger.Logger,
		scheduler.WithReleaseCallback(func(msgID, recipient, scheduledFor string) {
			if sseHandler != nil {
				sseHandler.BroadcastScheduledReleased(msgID, recipient, scheduledFor)
			}
		}),
	)
	go sched.Start(context.Background())

	go startBackgroundJobs(context.Background(), svc, simHealthEngine, cbManager, queue, fcmHandler, fcmSender, sseHandler, webhookDispatcher, metrics, logger)

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

	logger.Debug("processing message",
		"msg_id", msg.ID, "lane", string(lane),
		"recipient", maskPhone(msg.Recipient),
		"account_id", msg.AccountID,
	)

	if cbManager.IsOpen(ctx, models.CBScopeAccount, msg.AccountID) {
		logger.Warn("process message blocked by account circuit breaker",
			"msg_id", msg.ID, "account_id", msg.AccountID)
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("account circuit breaker open: %s", msg.AccountID)
	}

	fraudInput := fraud.DetectionInput{
		AccountID:   msg.AccountID,
		DeviceID:    "",
		Recipient:   msg.Recipient,
		Sender:      msg.Sender,
		Message:     msg.Message,
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
		logger.Warn("no eligible devices for account",
			"msg_id", msg.ID, "account_id", msg.AccountID)
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("no eligible devices for account %s", msg.AccountID)
	}

	logger.Debug("eligible devices found",
		"msg_id", msg.ID, "count", len(devices),
		"device_ids", deviceIDs(devices))

	costMap, err := svc.CostTracking.GetCostMap(ctx, deviceIDs(devices))
	if err != nil {
		return fmt.Errorf("get cost map: %w", err)
	}

	recipientCountry := detectCountryFromPhone(msg.Recipient)
	opts := routing.DeviceOptions{
		RecipientCountry: recipientCountry,
		MaxResults:       3,
		ExcludeBlocked:   true,
		RequireOnline:    true,
	}
	scored := selector.FilterAndScore(devices, opts, costMap)
	if len(scored) == 0 {
		logger.Warn("no device passed routing gates",
			"msg_id", msg.ID, "devices_count", len(devices))
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)
		return fmt.Errorf("no device passed routing gates")
	}

	var lastErr error
	for _, scoredDevice := range scored {
		device := scoredDevice.Device

		logger.Debug("attempting device",
			"msg_id", msg.ID, "device_id", device.ID,
			"score", scoredDevice.TotalScore, "carrier", device.Carrier)

		if cbManager.IsOpen(ctx, models.CBScopeDevice, device.ID) {
			logger.Debug("device circuit breaker open, skipping",
				"msg_id", msg.ID, "device_id", device.ID)
			continue
		}

		carrierOK, err := rateMgr.CheckGlobalThrottle(ctx, "carrier", device.Carrier)
		if err != nil {
			lastErr = fmt.Errorf("throttle check failed: %w", err)
			logger.Debug("carrier throttle check error",
				"msg_id", msg.ID, "device_id", device.ID, "error", err)
			continue
		}
		if !carrierOK {
			lastErr = fmt.Errorf("carrier throttled: %s", device.Carrier)
			logger.Debug("carrier throttled",
				"msg_id", msg.ID, "device_id", device.ID, "carrier", device.Carrier)
			continue
		}

		deviceOK, err := rateMgr.CheckDeviceRate(ctx, device.ID)
		if err != nil {
			lastErr = fmt.Errorf("rate check failed: %w", err)
			logger.Debug("device rate check error",
				"msg_id", msg.ID, "device_id", device.ID, "error", err)
			continue
		}
		if !deviceOK {
			lastErr = fmt.Errorf("device rate exceeded: %s", device.ID)
			logger.Debug("device rate exceeded",
				"msg_id", msg.ID, "device_id", device.ID)
			continue
		}

		simStatus, slope := simHealth.EvaluateDevice(device.ID, device.SIMHealthStatus, device.SuccessRate24h)
		if simStatus == models.SIMHealthBlocked {
			lastErr = fmt.Errorf("sim blocked: %s", device.ID)
			logger.Debug("SIM blocked",
				"msg_id", msg.ID, "device_id", device.ID)
			continue
		}
		if simStatus != device.SIMHealthStatus || slope != device.HealthTrendSlope {
			if err := svc.Devices.UpdateHealthStatus(ctx, device.ID, simStatus, slope); err != nil {
				logger.Error("failed to update health status", "device_id", device.ID, "error", err)
			}
		}

		if mqttClient == nil || !mqttClient.IsConnected() {
			lastErr = fmt.Errorf("mqtt broker not connected, cannot send SMS")
			logger.Warn("MQTT broker not connected, cannot send",
				"msg_id", msg.ID, "device_id", device.ID)
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
		logger.Debug("publishing MQTT SMS command",
			"msg_id", msg.ID, "device_id", device.ID,
			"topic", fmt.Sprintf("devices/%s/commands", device.ID),
			"priority", priority)

		if err := mqttClient.SendSMSCommand(ctx, device.ID, msg.ID, msg.AccountID, msg.Recipient, msg.Message, priority); err != nil {
			logger.Warn("MQTT send failed",
				"msg_id", msg.ID, "device_id", device.ID, "error", err)
			cbManager.RecordFailure(ctx, models.CBScopeDevice, device.ID)
			simHealth.RecordDelivery(device.ID, false)
			lastErr = fmt.Errorf("mqtt send failed: %w", err)
			metrics.ObserveMessageFailed()
			continue
		}

		logger.Debug("MQTT publish succeeded",
			"msg_id", msg.ID, "device_id", device.ID)
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
			"latency", telemetry.FormatDuration(latency), "lane", string(lane),
		)

		go dispatchWebhooks(ctx, svc, webhookDispatcher, msg, device, confidenceResult, logger)

		return nil
	}

	if lastErr != nil {
		metrics.ObserveMessageFailed()
		metrics.ObserveQueueProcessed(string(lane), false)

		// Fire the "message.failed" webhook only on the terminal attempt (the
		// consumer increments Attempts after we return and dead-letters at
		// MaxDeliveryAttempts), so transient retries don't spam subscribers.
		maxAttempts := cfg.Queue.MaxDeliveryAttempts
		if maxAttempts < 1 {
			maxAttempts = 1
		}
		if msg.Attempts+1 >= maxAttempts {
			go dispatchMessageFailedWebhooks(context.Background(), svc, webhookDispatcher, msg, lastErr.Error(), logger)
		}
	}
	return lastErr
}

// dispatchWebhooks fires the "message.delivered" event for a successfully sent message.
func dispatchWebhooks(
	ctx context.Context,
	svc *services.ServiceRegistry,
	dispatcher *webhook.Dispatcher,
	msg *worker.QueueMessage,
	device models.Device,
	result deliveryconf.ConfidenceResult,
	logger *telemetry.Logger,
) {
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
	dispatchWebhookEvent(ctx, svc, dispatcher, msg.AccountID, "message.delivered", payload, logger)
}

// dispatchMessageFailedWebhooks fires the "message.failed" event when a message
// could not be delivered after exhausting all eligible devices.
func dispatchMessageFailedWebhooks(
	ctx context.Context,
	svc *services.ServiceRegistry,
	dispatcher *webhook.Dispatcher,
	msg *worker.QueueMessage,
	reason string,
	logger *telemetry.Logger,
) {
	payload := webhook.Payload{
		Event:          "message.failed",
		MessageID:      msg.ID,
		Recipient:      msg.Recipient,
		Sender:         msg.Sender,
		MessageType:    string(msg.MessageType),
		DeliveryStatus: models.DeliveryStatusFailed,
		FailureReason:  reason,
		Timestamp:      time.Now(),
	}
	dispatchWebhookEvent(ctx, svc, dispatcher, msg.AccountID, "message.failed", payload, logger)
}

// dispatchWebhookEvent delivers a payload to every active webhook subscribed to
// the given event for an account, persisting the full payload for retry replay.
func dispatchWebhookEvent(
	ctx context.Context,
	svc *services.ServiceRegistry,
	dispatcher *webhook.Dispatcher,
	accountID string,
	event string,
	payload webhook.Payload,
	logger *telemetry.Logger,
) {
	webhooks, err := svc.Webhooks.GetActiveByAccountAndEvent(ctx, accountID, event)
	if err != nil {
		logger.Error("failed to fetch webhooks", "error", err, "event", event)
		return
	}
	if len(webhooks) == 0 {
		return
	}

	// Serialize once so the retry job can re-send the identical body.
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		logger.Error("failed to marshal webhook payload", "error", err, "event", event)
		return
	}

	for _, wh := range webhooks {
		deliveryResult := dispatcher.DispatchWithRetry(ctx, wh, payload, 0)
		logger.Info("webhook dispatched",
			"webhook_id", wh.ID,
			"message_id", payload.MessageID,
			"event", event,
			"status", deliveryResult.Err,
			"attempts", deliveryResult.Attempts,
		)

		// Determine status and whether retries remain
		now := time.Now()
		lastStatus := "delivered"
		completed := true
		if deliveryResult.Err != nil {
			lastStatus = fmt.Sprintf("failed: %v", deliveryResult.Err)
			if deliveryResult.Attempts < dispatcher.Cfg().MaxAttempts {
				completed = false // pending retry
			} else {
				lastStatus = "dead_letter"
			}
		}

		delivery := &models.WebhookDelivery{
			WebhookID:     wh.ID,
			MessageID:     payload.MessageID,
			Event:         event,
			AttemptCount:  deliveryResult.Attempts,
			StatusCode:    deliveryResult.StatusCode,
			ResponseBody:  truncateString(deliveryResult.ResponseBody, 500),
			LastStatus:    truncateString(lastStatus, 200),
			LastAttemptAt: &now,
			Completed:     completed,
			CreatedAt:     now,
			Payload:       string(payloadJSON),
		}
		if err := svc.WebhookDeliveries.Create(ctx, delivery); err != nil {
			logger.Error("failed to persist webhook delivery", "error", err, "webhook_id", wh.ID, "message_id", payload.MessageID)
		}
	}
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

func startBackgroundJobs(
	ctx context.Context,
	svc *services.ServiceRegistry,
	simHealth *simhealth.Engine,
	cbManager *circuitbreaker.StateManager,
	queue *worker.Queue,
	fcmHandler *handlers.FCMTokenHandler,
	fcmSender *fcm.Sender,
	sseHandler *handlers.SSEHandler,
	webhookDispatcher *webhook.Dispatcher,
	metrics *telemetry.Metrics,
	logger *telemetry.Logger,
) {
	// Build the token invalidator closure for automatic invalidation
	// when FCM returns UNREGISTERED or INVALID_ARGUMENT errors.
	invalidator := fcmHandler.InvalidateToken

	// Track last revival attempt per device to avoid spamming.
	// Cooldown: only send one revival per device per 15 minutes.
	revivalCooldown := 15 * time.Minute
	lastRevivalAttempt := make(map[string]time.Time)

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

			// Mark devices OFFLINE if no heartbeat (last_seen) within 90s.
			// This handles the case where a device disconnects without cleanly
			// deregistering (e.g., network loss, crash, battery drain).
			if staleIDs, err := svc.Devices.MarkStaleDevicesOffline(ctx, 90*time.Second); err != nil {
				logger.Error("failed to mark stale devices offline", "error", err)
			} else if len(staleIDs) > 0 {
				logger.Info("marked stale devices offline", "count", len(staleIDs), "ids", staleIDs)
				for _, id := range staleIDs {
					sseHandler.BroadcastDeviceStatus(id, "OFFLINE")
				}
			}

			if err := svc.Admin.RecordAnalyticsDaily(ctx); err != nil {
				logger.Error("failed to record daily analytics", "error", err)
			}

			if err := svc.Messages.DeleteOld(ctx); err != nil {
				logger.Error("failed to cleanup old messages", "error", err)
			}

			// Prune stale FCM tokens (inactive >30 days or marked invalid).
			// Per Firebase docs: stale registrations are associated with inactive
			// devices that have not connected to FCM for over a month.
			if pruned, err := fcmHandler.PruneStaleTokens(ctx); err != nil {
				logger.Error("failed to prune stale FCM tokens", "error", err)
			} else if pruned > 0 {
				logger.Info("pruned stale FCM tokens", "count", pruned)
			}

			// Cleanup stale entries from revival cooldown map (older than 1 hour)
			if len(lastRevivalAttempt) > 0 {
				now := time.Now()
				for id, t := range lastRevivalAttempt {
					if now.Sub(t) > 1*time.Hour {
						delete(lastRevivalAttempt, id)
					}
				}
			}

			// Cleanup old APK files (older than 7 days) from uploads/apks/
			if cleaned, err := services.CleanupOldAPKs("uploads/apks", 7*24*time.Hour); err != nil {
				logger.Error("failed to cleanup old APK files", "error", err)
			} else if cleaned > 0 {
				logger.Info("cleaned up old APK files", "count", cleaned)
			}

			// Retry pending webhook deliveries. Query non-completed deliveries that are
			// still within max attempts and re-dispatch those whose backoff has elapsed.
			pendingRetries, err := svc.WebhookDeliveries.ListPendingRetries(ctx, webhookDispatcher.Cfg().MaxAttempts)
			if err != nil {
				logger.Error("failed to list pending webhook retries", "error", err)
			} else {
				for _, delivery := range pendingRetries {
					// Compute expected backoff for the NEXT attempt (delivery.AttemptCount is
					// the number already attempted; the next attempt would be attempt+1,
					// so the wait before THIS retry is backoff for attempt = delivery.AttemptCount).
					if delivery.LastAttemptAt == nil {
						continue
					}
					backoff := webhookDispatcher.ComputeBackoff(delivery.AttemptCount)
					if time.Since(*delivery.LastAttemptAt) < backoff {
						continue // not yet due
					}

					wh, err := svc.Webhooks.GetByID(ctx, delivery.WebhookID)
					if err != nil || wh == nil || !wh.Active {
						// Webhook deleted or deactivated — mark completed
						_ = svc.WebhookDeliveries.UpdateRetry(ctx, delivery.ID, 0, "", "webhook_unavailable", delivery.AttemptCount, true)
						continue
					}

					// Re-dispatch. Prefer replaying the full payload captured on the
					// first attempt; fall back to a minimal payload for rows created
					// before the payload column existed.
					var retryResult webhook.DeliveryResult
					if delivery.Payload != "" {
						retryResult = webhookDispatcher.DispatchRaw(ctx, *wh, []byte(delivery.Payload))
						retryResult.Attempts = delivery.AttemptCount + 1
					} else {
						retryPayload := webhook.Payload{
							Event:     delivery.Event,
							MessageID: delivery.MessageID,
						}
						retryResult = webhookDispatcher.DispatchWithRetry(ctx, *wh, retryPayload, delivery.AttemptCount)
					}

					completed := false
					lastStatus := "delivered"
					if retryResult.Err != nil {
						lastStatus = fmt.Sprintf("failed: %v", retryResult.Err)
						if retryResult.Attempts >= webhookDispatcher.Cfg().MaxAttempts {
							completed = true
							lastStatus = "dead_letter"
						}
					} else {
						completed = true
					}

					if err := svc.WebhookDeliveries.UpdateRetry(ctx, delivery.ID, retryResult.StatusCode,
						truncateString(retryResult.ResponseBody, 500), truncateString(lastStatus, 200),
						retryResult.Attempts, completed); err != nil {
						logger.Error("failed to update webhook delivery retry", "error", err, "delivery_id", delivery.ID)
					} else {
						logger.Info("webhook delivery retried",
							"delivery_id", delivery.ID,
							"webhook_id", delivery.WebhookID,
							"attempts", retryResult.Attempts,
							"status", lastStatus,
						)
					}
				}
			}

			// Send FCM revival notifications to offline devices (with cooldown).
			// When a device disconnects from MQTT, send a push notification
			// to wake it up. If FCM returns UNREGISTERED/INVALID_ARGUMENT,
			// the token is automatically marked invalid.
			if fcmSender != nil {
				devices, err := svc.Devices.ListAll(ctx)
				if err == nil {
					now := time.Now()
					for _, d := range devices {
						if d.Status != models.DeviceStatusOffline {
							continue
						}
						// Respect cooldown per device
						if last, ok := lastRevivalAttempt[d.PhysicalDeviceID]; ok && now.Sub(last) < revivalCooldown {
							continue
						}
						lastRevivalAttempt[d.PhysicalDeviceID] = now

						// Look up valid FCM token for this device
						var fcmToken string
						err := fcmHandler.DB().QueryRow(ctx,
							`SELECT fcm_token FROM device_fcm_tokens WHERE device_id = $1 AND is_valid = TRUE`,
							d.PhysicalDeviceID,
						).Scan(&fcmToken)
						if err != nil || fcmToken == "" {
							continue
						}

						dt := fcm.DeviceToken{DeviceID: d.PhysicalDeviceID, FCMToken: fcmToken}
						data := map[string]string{"action": "revive"}
						if err := fcmSender.SendToDevice(ctx, dt, data, invalidator); err != nil {
							// Determine metric status: invalid_token if FCM marked it invalid, else error
							var fcmErr *fcm.FCMError
							status := "error"
							if errors.As(err, &fcmErr) && fcmErr.Invalid {
								status = "invalid_token"
							}
							metrics.ObserveFCMSend(status)
							logger.Error("FCM revival send failed",
								"device_id", d.PhysicalDeviceID,
								"status", status,
								"error", err,
							)
						} else {
							metrics.ObserveFCMSend("success")
							logger.Info("FCM revival sent", "device_id", d.PhysicalDeviceID)
						}
					}
				}
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

func maskPhone(phone string) string {
	if len(phone) < 6 {
		return "***"
	}
	return phone[:3] + "****" + phone[len(phone)-3:]
}

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// printBanner prints a styled startup banner with API version, environment, and Swagger URL.
// Uses ASCII-safe box-drawing characters for cross-platform terminal compatibility.
func printBanner(addr string, cfg *config.Config) {
	banner := fmt.Sprintf(`
+--------------------------------------------------------------+
|                  AeroXe Bee - SMS Platform                   |
+--------------------------------------------------------------+
|  Version:  %-49s |
|  Env:      %-49s |
|  API:      %-49s |
|  Swagger:  %-49s |
|  Docs:     %-49s |
+--------------------------------------------------------------+
|  (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, IN |
+--------------------------------------------------------------+
`,
		"1.0.0",
		cfg.App.Environment,
		fmt.Sprintf("http://%s/api/v1", addr),
		fmt.Sprintf("http://%s/api/v1/docs/ui", addr),
		fmt.Sprintf("http://%s/api/v1/docs", addr),
	)
	fmt.Println(banner)
}

// securityPipeline chains all security middleware: panic recovery → security headers
// → request ID → client IP extraction → body size limits → CORS → metrics → router
func securityPipeline(cfg *config.Config, metrics *telemetry.Metrics, router http.Handler) http.Handler {
	handler := router

	// Innermost: CORS + metrics
	handler = corsMiddleware(cfg, metrics, handler)

	// Request body size limit (1 MB)
	handler = middleware.MaxBodySize(1 << 20)(handler)

	// Extract client IP from proxy headers
	handler = middleware.ExtractClientIP(handler)

	// Generate/propagate request ID
	handler = middleware.RequestID(handler)

	// Security headers (OWASP A05)
	handler = middleware.SecurityHeaders(cfg.App.Environment)(handler)

	// Panic recovery (OWASP A05) — outermost so it catches everything
	handler = middleware.RecoverPanic(handler)

	// Response compression (gzip) for compressible content types
	handler = middleware.ResponseCompression(handler)

	return handler
}

func corsMiddleware(cfg *config.Config, metrics *telemetry.Metrics, next http.Handler) http.Handler {
	allowedOrigins := getAllowedOrigins(cfg.AppURL.BaseURL)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Signature, X-Request-ID")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
		metrics.ObserveAPILatency(r.Method, r.URL.Path, 200, time.Since(start))
	})
}

func getAllowedOrigins(defaultOrigins ...string) []string {
	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		result := []string{"http://localhost:5173", "http://localhost:3000", "http://10.10.13.148:5173", "http://10.10.13.148:8080"}
		for _, o := range defaultOrigins {
			if o != "" {
				result = append(result, o)
			}
		}
		return result
	}
	var result []string
	for _, o := range strings.Split(origins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			result = append(result, o)
		}
	}
	return result
}

func isAllowedOrigin(origin string, allowed []string) bool {
	if origin == "" {
		return false
	}
	for _, a := range allowed {
		if a == "*" || a == origin {
			return true
		}
	}
	return false
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
	err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@aeroxe.com' LIMIT 1)`).Scan(&exists)
	if err != nil {
		logger.Warn("seed: failed to check admin user", "error", err)
		return
	}
	if exists {
		logger.Info("seed: admin user already exists, skipping creation", "email", "admin@aeroxe.com")
		return
	}

	// Create admin user
	adminEmail := getEnvOrDefault("ADMIN_EMAIL", "admin@aeroxe.com")
	adminPassword := getEnvOrDefault("ADMIN_PASSWORD", "")
	if adminPassword == "" {
		logger.Warn("seed: ADMIN_PASSWORD env not set, generating random password")
		randBytes := make([]byte, 16)
		if _, err := rand.Read(randBytes); err != nil {
			logger.Warn("seed: failed to generate random password", "error", err)
			return
		}
		adminPassword = hex.EncodeToString(randBytes)
		logger.Info("seed: generated random admin password — set ADMIN_PASSWORD env for stable credentials")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), 12)
	if err != nil {
		logger.Warn("seed: failed to hash password", "error", err)
		return
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (email) DO NOTHING`,
		"Admin", adminEmail, string(hash), "admin", "active",
	); err != nil {
		logger.Warn("seed: failed to create admin user", "error", err)
		return
	}
	logger.Info("seed: admin user ready", "email", adminEmail)
}

// ensureMQTTCredentialsMigration applies critical schema changes to mqtt_credentials
// at startup. This is a safety net for environments where Docker-based migrations
// (mounted into /docker-entrypoint-initdb.d/) may not have been applied.
func ensureMQTTCredentialsMigration(ctx context.Context, pool *pgxpool.Pool, logger *telemetry.Logger) {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "add encrypted_password column",
			sql:  `ALTER TABLE mqtt_credentials ADD COLUMN IF NOT EXISTS encrypted_password TEXT NOT NULL DEFAULT ''`,
		},
		{
			name: "drop username UNIQUE constraint",
			sql:  `ALTER TABLE mqtt_credentials DROP CONSTRAINT IF EXISTS mqtt_credentials_username_key`,
		},
		{
			name: "recreate partial unique index on active credentials",
			sql:  `DROP INDEX IF EXISTS idx_mqtt_credentials_username_active; CREATE UNIQUE INDEX idx_mqtt_credentials_username_active ON mqtt_credentials (username) WHERE revoked_at IS NULL`,
		},
	}

	for _, m := range migrations {
		if _, err := pool.Exec(ctx, m.sql); err != nil {
			logger.Warn("auto-migration failed", "step", m.name, "error", err)
		}
	}
	logger.Debug("mqtt_credentials schema check complete")
}

// ensureWebhookDeliveriesMigration adds the response_body column to
// webhook_deliveries if it was missed by the migration runner.  Migration 001
// created the table without this column; migration 019 intended to add it via
// CREATE TABLE IF NOT EXISTS but that is a no-op when the table already exists.
func ensureWebhookDeliveriesMigration(ctx context.Context, pool *pgxpool.Pool, logger *telemetry.Logger) {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "add response_body to webhook_deliveries",
			sql:  `ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_body TEXT NOT NULL DEFAULT ''`,
		},
	}

	for _, m := range migrations {
		if _, err := pool.Exec(ctx, m.sql); err != nil {
			logger.Warn("webhook deliveries auto-migration failed", "step", m.name, "error", err)
		}
	}
	logger.Debug("webhook_deliveries schema check complete")
}
