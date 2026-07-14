package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/redis/go-redis/v9"
	"github.com/aeroxe-bee/backend/internal/config"
)

type DatabaseQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

type ServiceRegistry struct {
	Accounts             *AccountService
	APIKeys              *APIKeyService
	Devices              *DeviceService
	Messages             *MessageService
	MQTTCredentials      *MQTTCredentialService
	OTP                  *OTPService
	Templates            *TemplateService
	Webhooks             *WebhookService
	WebhookDeliveries    *WebhookDeliveryService
	Subscriptions        *SubscriptionService
	CostTracking         *CostTrackingService
	Billing              *BillingService
	Admin                *AdminService
	TwoFA                *TwoFAService
	PaymentConfigs       *PaymentConfigService
	PaymentRequests      *PaymentRequestService
	SubscriptionRequests *SubscriptionRequestService
	Kyc                  *KycService
	Preferences          *UserPreferencesService
	InboundMessages      *InboundMessageService
}

func NewServiceRegistry(db DatabaseQuerier, rdb *redis.Client, otpCfg config.OTPConfig) *ServiceRegistry {
	return &ServiceRegistry{
		Accounts:             NewAccountService(db),
		APIKeys:              NewAPIKeyService(db),
		Devices:              NewDeviceService(db),
		Messages:             NewMessageService(db),
		MQTTCredentials:      NewMQTTCredentialService(db),
		OTP:                  NewOTPService(rdb, db, otpCfg),
		Templates:            NewTemplateService(db),
		Webhooks:             NewWebhookService(db),
		WebhookDeliveries:    NewWebhookDeliveryService(db),
		Subscriptions:        NewSubscriptionService(db),
		CostTracking:         NewCostTrackingService(db),
		Billing:              NewBillingService(db),
		Admin:                NewAdminService(db),
		TwoFA:                NewTwoFAService(db),
		PaymentConfigs:       NewPaymentConfigService(db),
		PaymentRequests:      NewPaymentRequestService(db),
		SubscriptionRequests: NewSubscriptionRequestService(db),
		Kyc:                  NewKycService(db),
		Preferences:          NewUserPreferencesService(db),
		InboundMessages:      NewInboundMessageService(db),
	}
}
