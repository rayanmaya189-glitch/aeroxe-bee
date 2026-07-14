package services

import (
	"context"
	"time"

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
		`INSERT INTO webhook_deliveries (webhook_id, message_id, event, attempt_count, status_code, response_body, last_status, last_attempt_at, completed, created_at, payload)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		d.WebhookID, d.MessageID, d.Event, d.AttemptCount, d.StatusCode, d.ResponseBody, d.LastStatus, d.LastAttemptAt, d.Completed, d.CreatedAt, d.Payload)
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

// ListPendingRetries returns non-completed webhook deliveries that are due for retry
// (attempt_count < maxAttempts and enough time has passed since last_attempt_at).
func (s *WebhookDeliveryService) ListPendingRetries(ctx context.Context, maxAttempts int) ([]models.WebhookDelivery, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, webhook_id, message_id, event, attempt_count, status_code, response_body, last_status, last_attempt_at, completed, created_at, payload
		 FROM webhook_deliveries
		 WHERE completed = false AND attempt_count < $1
		 ORDER BY last_attempt_at ASC`, maxAttempts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deliveries []models.WebhookDelivery
	for rows.Next() {
		var d models.WebhookDelivery
		if err := rows.Scan(&d.ID, &d.WebhookID, &d.MessageID, &d.Event, &d.AttemptCount, &d.StatusCode, &d.ResponseBody, &d.LastStatus, &d.LastAttemptAt, &d.Completed, &d.CreatedAt, &d.Payload); err != nil {
			return nil, err
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}

// UpdateRetry increments the attempt count and updates the delivery status after a retry.
// Sets completed=true if attempts >= maxAttempts.
func (s *WebhookDeliveryService) UpdateRetry(ctx context.Context, id string, statusCode int, responseBody string, lastStatus string, attemptCount int, completed bool) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE webhook_deliveries
		 SET attempt_count=$1, status_code=$2, response_body=$3, last_status=$4, last_attempt_at=$5, completed=$6
		 WHERE id=$7`,
		attemptCount, statusCode, responseBody, lastStatus, now, completed, id)
	return err
}


