package models

import (
	"encoding/json"
	"time"
)

// User represents a staff/admin panel user
type User struct {
	ID           string    `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Role         string    `db:"role" json:"role"`
	Status       string    `db:"status" json:"status"`
	Avatar       string    `db:"avatar" json:"avatar"`
	LastLogin    *time.Time `db:"last_login" json:"last_login,omitempty"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

// ActivityLog represents an admin panel audit trail entry
type ActivityLog struct {
	ID         string    `db:"id" json:"id"`
	UserID     *string   `db:"user_id" json:"user_id,omitempty"`
	UserName   string    `db:"user_name" json:"user_name"`
	Action     string    `db:"action" json:"action"`
	Resource   string    `db:"resource" json:"resource"`
	ResourceID string    `db:"resource_id" json:"resource_id"`
	Details    string    `db:"details" json:"details"`
	IPAddress  string    `db:"ip_address" json:"ip_address"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

// PaginatedResponse is the standard paginated API response
type PaginatedResponse[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalPages int   `json:"total_pages"`
}

type AccountStatus string

const (
	AccountStatusActive    AccountStatus = "active"
	AccountStatusSuspended AccountStatus = "suspended"
	AccountStatusDisabled  AccountStatus = "disabled"
)

// User roles
const (
	UserRoleAdmin  = "admin"
	UserRoleStaff  = "staff"
	UserRoleViewer = "viewer"
)

type PlanType string

const (
	PlanTypeFree      PlanType = "free"
	PlanTypePro       PlanType = "pro"
	PlanTypeScale     PlanType = "scale"
	PlanTypeEnterprise PlanType = "enterprise"
)

type PlanVisibility string

const (
	PlanVisibilityPublic  PlanVisibility = "public"
	PlanVisibilityPrivate PlanVisibility = "private"
	PlanVisibilityCustom  PlanVisibility = "custom"
)

type DeviceState string

const (
	DeviceStateActive      DeviceState = "ACTIVE"
	DeviceStateDozeRisk    DeviceState = "DOZE_RISK"
	DeviceStateOEMKillRisk DeviceState = "OEM_KILL_RISK"
)

type DeviceStatus string

const (
	DeviceStatusOnline  DeviceStatus = "ONLINE"
	DeviceStatusOffline DeviceStatus = "OFFLINE"
)

type SIMHealthStatus string

const (
	SIMHealthHealthy  SIMHealthStatus = "HEALTHY"
	SIMHealthDegraded SIMHealthStatus = "DEGRADED"
	SIMHealthBlocked  SIMHealthStatus = "BLOCKED"
)

type DeliveryStatus string

const (
	DeliveryStatusSent             DeliveryStatus = "SENT"
	DeliveryStatusCarrierAccepted  DeliveryStatus = "CARRIER_ACCEPTED"
	DeliveryStatusProbableDelivered DeliveryStatus = "PROBABLE_DELIVERED"
	DeliveryStatusFailed           DeliveryStatus = "FAILED"
)

type MessageType string

const (
	MessageTypeOTP            MessageType = "otp"
	MessageTypeTransactional  MessageType = "transactional"
	MessageTypeMarketing      MessageType = "marketing"
)

type PriorityLane string

const (
	PriorityLaneOTP           PriorityLane = "otp"
	PriorityLaneTransactional PriorityLane = "transactional"
	PriorityLaneMarketing     PriorityLane = "marketing"
)

type RoutingStrategy string

const (
	RoutingStrategyFastest         RoutingStrategy = "fastest_delivery"
	RoutingStrategyLowestCost      RoutingStrategy = "lowest_cost"
	RoutingStrategyHighestReliability RoutingStrategy = "highest_reliability"
	RoutingStrategyGeoAffinity     RoutingStrategy = "geo_affinity"
	RoutingStrategyProfitOptimized RoutingStrategy = "profit_optimized"
)

type CircuitBreakerScope string

const (
	CBScopeDevice  CircuitBreakerScope = "device"
	CBScopeAccount CircuitBreakerScope = "account"
	CBScopeCarrier CircuitBreakerScope = "carrier"
)

type CircuitBreakerState string

const (
	CBStateClosed   CircuitBreakerState = "CLOSED"
	CBStateOpen     CircuitBreakerState = "OPEN"
	CBStateHalfOpen CircuitBreakerState = "HALF_OPEN"
)

type BillingCycle string

const (
	BillingCycleMonthly BillingCycle = "monthly"
	BillingCycleYearly  BillingCycle = "yearly"
)

type SubscriptionStatus string

const (
	SubStatusActive   SubscriptionStatus = "active"
	SubStatusPastDue  SubscriptionStatus = "past_due"
	SubStatusCanceled SubscriptionStatus = "canceled"
	SubStatusTrialing SubscriptionStatus = "trialing"
)

type TemplateApprovalStatus string

const (
	TemplatePending    TemplateApprovalStatus = "pending"
	TemplateApproved   TemplateApprovalStatus = "approved"
	TemplateRejected   TemplateApprovalStatus = "rejected"
)

// Account represents a platform account
type Account struct {
	ID             string        `db:"id" json:"id"`
	Name           string        `db:"name" json:"name"`
	Email          string        `db:"email" json:"email"`
	PasswordHash   string        `db:"password_hash" json:"-"`
	PlanID         PlanType      `db:"plan_id" json:"plan_id"`
	RetentionDays  int           `db:"retention_days" json:"retention_days"`
	CreatedAt      time.Time     `db:"created_at" json:"created_at"`
	Verified       bool          `db:"verified" json:"verified"`
	Status         AccountStatus `db:"status" json:"status"`
	RiskScore      float64       `db:"risk_score" json:"risk_score"`
}

// APIKey represents a scoped API key
type APIKey struct {
	ID           string     `db:"id" json:"id"`
	AccountID    string     `db:"account_id" json:"account_id"`
	KeyHash      string     `db:"key_hash" json:"-"`
	Label        string     `db:"label" json:"label"`
	Scopes       []string   `db:"scopes" json:"scopes"`
	ExpiresAt    *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	RevokedAt    *time.Time `db:"revoked_at" json:"revoked_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	RequestCount int64      `db:"request_count" json:"request_count"`
	LastUsedAt   *time.Time `db:"last_used_at" json:"last_used_at,omitempty"`
}

// PhysicalDevice represents an Android phone
type PhysicalDevice struct {
	ID          string      `db:"id" json:"id"`
	AccountID   string      `db:"account_id" json:"account_id"`
	Model       string      `db:"model" json:"model"`
	OSVersion   string      `db:"os_version" json:"os_version"`
	AppVersion  string      `db:"app_version" json:"app_version"`
	BatteryLevel float64    `db:"battery_level" json:"battery_level"`
	NetworkType  string     `db:"network_type" json:"network_type"`
	DeviceState DeviceState `db:"device_state" json:"device_state"`
	CreatedAt   time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time   `db:"updated_at" json:"updated_at"`
}

// Device represents a per-SIM logical identity
type Device struct {
	ID              string         `db:"id" json:"id"`
	PhysicalDeviceID string        `db:"physical_device_id" json:"physical_device_id"`
	AccountID       string         `db:"account_id" json:"account_id"`
	SIMSlot         int            `db:"sim_slot" json:"sim_slot"`
	Carrier         string         `db:"carrier" json:"carrier"`
	Status          DeviceStatus   `db:"status" json:"status"`
	SIMHealthStatus SIMHealthStatus `db:"sim_health_status" json:"sim_health_status"`
	HealthTrendSlope float64       `db:"health_trend_slope" json:"health_trend_slope"`
	LastSeen        *time.Time     `db:"last_seen" json:"last_seen,omitempty"`
	LastPingAt      *time.Time     `db:"last_ping_at" json:"last_ping_at,omitempty"`
	LastPongAt      *time.Time     `db:"last_pong_at" json:"last_pong_at,omitempty"`
	MessagesSentCount int64        `db:"messages_sent_count" json:"messages_sent_count"`
	LastUsedAt      *time.Time     `db:"last_used_at" json:"last_used_at,omitempty"`
	MQTTCredentialID *string       `db:"mqtt_credential_id" json:"mqtt_credential_id,omitempty"`
	ReliabilityScore float64       `db:"reliability_score" json:"reliability_score"`
	ReputationScore  float64       `db:"reputation_score" json:"reputation_score"`
	ComplaintCount   int64         `db:"complaint_count" json:"complaint_count"`
	BlockEventCount  int64         `db:"block_event_count" json:"block_event_count"`
	FraudFlagWeight  float64       `db:"fraud_flag_weight" json:"fraud_flag_weight"`
	SuccessRate24h   float64       `db:"success_rate_24h" json:"success_rate_24h"`
	UptimeRatio24h   float64       `db:"uptime_ratio_24h" json:"uptime_ratio_24h"`
	AvgLatencyMs     float64       `db:"avg_latency_ms" json:"avg_latency_ms"`
	CountryCode      string        `db:"country_code" json:"country_code"`
	Region           string        `db:"region" json:"region"`
	MaxPerMinute     int           `db:"max_per_minute" json:"max_per_minute"`
	MaxPerHour       int           `db:"max_per_hour" json:"max_per_hour"`
	IsolatedPoolID   *string       `db:"isolated_pool_id" json:"isolated_pool_id,omitempty"`
	Name             string            `db:"name" json:"name"`
	CircuitBreakerState CircuitBreakerState `db:"circuit_breaker_state" json:"circuit_breaker_state"`
	CreatedAt        time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time     `db:"updated_at" json:"updated_at"`
}

// MQTTCredential represents device MQTT credentials
type MQTTCredential struct {
	ID                string    `db:"id" json:"id"`
	DeviceID          string    `db:"device_id" json:"device_id"`
	Username          string    `db:"username" json:"username"`
	CredentialHash    string    `db:"credential_hash_or_cert_ref" json:"-"`
	IssuedAt          time.Time  `db:"issued_at" json:"issued_at"`
	RevokedAt         *time.Time `db:"revoked_at" json:"revoked_at,omitempty"`
	EncryptedPassword string     `db:"encrypted_password" json:"-"`
}

// Message represents an SMS message
type Message struct {
	ID                string        `db:"id" json:"id"`
	DeviceID          *string       `db:"device_id" json:"device_id,omitempty"`
	APIKeyID          string        `db:"api_key_id" json:"api_key_id"`
	Direction         string        `db:"direction" json:"direction"`
	Recipient         string        `db:"recipient" json:"recipient"`
	Sender            string        `db:"sender" json:"sender"`
	EncryptedMessage  []byte        `db:"encrypted_message" json:"-"`
	MessageType       MessageType   `db:"message_type" json:"message_type"`
	PriorityLane      PriorityLane  `db:"priority_lane" json:"priority_lane"`
	TemplateID        *string       `db:"template_id" json:"template_id,omitempty"`
	Status            string        `db:"status" json:"status"`
	DeliveryStatus    DeliveryStatus `db:"delivery_status" json:"delivery_status"`
	ConfidenceScore   float64       `db:"confidence_score" json:"confidence_score"`
	ErrorReason       *string       `db:"error_reason" json:"error_reason,omitempty"`
	CreatedAt         time.Time     `db:"created_at" json:"created_at"`
	DeliveredAt       *time.Time    `db:"delivered_at" json:"delivered_at,omitempty"`
	PurgeAfter        time.Time     `db:"purge_after" json:"purge_after"`
	IdempotencyKey    string        `db:"idempotency_key" json:"idempotency_key"`
	RoutingStrategyUsed RoutingStrategy `db:"routing_strategy_used" json:"routing_strategy_used"`
}

// IdempotencyKey tracks deduplication
type IdempotencyKey struct {
	Key       string    `db:"key" json:"key"`
	AccountID string    `db:"account_id" json:"account_id"`
	MessageID string    `db:"message_id" json:"message_id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
}

// OTPMetadata tracks OTP verification
type OTPMetadata struct {
	MessageID string    `db:"message_id" json:"message_id"`
	Phone     string    `db:"phone" json:"phone"`
	Verified  bool      `db:"verified" json:"verified"`
	Attempts  int       `db:"attempts" json:"attempts"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
}

// Template represents an SMS template
type Template struct {
	ID             string                `db:"id" json:"id"`
	AccountID      string                `db:"account_id" json:"account_id"`
	Name           string                `db:"name" json:"name"`
	Body           string                `db:"body" json:"body"`
	Variables      []string              `db:"variables" json:"variables"`
	ApprovalStatus TemplateApprovalStatus `db:"approval_status" json:"approval_status"`
	ApprovedAt     *time.Time            `db:"approved_at" json:"approved_at,omitempty"`
	CreatedAt      time.Time             `db:"created_at" json:"created_at"`
}

// Webhook represents a webhook endpoint
type Webhook struct {
	ID           string    `db:"id" json:"id"`
	AccountID    string    `db:"account_id" json:"account_id"`
	URL          string    `db:"url" json:"url"`
	Events       []string  `db:"events" json:"events"`
	Secret       string    `db:"secret" json:"-"`
	Active       bool      `db:"active" json:"active"`
	LastRotatedAt *time.Time `db:"last_rotated_at" json:"last_rotated_at,omitempty"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

// WebhookDelivery tracks webhook delivery attempts
type WebhookDelivery struct {
	ID            string    `db:"id" json:"id"`
	WebhookID     string    `db:"webhook_id" json:"webhook_id"`
	MessageID     string    `db:"message_id" json:"message_id"`
	AttemptCount  int       `db:"attempt_count" json:"attempt_count"`
	LastStatus    string    `db:"last_status" json:"last_status"`
	LastAttemptAt *time.Time `db:"last_attempt_at" json:"last_attempt_at,omitempty"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// Plan represents a pricing plan
type Plan struct {
	ID                     PlanType       `db:"id" json:"id"`
	Name                   string         `db:"name" json:"name"`
	Visibility             PlanVisibility `db:"visibility" json:"visibility"`
	DailyQuota             int64          `db:"daily_quota" json:"daily_quota"`
	MonthlyQuota           int64          `db:"monthly_quota" json:"monthly_quota"`
	OverageBufferPct       float64        `db:"overage_buffer_pct" json:"overage_buffer_pct"`
	MaxQueueDepth          int            `db:"max_queue_depth" json:"max_queue_depth"`
	MaxDevices             int            `db:"max_devices" json:"max_devices"`
	DedicatedPool          bool           `db:"dedicated_pool" json:"dedicated_pool"`
	DefaultRoutingStrategy RoutingStrategy `db:"default_routing_strategy" json:"default_routing_strategy"`
	PricePerSMS            float64        `db:"price_per_sms" json:"price_per_sms"`
	MonthlyPrice           float64        `db:"monthly_price" json:"monthly_price"`
	IsPopular              bool           `db:"is_popular" json:"is_popular"`
	CtaText                string         `db:"cta_text" json:"cta_text"`
}

// Subscription ties an account to a plan
type Subscription struct {
	ID             string           `db:"id" json:"id"`
	AccountID      string           `db:"account_id" json:"account_id"`
	PlanType       PlanType         `db:"plan_type" json:"plan_type"`
	BillingCycle   BillingCycle     `db:"billing_cycle" json:"billing_cycle"`
	Status         SubscriptionStatus `db:"status" json:"status"`
	RenewalDate    time.Time        `db:"renewal_date" json:"renewal_date"`
	StripeCustomerID *string        `db:"stripe_customer_id" json:"stripe_customer_id,omitempty"`
	QuotaDaily     int64            `db:"quota_daily" json:"quota_daily"`
	QuotaMonthly   int64            `db:"quota_monthly" json:"quota_monthly"`
	OverageBufferPct float64        `db:"overage_buffer_pct" json:"overage_buffer_pct"`
	MaxQueueDepth  int              `db:"max_queue_depth" json:"max_queue_depth"`
	DedicatedPool  bool             `db:"dedicated_pool" json:"dedicated_pool"`
	DefaultRoutingStrategy RoutingStrategy `db:"default_routing_strategy" json:"default_routing_strategy"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
}

// UsageCounter tracks daily usage
type UsageCounter struct {
	ID        string    `db:"id" json:"id"`
	AccountID string    `db:"account_id" json:"account_id"`
	Date      string    `db:"date" json:"date"`
	Count     int64     `db:"count" json:"count"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// AnalyticsDaily stores daily analytics
type AnalyticsDaily struct {
	ID              string    `db:"id" json:"id"`
	Date            string    `db:"date" json:"date"`
	TotalSent       int64     `db:"total_sent" json:"total_sent"`
	TotalDelivered  int64     `db:"total_delivered" json:"total_delivered"`
	TotalFailed     int64     `db:"total_failed" json:"total_failed"`
	AvgConfidence   float64   `db:"avg_confidence" json:"avg_confidence"`
	OTPSent         int64     `db:"otp_sent" json:"otp_sent"`
	TransactionalSent int64   `db:"transactional_sent" json:"transactional_sent"`
	MarketingSent   int64     `db:"marketing_sent" json:"marketing_sent"`
}

// CostTracking stores per-device cost data
type CostTracking struct {
	ID        string    `db:"id" json:"id"`
	DeviceID  string    `db:"device_id" json:"device_id"`
	AccountID string    `db:"account_id" json:"account_id"`
	CostPerSMS float64  `db:"cost_per_sms" json:"cost_per_sms"`
	Currency  string    `db:"currency" json:"currency"`
	Date      string    `db:"date" json:"date"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// DeviceCostProfile stores per-device cost profile
type DeviceCostProfile struct {
	ID                   string  `db:"id" json:"id"`
	DeviceID             string  `db:"device_id" json:"device_id"`
	SIMCostPerSMS        float64 `db:"sim_cost_per_sms" json:"sim_cost_per_sms"`
	RegionCostMultiplier float64 `db:"region_cost_multiplier" json:"region_cost_multiplier"`
	PlanContext          string  `db:"plan_context" json:"plan_context"`
	CreatedAt            time.Time `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time `db:"updated_at" json:"updated_at"`
}

// AbuseFlag tracks potential abuse
type AbuseFlag struct {
	ID            string    `db:"id" json:"id"`
	AccountID     string    `db:"account_id" json:"account_id"`
	FlagType      string    `db:"flag_type" json:"flag_type"`
	Description   string    `db:"description" json:"description"`
	Severity      string    `db:"severity" json:"severity"`
	Reviewed      bool      `db:"reviewed" json:"reviewed"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	ReviewedAt    *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
}

// FraudFlag tracks potential fraud
type FraudFlag struct {
	ID            string    `db:"id" json:"id"`
	AccountID     string    `db:"account_id" json:"account_id"`
	DeviceID      *string   `db:"device_id" json:"device_id,omitempty"`
	FlagType      string    `db:"flag_type" json:"flag_type"`
	Description   string    `db:"description" json:"description"`
	Severity      string    `db:"severity" json:"severity"`
	Weight        float64   `db:"weight" json:"weight"`
	Reviewed      bool      `db:"reviewed" json:"reviewed"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	ReviewedAt    *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
}

// GlobalThrottleCounter tracks global rate limits
type GlobalThrottleCounter struct {
	ID        string    `db:"id" json:"id"`
	Scope     string    `db:"scope" json:"scope"` // country, carrier, prefix
	ScopeValue string   `db:"scope_value" json:"scope_value"`
	Count     int64     `db:"count" json:"count"`
	WindowStart time.Time `db:"window_start" json:"window_start"`
}

// CircuitBreakerEvent logs circuit breaker state changes
type CircuitBreakerEvent struct {
	ID          string             `db:"id" json:"id"`
	Scope       CircuitBreakerScope `db:"scope" json:"scope"`
	ScopeValue  string             `db:"scope_value" json:"scope_value"`
	State       CircuitBreakerState `db:"state" json:"state"`
	OpenedAt    time.Time          `db:"opened_at" json:"opened_at"`
	ClosedAt    *time.Time         `db:"closed_at" json:"closed_at,omitempty"`
	Reason      string             `db:"reason" json:"reason"`
}// QueueDeadLetter stores failed queue messages

type QueueDeadLetter struct {
	ID          string    `db:"id" json:"id"`
	Stream      string    `db:"stream" json:"stream"`
	MessageID   string    `db:"message_id" json:"message_id"`
	Payload     string    `db:"payload" json:"payload"`
	FailReason  string    `db:"fail_reason" json:"fail_reason"`
	FailedAt    time.Time `db:"failed_at" json:"failed_at"`
	RetryCount  int       `db:"retry_count" json:"retry_count"`
}

// PaymentConfig represents an admin-configurable payment method

type PaymentConfig struct {
	ID        string          `db:"id" json:"id"`
	Method    string          `db:"method" json:"method"`
	Label     string          `db:"label" json:"label"`
	Details   json.RawMessage `db:"details" json:"details"` // JSONB
	Enabled   bool            `db:"enabled" json:"enabled"`
	CreatedBy *string         `db:"created_by" json:"created_by,omitempty"`
	CreatedAt time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt time.Time       `db:"updated_at" json:"updated_at"`
}

// PaymentRequest represents a member's payment/recharge request

type PaymentRequest struct {
	ID             string     `db:"id" json:"id"`
	AccountID      string     `db:"account_id" json:"account_id"`
	AccountName    string     `db:"account_name" json:"account_name"` // joined from accounts
	PlanID         string     `db:"plan_id" json:"plan_id"`
	PlanName       string     `db:"plan_name" json:"plan_name"` // joined from plans
	BillingCycle   string     `db:"billing_cycle" json:"billing_cycle"`
	PaymentMethod  string     `db:"payment_method" json:"payment_method"`
	Amount         float64    `db:"amount" json:"amount"`
	ProofURL       string     `db:"proof_url" json:"proof_url"`
	Status         string     `db:"status" json:"status"`
	ReviewedBy     *string    `db:"reviewed_by" json:"reviewed_by,omitempty"`
	ReviewedByName string     `db:"reviewed_by_name" json:"reviewed_by_name"` // joined from users
	ReviewedAt     *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
	ReviewNotes    string     `db:"review_notes" json:"review_notes"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// SubscriptionRequest represents a member-initiated subscription change

type SubscriptionRequest struct {
	ID                    string     `db:"id" json:"id"`
	AccountID             string     `db:"account_id" json:"account_id"`
	AccountName           string     `db:"account_name" json:"account_name"` // joined
	RequestedPlan         string     `db:"requested_plan" json:"requested_plan"`
	RequestedPlanName     string     `db:"requested_plan_name" json:"requested_plan_name"` // joined
	RequestedBillingCycle string     `db:"requested_billing_cycle" json:"requested_billing_cycle"`
	CurrentPlan           string     `db:"current_plan" json:"current_plan"`
	CurrentPlanName       string     `db:"current_plan_name" json:"current_plan_name"` // joined
	Reason                string     `db:"reason" json:"reason"`
	Status                string     `db:"status" json:"status"`
	ReviewedBy            *string    `db:"reviewed_by" json:"reviewed_by,omitempty"`
	ReviewedByName        string     `db:"reviewed_by_name" json:"reviewed_by_name"` // joined
	ReviewedAt            *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
	ReviewNotes           string     `db:"review_notes" json:"review_notes"`
	CreatedAt             time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time  `db:"updated_at" json:"updated_at"`
}

// KycRecord tracks KYC verification for an account

type KycRecord struct {
	ID             string     `db:"id" json:"id"`
	AccountID      string     `db:"account_id" json:"account_id"`
	FullName       string     `db:"full_name" json:"full_name"`
	DocumentType   string     `db:"document_type" json:"document_type"`
	DocumentNumber string     `db:"document_number" json:"document_number"`
	DocumentURL    string     `db:"document_url" json:"document_url"`
	Status         string     `db:"status" json:"status"`
	ReviewedBy     *string    `db:"reviewed_by" json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
	ReviewNotes    string     `db:"review_notes" json:"review_notes"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// UserPreferences stores per-user notification and security preferences

type UserPreferences struct {
	ID                  string    `db:"id" json:"id"`
	UserID              *string   `db:"user_id" json:"user_id,omitempty"`
	AccountID           *string   `db:"account_id" json:"account_id,omitempty"`
	EmailNotifications  bool      `db:"email_notifications" json:"email_notifications"`
	SmsNotifications    bool      `db:"sms_notifications" json:"sms_notifications"`
	WebhookNotifications bool     `db:"webhook_notifications" json:"webhook_notifications"`
	BillingAlerts       bool      `db:"billing_alerts" json:"billing_alerts"`
	SecurityAlerts      bool      `db:"security_alerts" json:"security_alerts"`
	TwoFAEnabled        bool      `db:"two_fa_enabled" json:"two_fa_enabled"`
	Force2FA            bool      `db:"force_2fa" json:"force_2fa"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
	UpdatedAt           time.Time `db:"updated_at" json:"updated_at"`
}

// UserSession tracks an active login session

type UserSession struct {
	ID         string     `db:"id" json:"id"`
	UserID     string     `db:"user_id" json:"user_id"`
	UserType   string     `db:"user_type" json:"user_type"` // 'account' or 'user'
	IPAddress  string     `db:"ip_address" json:"ip_address"`
	UserAgent  string     `db:"user_agent" json:"user_agent"`
	TokenHash  string     `db:"token_hash" json:"-"`
	LastActive time.Time  `db:"last_active" json:"last_active"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	RevokedAt  *time.Time `db:"revoked_at" json:"revoked_at,omitempty"`
}

// WebhookWithAccount is a webhook enriched with account name (for admin views)

type WebhookWithAccount struct {
	Webhook
	AccountName string `db:"account_name" json:"account_name"`
}

// TemplateWithAccount is a template enriched with account name (for admin views)

type TemplateWithAccount struct {
	Template
	AccountName string `db:"account_name" json:"account_name"`
}

// SubscriptionWithAccount is a subscription enriched with account+plan names

type SubscriptionWithAccount struct {
	Subscription
	AccountName string `db:"account_name" json:"account_name"`
	PlanName    string `db:"plan_name" json:"plan_name"`
}
