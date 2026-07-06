package services

import (
	"context"

	"github.com/aeroxe-bee/backend/internal/models"
)

type WebhookDeliveryService struct {
	db DatabaseQuerier
}

func NewWebhookDeliveryService(db DatabaseQuerier) *WebhookDeliveryService {
	return &WebhookDeliveryService{db: db}
}

func (s *WebhookDeliveryService) Create(ctx context.Context, d *models.WebhookDelivery) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO webhook_deliveries (webhook_id, message_id, event, attempt_count, status_code, response_body, last_status, last_attempt_at, completed, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		d.WebhookID, d.MessageID, d.Event, d.AttemptCount, d.StatusCode, d.ResponseBody, d.LastStatus, d.LastAttemptAt, d.Completed, d.CreatedAt)
	return err
}

func (s *WebhookDeliveryService) ListByWebhookID(ctx context.Context, webhookID string, limit int) ([]models.WebhookDelivery, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := s.db.Query(ctx,
		`SELECT id, webhook_id, message_id, event, attempt_count, status_code, response_body, last_status, last_attempt_at, completed, created_at
		 FROM webhook_deliveries
		 WHERE webhook_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2`, webhookID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deliveries []models.WebhookDelivery
	for rows.Next() {
		var d models.WebhookDelivery
		if err := rows.Scan(&d.ID, &d.WebhookID, &d.MessageID, &d.Event, &d.AttemptCount, &d.StatusCode, &d.ResponseBody, &d.LastStatus, &d.LastAttemptAt, &d.Completed, &d.CreatedAt); err != nil {
			return nil, err
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}


