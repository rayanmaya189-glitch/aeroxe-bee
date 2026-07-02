package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/redis/go-redis/v9"
	"github.com/textbee/backend/internal/config"
)

type DatabaseQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

type ServiceRegistry struct {
	Accounts          *AccountService
	APIKeys           *APIKeyService
	Devices           *DeviceService
	Messages          *MessageService
	MQTTCredentials   *MQTTCredentialService
	OTP               *OTPService
	Templates         *TemplateService
	Webhooks          *WebhookService
	Subscriptions     *SubscriptionService
	CostTracking      *CostTrackingService
	Billing           *BillingService
	Admin             *AdminService
}

func NewServiceRegistry(db DatabaseQuerier, rdb *redis.Client, otpCfg config.OTPConfig) *ServiceRegistry {
	return &ServiceRegistry{
		Accounts:          NewAccountService(db),
		APIKeys:           NewAPIKeyService(db),
		Devices:           NewDeviceService(db),
		Messages:          NewMessageService(db),
		MQTTCredentials:   NewMQTTCredentialService(db),
		OTP:               NewOTPService(rdb, db, otpCfg),
		Templates:         NewTemplateService(db),
		Webhooks:          NewWebhookService(db),
		Subscriptions:     NewSubscriptionService(db),
		CostTracking:      NewCostTrackingService(db),
		Billing:           NewBillingService(db),
		Admin:             NewAdminService(db),
	}
}
