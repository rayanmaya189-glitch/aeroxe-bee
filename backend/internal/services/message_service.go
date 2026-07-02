package services

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type MessageService struct {
	db DatabaseQuerier
}

func NewMessageService(db DatabaseQuerier) *MessageService {
	return &MessageService{db: db}
}

func (s *MessageService) Create(ctx context.Context, msg *models.Message) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO messages (id, device_id, api_key_id, direction, recipient, sender, encrypted_message,
		 message_type, priority_lane, template_id, status, delivery_status, confidence_score,
		 error_reason, created_at, delivered_at, purge_after, idempotency_key, routing_strategy_used)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
		msg.ID, msg.DeviceID, msg.APIKeyID, msg.Direction, msg.Recipient, msg.Sender,
		msg.EncryptedMessage, msg.MessageType, msg.PriorityLane, msg.TemplateID,
		msg.Status, msg.DeliveryStatus, msg.ConfidenceScore, msg.ErrorReason,
		msg.CreatedAt, msg.DeliveredAt, msg.PurgeAfter, msg.IdempotencyKey, msg.RoutingStrategyUsed)
	return err
}

func (s *MessageService) GetByID(ctx context.Context, id string) (*models.Message, error) {
	msg := &models.Message{}
	err := s.db.QueryRow(ctx,
		`SELECT id, device_id, api_key_id, direction, recipient, sender, encrypted_message,
		        message_type, priority_lane, template_id, status, delivery_status, confidence_score,
		        error_reason, created_at, delivered_at, purge_after, idempotency_key, routing_strategy_used
		 FROM messages WHERE id = $1`, id,
	).Scan(&msg.ID, &msg.DeviceID, &msg.APIKeyID, &msg.Direction, &msg.Recipient, &msg.Sender,
		&msg.EncryptedMessage, &msg.MessageType, &msg.PriorityLane, &msg.TemplateID,
		&msg.Status, &msg.DeliveryStatus, &msg.ConfidenceScore, &msg.ErrorReason,
		&msg.CreatedAt, &msg.DeliveredAt, &msg.PurgeAfter, &msg.IdempotencyKey, &msg.RoutingStrategyUsed)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return msg, nil
}

func (s *MessageService) GetByIDAndAccount(ctx context.Context, id, accountID string) (*models.Message, error) {
	msg := &models.Message{}
	err := s.db.QueryRow(ctx,
		`SELECT m.id, m.device_id, m.api_key_id, m.direction, m.recipient, m.sender, m.encrypted_message,
		        m.message_type, m.priority_lane, m.template_id, m.status, m.delivery_status, m.confidence_score,
		        m.error_reason, m.created_at, m.delivered_at, m.purge_after, m.idempotency_key, m.routing_strategy_used
		 FROM messages m
		 JOIN api_keys ak ON m.api_key_id = ak.id
		 WHERE m.id = $1 AND ak.account_id = $2`, id, accountID,
	).Scan(&msg.ID, &msg.DeviceID, &msg.APIKeyID, &msg.Direction, &msg.Recipient, &msg.Sender,
		&msg.EncryptedMessage, &msg.MessageType, &msg.PriorityLane, &msg.TemplateID,
		&msg.Status, &msg.DeliveryStatus, &msg.ConfidenceScore, &msg.ErrorReason,
		&msg.CreatedAt, &msg.DeliveredAt, &msg.PurgeAfter, &msg.IdempotencyKey, &msg.RoutingStrategyUsed)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return msg, nil
}

func (s *MessageService) ListByAccount(ctx context.Context, accountID string, offset, limit int) ([]models.Message, error) {
	rows, err := s.db.Query(ctx,
		`SELECT m.id, m.device_id, m.api_key_id, m.direction, m.recipient, m.sender, m.encrypted_message,
		        m.message_type, m.priority_lane, m.template_id, m.status, m.delivery_status, m.confidence_score,
		        m.error_reason, m.created_at, m.delivered_at, m.purge_after, m.idempotency_key, m.routing_strategy_used
		 FROM messages m
		 JOIN api_keys ak ON m.api_key_id = ak.id
		 WHERE ak.account_id = $1
		 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`, accountID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.Message
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.DeviceID, &m.APIKeyID, &m.Direction, &m.Recipient, &m.Sender,
			&m.EncryptedMessage, &m.MessageType, &m.PriorityLane, &m.TemplateID,
			&m.Status, &m.DeliveryStatus, &m.ConfidenceScore, &m.ErrorReason,
			&m.CreatedAt, &m.DeliveredAt, &m.PurgeAfter, &m.IdempotencyKey, &m.RoutingStrategyUsed); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (s *MessageService) UpdateDeliveryStatus(ctx context.Context, id string, status models.DeliveryStatus, confidence float64) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE messages SET delivery_status=$1, confidence_score=$2, status=$3, delivered_at=$4
		 WHERE id=$5`,
		status, confidence, "delivered", now, id)
	return err
}

func (s *MessageService) MarkFailed(ctx context.Context, id string, reason string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE messages SET status='failed', delivery_status='FAILED', error_reason=$1 WHERE id=$2`,
		reason, id)
	return err
}

func (s *MessageService) UpdateDeviceID(ctx context.Context, id, deviceID string) error {
	_, err := s.db.Exec(ctx, `UPDATE messages SET device_id=$1 WHERE id=$2`, deviceID, id)
	return err
}

type ConfidenceBreakdown struct {
	MessageID       string   `json:"message_id"`
	DeliveryStatus  string   `json:"delivery_status"`
	ConfidenceScore float64  `json:"confidence_score"`
	ErrorReason     *string  `json:"error_reason,omitempty"`
	DeviceAssigned  *string  `json:"device_assigned,omitempty"`
	Carrier         *string  `json:"carrier,omitempty"`
}

func (s *MessageService) GetConfidenceBreakdown(ctx context.Context, id string) (*ConfidenceBreakdown, error) {
	msg, err := s.GetByID(ctx, id)
	if err != nil || msg == nil {
		return nil, err
	}

	breakdown := &ConfidenceBreakdown{
		MessageID:       msg.ID,
		DeliveryStatus:  string(msg.DeliveryStatus),
		ConfidenceScore: msg.ConfidenceScore,
		ErrorReason:     msg.ErrorReason,
	}

	if msg.DeviceID != nil {
		breakdown.DeviceAssigned = msg.DeviceID
	}

	return breakdown, nil
}

func (s *MessageService) DeleteOld(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `DELETE FROM messages WHERE purge_after < NOW()`)
	return err
}

func (s *MessageService) CountByAccount(ctx context.Context, accountID string) (int, error) {
	var count int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM messages m JOIN api_keys ak ON m.api_key_id = ak.id WHERE ak.account_id = $1`,
		accountID).Scan(&count)
	return count, err
}
