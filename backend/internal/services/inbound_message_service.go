package services

import (
	"context"
	"time"

	"github.com/aeroxe-bee/backend/internal/models"
)

// InboundMessageService persists and queries SMS received by device nodes.
type InboundMessageService struct {
	db DatabaseQuerier
}

func NewInboundMessageService(db DatabaseQuerier) *InboundMessageService {
	return &InboundMessageService{db: db}
}

// Create stores a received inbound message. Body is expected to be already
// encrypted by the caller (mirrors outbound message storage).
func (s *InboundMessageService) Create(ctx context.Context, m *models.InboundMessage) error {
	if m.ReceivedAt.IsZero() {
		m.ReceivedAt = time.Now()
	}
	_, err := s.db.Exec(ctx,
		`INSERT INTO inbound_messages (device_id, account_id, sender, recipient, body, sim_slot, received_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		m.DeviceID, m.AccountID, m.Sender, m.Recipient, m.Body, m.SIMSlot, m.ReceivedAt)
	return err
}

// ListByAccount returns inbound messages for an account, newest first.
func (s *InboundMessageService) ListByAccount(ctx context.Context, accountID string, offset, limit int) ([]models.InboundMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := s.db.Query(ctx,
		`SELECT id, device_id, account_id, sender, recipient, body, sim_slot, received_at, created_at
		 FROM inbound_messages
		 WHERE account_id = $1
		 ORDER BY received_at DESC
		 LIMIT $2 OFFSET $3`, accountID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.InboundMessage
	for rows.Next() {
		var m models.InboundMessage
		if err := rows.Scan(&m.ID, &m.DeviceID, &m.AccountID, &m.Sender, &m.Recipient, &m.Body, &m.SIMSlot, &m.ReceivedAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

// CountByAccount returns the total number of inbound messages for an account.
func (s *InboundMessageService) CountByAccount(ctx context.Context, accountID string) (int, error) {
	var total int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM inbound_messages WHERE account_id = $1`, accountID).Scan(&total)
	return total, err
}
