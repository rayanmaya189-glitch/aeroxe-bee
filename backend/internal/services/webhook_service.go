package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type WebhookService struct {
	db DatabaseQuerier
}

func NewWebhookService(db DatabaseQuerier) *WebhookService {
	return &WebhookService{db: db}
}

func (s *WebhookService) Create(ctx context.Context, webhook *models.Webhook) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO webhooks (account_id, url, events, secret, active, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		webhook.AccountID, webhook.URL, webhook.Events, webhook.Secret, webhook.Active)
	return err
}

func (s *WebhookService) GetByID(ctx context.Context, id string) (*models.Webhook, error) {
	w := &models.Webhook{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, url, events, secret, active, last_rotated_at, created_at
		 FROM webhooks WHERE id = $1`, id,
	).Scan(&w.ID, &w.AccountID, &w.URL, &w.Events, &w.Secret, &w.Active, &w.LastRotatedAt, &w.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return w, nil
}

func (s *WebhookService) ListByAccount(ctx context.Context, accountID string) ([]models.Webhook, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, account_id, url, events, secret, active, last_rotated_at, created_at
		 FROM webhooks WHERE account_id = $1 ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var webhooks []models.Webhook
	for rows.Next() {
		var w models.Webhook
		if err := rows.Scan(&w.ID, &w.AccountID, &w.URL, &w.Events, &w.Secret, &w.Active, &w.LastRotatedAt, &w.CreatedAt); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}

func (s *WebhookService) GetActiveByAccountAndEvent(ctx context.Context, accountID string, event string) ([]models.Webhook, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, account_id, url, events, secret, active, last_rotated_at, created_at
		 FROM webhooks WHERE account_id = $1 AND active = true AND $2 = ANY(events)`,
		accountID, event)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var webhooks []models.Webhook
	for rows.Next() {
		var w models.Webhook
		if err := rows.Scan(&w.ID, &w.AccountID, &w.URL, &w.Events, &w.Secret, &w.Active, &w.LastRotatedAt, &w.CreatedAt); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}

func (s *WebhookService) Update(ctx context.Context, webhook *models.Webhook) error {
	_, err := s.db.Exec(ctx,
		`UPDATE webhooks SET url=$1, events=$2, active=$3 WHERE id=$4`,
		webhook.URL, webhook.Events, webhook.Active, webhook.ID)
	return err
}

func (s *WebhookService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM webhooks WHERE id=$1`, id)
	return err
}

func (s *WebhookService) RotateSecret(ctx context.Context, id string, newSecret string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE webhooks SET secret=$1, last_rotated_at=NOW() WHERE id=$2`, newSecret, id)
	return err
}
