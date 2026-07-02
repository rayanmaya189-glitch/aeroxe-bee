package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type UserPreferencesService struct {
	db DatabaseQuerier
}

func NewUserPreferencesService(db DatabaseQuerier) *UserPreferencesService {
	return &UserPreferencesService{db: db}
}

func (s *UserPreferencesService) GetByUserID(ctx context.Context, userID string) (*models.UserPreferences, error) {
	p := &models.UserPreferences{}
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, email_notifications, sms_notifications,
		        webhook_notifications, billing_alerts, security_alerts,
		        two_fa_enabled, force_2fa, created_at, updated_at
		 FROM user_preferences WHERE user_id = $1`, userID,
	).Scan(&p.ID, &p.UserID, &p.AccountID, &p.EmailNotifications, &p.SmsNotifications,
		&p.WebhookNotifications, &p.BillingAlerts, &p.SecurityAlerts,
		&p.TwoFAEnabled, &p.Force2FA, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (s *UserPreferencesService) GetByAccountID(ctx context.Context, accountID string) (*models.UserPreferences, error) {
	p := &models.UserPreferences{}
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, email_notifications, sms_notifications,
		        webhook_notifications, billing_alerts, security_alerts,
		        two_fa_enabled, force_2fa, created_at, updated_at
		 FROM user_preferences WHERE account_id = $1`, accountID,
	).Scan(&p.ID, &p.UserID, &p.AccountID, &p.EmailNotifications, &p.SmsNotifications,
		&p.WebhookNotifications, &p.BillingAlerts, &p.SecurityAlerts,
		&p.TwoFAEnabled, &p.Force2FA, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (s *UserPreferencesService) Upsert(ctx context.Context, p *models.UserPreferences) error {
	if p.UserID != nil && *p.UserID != "" {
		_, err := s.db.Exec(ctx,
			`INSERT INTO user_preferences (user_id, email_notifications, sms_notifications, webhook_notifications,
			         billing_alerts, security_alerts, two_fa_enabled, force_2fa, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
			 ON CONFLICT (user_id) DO UPDATE SET
			         email_notifications=$2, sms_notifications=$3, webhook_notifications=$4,
			         billing_alerts=$5, security_alerts=$6, two_fa_enabled=$7, force_2fa=$8, updated_at=NOW()`,
			p.UserID, p.EmailNotifications, p.SmsNotifications, p.WebhookNotifications,
			p.BillingAlerts, p.SecurityAlerts, p.TwoFAEnabled, p.Force2FA)
		return err
	}
	if p.AccountID != nil && *p.AccountID != "" {
		_, err := s.db.Exec(ctx,
			`INSERT INTO user_preferences (account_id, email_notifications, sms_notifications, webhook_notifications,
			         billing_alerts, security_alerts, two_fa_enabled, force_2fa, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
			 ON CONFLICT (account_id) DO UPDATE SET
			         email_notifications=$2, sms_notifications=$3, webhook_notifications=$4,
			         billing_alerts=$5, security_alerts=$6, two_fa_enabled=$7, force_2fa=$8, updated_at=NOW()`,
			p.AccountID, p.EmailNotifications, p.SmsNotifications, p.WebhookNotifications,
			p.BillingAlerts, p.SecurityAlerts, p.TwoFAEnabled, p.Force2FA)
		return err
	}
	return nil
}

func (s *UserPreferencesService) IsForce2FA(ctx context.Context, userID, accountID string) bool {
	if userID != "" {
		p, err := s.GetByUserID(ctx, userID)
		return err == nil && p != nil && p.Force2FA
	}
	if accountID != "" {
		p, err := s.GetByAccountID(ctx, accountID)
		return err == nil && p != nil && p.Force2FA
	}
	return false
}
