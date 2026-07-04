package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	MQTT     MQTTConfig
	JWT      JWTConfig
	Encryption EncryptionConfig
	Queue    QueueConfig
	RateLimit RateLimitConfig
	SIMHealth SIMHealthConfig
	Delivery  DeliveryConfig
	CircuitBreaker CircuitBreakerConfig
	Webhook  WebhookConfig
	OTP      OTPConfig
	Telemetry TelemetryConfig
	App      AppConfig
}

type ServerConfig struct {
	Host            string
	Port            int
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type MQTTConfig struct {
	Broker      string
	Port        int
	Username    string
	Password    string
	CACert      string
	ClientID    string
	QoS         byte
	UseTLS      bool
	TLSInsecure bool
	KeepAlive   time.Duration
	PingTimeout time.Duration
}

type JWTConfig struct {
	Secret           string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	Issuer           string
}

type EncryptionConfig struct {
	MasterKey string
}

type QueueConfig struct {
	OTPStream           string
	TransactionalStream string
	MarketingStream     string
	DeadLetterStream    string
	OTPMaxAge           time.Duration
	TransactionalMaxAge time.Duration
	MarketingMaxAge     time.Duration
	AntiStarvationRatio int
	MaxQueueDepth       int
	ConsumerGroupName   string
	ConsumerName        string
	BlockTime           time.Duration
	ClaimInterval       time.Duration
	IdleRetryThreshold  time.Duration
	MaxDeliveryAttempts int
	WorkerCount         int
}

type RateLimitConfig struct {
	DeviceMaxPerMinute  int
	DeviceMaxPerHour    int
	SendPacingMin       time.Duration
	SendPacingMax       time.Duration
	APIKeyMaxPerMinute  int
}

type SIMHealthConfig struct {
	DegradedThreshold    float64
	BlockedThreshold     float64
	WindowDuration       time.Duration
	TrendWindowDuration  time.Duration
	TrendSlopeThreshold  float64
	HealthCheckInterval  time.Duration
}

type DeliveryConfig struct {
	DeliveryReportWeight      float64
	HistoricalPatternWeight   float64
	CarrierReliabilityWeight  float64
}

type CircuitBreakerConfig struct {
	DeviceFailureThreshold    float64
	DeviceWindowDuration      time.Duration
	DeviceCooldownDuration    time.Duration
	DeviceHalfOpenSuccesses   int
	AccountFailureMultiplier  float64
	AccountCooldownDuration   time.Duration
	CarrierFailureThreshold   float64
	CarrierWindowDuration     time.Duration
	CarrierCooldownDuration   time.Duration
	CarrierTrafficReduction   float64
}

type WebhookConfig struct {
	MaxAttempts      int
	RetryWindow      time.Duration
	BaseBackoff      time.Duration
	MaxBackoff       time.Duration
	DeliveryTimeout  time.Duration
}

type OTPConfig struct {
	CodeLength     int
	TTL            time.Duration
	MaxAttempts    int
	LockoutTTL     time.Duration
}

type TelemetryConfig struct {
	ServiceName       string
	PrometheusEnabled bool
	PrometheusPort    int
	TracingEnabled    bool
	TracingEndpoint   string
	TracingRatio      float64
	LogLevel          string
	LogFormat         string
}

type AppConfig struct {
	Environment          string
	IdempotencyTTL       time.Duration
	MessageRetention     time.Duration
	OTPMetadataRetention time.Duration
	PingTimeout          time.Duration
	HeartbeatWindow      time.Duration
	MaxRetryDevices      int
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host:            getEnv("SERVER_HOST", "0.0.0.0"),
			Port:            getEnvInt("SERVER_PORT", 8080),
			ReadTimeout:     getEnvDuration("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout:    getEnvDuration("SERVER_WRITE_TIMEOUT", 30*time.Second),
			ShutdownTimeout: getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnvInt("DB_PORT", 5432),
			User:            getEnv("DB_USER", "textbee"),
			Password:        getEnv("DB_PASSWORD", "textbee"),
			DBName:          getEnv("DB_NAME", "textbee"),
			SSLMode:         getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		MQTT: MQTTConfig{
			Broker:      getEnv("MQTT_BROKER", "localhost"),
			Port:        getEnvInt("MQTT_PORT", 1883),
			Username:    getEnv("MQTT_USERNAME", ""),
			Password:    getEnv("MQTT_PASSWORD", ""),
			CACert:      getEnv("MQTT_CA_CERT", ""),
			ClientID:    getEnv("MQTT_CLIENT_ID", "textbee-backend"),
			QoS:         byte(getEnvInt("MQTT_QOS", 1)),
			UseTLS:      getEnvBool("MQTT_USE_TLS", false),
			TLSInsecure: getEnvBool("MQTT_TLS_INSECURE", false),
			KeepAlive:   getEnvDuration("MQTT_KEEP_ALIVE", 30*time.Second),
			PingTimeout: getEnvDuration("MQTT_PING_TIMEOUT", 10*time.Second),
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", "change-me-in-production"),
			AccessTokenTTL:  getEnvDuration("JWT_ACCESS_TTL", 15*time.Minute),
			RefreshTokenTTL: getEnvDuration("JWT_REFRESH_TTL", 7*24*time.Hour),
			Issuer:          getEnv("JWT_ISSUER", "textbee"),
		},
		Encryption: EncryptionConfig{
			MasterKey: getEnv("ENCRYPTION_MASTER_KEY", ""),
		},
		Queue: QueueConfig{
			OTPStream:            getEnv("QUEUE_OTP_STREAM", "otp_queue"),
			TransactionalStream:  getEnv("QUEUE_TRANSACTIONAL_STREAM", "transactional_queue"),
			MarketingStream:      getEnv("QUEUE_MARKETING_STREAM", "marketing_queue"),
			DeadLetterStream:     getEnv("QUEUE_DEAD_LETTER_STREAM", "dead_letter_queue"),
			OTPMaxAge:            getEnvDuration("QUEUE_OTP_MAX_AGE", 90*time.Second),
			TransactionalMaxAge:  getEnvDuration("QUEUE_TRANSACTIONAL_MAX_AGE", 15*time.Minute),
			MarketingMaxAge:      getEnvDuration("QUEUE_MARKETING_MAX_AGE", 15*time.Minute),
			AntiStarvationRatio:  getEnvInt("QUEUE_ANTI_STARVATION_RATIO", 10),
			MaxQueueDepth:        getEnvInt("QUEUE_MAX_DEPTH", 10000),
			ConsumerGroupName:    getEnv("QUEUE_CONSUMER_GROUP", "textbee-workers"),
			ConsumerName:         getEnv("QUEUE_CONSUMER_NAME", "worker-1"),
			BlockTime:            getEnvDuration("QUEUE_BLOCK_TIME", 2*time.Second),
			ClaimInterval:        getEnvDuration("QUEUE_CLAIM_INTERVAL", 30*time.Second),
			IdleRetryThreshold:   getEnvDuration("QUEUE_IDLE_RETRY_THRESHOLD", 60*time.Second),
			MaxDeliveryAttempts:  getEnvInt("QUEUE_MAX_DELIVERY_ATTEMPTS", 3),
			WorkerCount:          getEnvInt("QUEUE_WORKER_COUNT", 3),
		},
		RateLimit: RateLimitConfig{
			DeviceMaxPerMinute: getEnvInt("RATE_LIMIT_DEVICE_PER_MIN", 10),
			DeviceMaxPerHour:   getEnvInt("RATE_LIMIT_DEVICE_PER_HOUR", 100),
			SendPacingMin:      getEnvDuration("RATE_LIMIT_SEND_PACING_MIN", 2*time.Second),
			SendPacingMax:      getEnvDuration("RATE_LIMIT_SEND_PACING_MAX", 5*time.Second),
			APIKeyMaxPerMinute:  getEnvInt("RATE_LIMIT_API_KEY_PER_MIN", 60),
		},
		SIMHealth: SIMHealthConfig{
			DegradedThreshold:   getEnvFloat("SIM_HEALTH_DEGRADED_THRESHOLD", 0.6),
			BlockedThreshold:    getEnvFloat("SIM_HEALTH_BLOCKED_THRESHOLD", 0.3),
			WindowDuration:      getEnvDuration("SIM_HEALTH_WINDOW", 5*time.Minute),
			TrendWindowDuration: getEnvDuration("SIM_HEALTH_TREND_WINDOW", 3*time.Hour),
			TrendSlopeThreshold: getEnvFloat("SIM_HEALTH_TREND_SLOPE", -0.05),
			HealthCheckInterval: getEnvDuration("SIM_HEALTH_CHECK_INTERVAL", 1*time.Minute),
		},
		Delivery: DeliveryConfig{
			DeliveryReportWeight:     getEnvFloat("DELIVERY_REPORT_WEIGHT", 0.5),
			HistoricalPatternWeight:  getEnvFloat("DELIVERY_HISTORICAL_WEIGHT", 0.3),
			CarrierReliabilityWeight: getEnvFloat("DELIVERY_CARRIER_WEIGHT", 0.2),
		},
		CircuitBreaker: CircuitBreakerConfig{
			DeviceFailureThreshold:   getEnvFloat("CB_DEVICE_FAILURE_THRESHOLD", 0.5),
			DeviceWindowDuration:     getEnvDuration("CB_DEVICE_WINDOW", 5*time.Minute),
			DeviceCooldownDuration:   getEnvDuration("CB_DEVICE_COOLDOWN", 2*time.Minute),
			DeviceHalfOpenSuccesses:  getEnvInt("CB_DEVICE_HALF_OPEN_SUCCESSES", 3),
			AccountFailureMultiplier: getEnvFloat("CB_ACCOUNT_FAILURE_MULTIPLIER", 2.0),
			AccountCooldownDuration:  getEnvDuration("CB_ACCOUNT_COOLDOWN", 5*time.Minute),
			CarrierFailureThreshold:  getEnvFloat("CB_CARRIER_FAILURE_THRESHOLD", 0.3),
			CarrierWindowDuration:    getEnvDuration("CB_CARRIER_WINDOW", 5*time.Minute),
			CarrierCooldownDuration:  getEnvDuration("CB_CARRIER_COOLDOWN", 10*time.Minute),
			CarrierTrafficReduction:  getEnvFloat("CB_CARRIER_TRAFFIC_REDUCTION", 0.5),
		},
		Webhook: WebhookConfig{
			MaxAttempts:     getEnvInt("WEBHOOK_MAX_ATTEMPTS", 5),
			RetryWindow:     getEnvDuration("WEBHOOK_RETRY_WINDOW", 24*time.Hour),
			BaseBackoff:     getEnvDuration("WEBHOOK_BASE_BACKOFF", 1*time.Minute),
			MaxBackoff:      getEnvDuration("WEBHOOK_MAX_BACKOFF", 30*time.Minute),
			DeliveryTimeout: getEnvDuration("WEBHOOK_DELIVERY_TIMEOUT", 10*time.Second),
		},
		OTP: OTPConfig{
			CodeLength:  getEnvInt("OTP_CODE_LENGTH", 6),
			TTL:         getEnvDuration("OTP_TTL", 5*time.Minute),
			MaxAttempts: getEnvInt("OTP_MAX_ATTEMPTS", 5),
			LockoutTTL:  getEnvDuration("OTP_LOCKOUT_TTL", 15*time.Minute),
		},
		Telemetry: TelemetryConfig{
			ServiceName:       getEnv("TELEMETRY_SERVICE_NAME", "textbee-backend"),
			PrometheusEnabled: getEnvBool("TELEMETRY_PROMETHEUS_ENABLED", true),
			PrometheusPort:    getEnvInt("TELEMETRY_PROMETHEUS_PORT", 9090),
			TracingEnabled:    getEnvBool("TELEMETRY_TRACING_ENABLED", false),
			TracingEndpoint:   getEnv("TELEMETRY_TRACING_ENDPOINT", ""),
			TracingRatio:      getEnvFloat("TELEMETRY_TRACING_RATIO", 0.1),
			LogLevel:          getEnv("LOG_LEVEL", "info"),
			LogFormat:         getEnv("LOG_FORMAT", "json"),
		},
		App: AppConfig{
			Environment:          getEnv("APP_ENV", "development"),
			IdempotencyTTL:       getEnvDuration("IDEMPOTENCY_TTL", 5*time.Minute),
			MessageRetention:     getEnvDuration("MESSAGE_RETENTION", 90*24*time.Hour),
			OTPMetadataRetention: getEnvDuration("OTP_METADATA_RETENTION", 365*24*time.Hour),
			PingTimeout:          getEnvDuration("PING_TIMEOUT", 3*time.Second),
			HeartbeatWindow:      getEnvDuration("HEARTBEAT_WINDOW", 45*time.Second),
			MaxRetryDevices:      getEnvInt("MAX_RETRY_DEVICES", 3),
		},
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host, c.Database.Port, c.Database.User, c.Database.Password, c.Database.DBName, c.Database.SSLMode)
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Redis.Host, c.Redis.Port)
}

func (c MQTTConfig) BrokerURL() string {
	proto := "tcp"
	if c.UseTLS {
		proto = "ssl"
	}
	return fmt.Sprintf("%s://%s:%d", proto, c.Broker, c.Port)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return fallback
}
