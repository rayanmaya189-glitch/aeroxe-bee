package services

import (
	"context"
	"fmt"
	"time"

	"github.com/textbee/backend/internal/models"
)

type AdminService struct {
	db DatabaseQuerier
}

func NewAdminService(db DatabaseQuerier) *AdminService {
	return &AdminService{db: db}
}

type PlatformStats struct {
	TotalAccounts   int64   `json:"total_accounts"`
	ActiveDevices   int64   `json:"active_devices"`
	TotalSent       int64   `json:"total_sent"`
	TotalDelivered  int64   `json:"total_delivered"`
	TotalFailed     int64   `json:"total_failed"`
	AvgConfidence   float64 `json:"avg_confidence"`
	ActiveCircuits  int64   `json:"active_circuits"`
	PendingFraud    int64   `json:"pending_fraud"`
	QueueDepth      map[string]int64 `json:"queue_depth"`
}

func (s *AdminService) GetPlatformStats(ctx context.Context) (*PlatformStats, error) {
	stats := &PlatformStats{
		QueueDepth: make(map[string]int64),
	}

	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&stats.TotalAccounts); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM devices WHERE status = 'ONLINE'`).Scan(&stats.ActiveDevices); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE delivery_status = 'CARRIER_ACCEPTED' OR delivery_status = 'PROBABLE_DELIVERED'`).Scan(&stats.TotalDelivered); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE delivery_status = 'FAILED'`).Scan(&stats.TotalFailed); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COALESCE(AVG(confidence_score), 0) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours'`).Scan(&stats.AvgConfidence); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM circuit_breaker_events WHERE state = 'OPEN' AND closed_at IS NULL`).Scan(&stats.ActiveCircuits); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM fraud_flags WHERE reviewed = false`).Scan(&stats.PendingFraud); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages`).Scan(&stats.TotalSent); err != nil {
		return nil, err
	}

	return stats, nil
}

func (s *AdminService) GetAccount(ctx context.Context, id string) (*models.Account, error) {
	return NewAccountService(s.db).GetByID(ctx, id)
}

func (s *AdminService) GetQueueDepths(ctx context.Context) (map[string]int64, error) {
	depths := make(map[string]int64)

	var otpCount, txnCount, mktCount int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE status = 'pending' AND priority_lane = 'otp'`).Scan(&otpCount); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE status = 'pending' AND priority_lane = 'transactional'`).Scan(&txnCount); err != nil {
		return nil, err
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE status = 'pending' AND priority_lane = 'marketing'`).Scan(&mktCount); err != nil {
		return nil, err
	}

	depths["otp"] = otpCount
	depths["transactional"] = txnCount
	depths["marketing"] = mktCount
	return depths, nil
}

func (s *AdminService) ApproveTemplate(ctx context.Context, id string) error {
	return NewTemplateService(s.db).Approve(ctx, id)
}

func (s *AdminService) RejectTemplate(ctx context.Context, id string) error {
	return NewTemplateService(s.db).Reject(ctx, id)
}

func (s *AdminService) RetryDeadLetter(ctx context.Context, id string) error {
	letter, err := s.GetDeadLetterByID(ctx, id)
	if err != nil {
		return fmt.Errorf("dead letter not found: %w", err)
	}

	_, err = s.db.Exec(ctx,
		`UPDATE messages SET status='pending' WHERE id=$1`, letter.MessageID)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(ctx, `DELETE FROM queue_dead_letters WHERE id=$1`, id)
	return err
}

func (s *AdminService) GetDeadLetterByID(ctx context.Context, id string) (*models.QueueDeadLetter, error) {
	letter := &models.QueueDeadLetter{}
	err := s.db.QueryRow(ctx,
		`SELECT id, stream, message_id, payload, fail_reason, failed_at, retry_count
		 FROM queue_dead_letters WHERE id = $1`, id,
	).Scan(&letter.ID, &letter.Stream, &letter.MessageID, &letter.Payload, &letter.FailReason, &letter.FailedAt, &letter.RetryCount)
	if err != nil {
		return nil, err
	}
	return letter, nil
}

func (s *AdminService) ListAccounts(ctx context.Context, offset, limit int) ([]models.Account, error) {
	return NewAccountService(s.db).List(ctx, offset, limit)
}

func (s *AdminService) SuspendAccount(ctx context.Context, id string) error {
	return NewAccountService(s.db).Suspend(ctx, id)
}

func (s *AdminService) ActivateAccount(ctx context.Context, id string) error {
	return NewAccountService(s.db).Activate(ctx, id)
}

func (s *AdminService) GetAnalytics(ctx context.Context, startDate, endDate string) ([]models.AnalyticsDaily, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, date, total_sent, total_delivered, total_failed, avg_confidence,
		        otp_sent, transactional_sent, marketing_sent
		 FROM analytics_daily WHERE date >= $1 AND date <= $2 ORDER BY date ASC`,
		startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var analytics []models.AnalyticsDaily
	for rows.Next() {
		var a models.AnalyticsDaily
		if err := rows.Scan(&a.ID, &a.Date, &a.TotalSent, &a.TotalDelivered, &a.TotalFailed,
			&a.AvgConfidence, &a.OTPSent, &a.TransactionalSent, &a.MarketingSent); err != nil {
			return nil, err
		}
		analytics = append(analytics, a)
	}
	return analytics, nil
}

func (s *AdminService) GetPendingTemplateApprovals(ctx context.Context) ([]models.Template, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, account_id, name, body, variables, approval_status, approved_at, created_at
		 FROM templates WHERE approval_status = 'pending' ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.Template
	for rows.Next() {
		var t models.Template
		if err := rows.Scan(&t.ID, &t.AccountID, &t.Name, &t.Body, &t.Variables,
			&t.ApprovalStatus, &t.ApprovedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (s *AdminService) GetDeadLetters(ctx context.Context, limit int) ([]models.QueueDeadLetter, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, stream, message_id, payload, fail_reason, failed_at, retry_count
		 FROM queue_dead_letters ORDER BY failed_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var letters []models.QueueDeadLetter
	for rows.Next() {
		var l models.QueueDeadLetter
		if err := rows.Scan(&l.ID, &l.Stream, &l.MessageID, &l.Payload, &l.FailReason, &l.FailedAt, &l.RetryCount); err != nil {
			return nil, err
		}
		letters = append(letters, l)
	}
	return letters, nil
}

func (s *AdminService) RecordAnalyticsDaily(ctx context.Context) error {
	today := time.Now().Format("2006-01-02")
	_, err := s.db.Exec(ctx,
		`INSERT INTO analytics_daily (date, total_sent, total_delivered, total_failed, avg_confidence,
		 otp_sent, transactional_sent, marketing_sent)
		 SELECT $1,
		        COUNT(*),
		        COUNT(*) FILTER (WHERE delivery_status IN ('CARRIER_ACCEPTED', 'PROBABLE_DELIVERED')),
		        COUNT(*) FILTER (WHERE delivery_status = 'FAILED'),
		        COALESCE(AVG(confidence_score), 0),
		        COUNT(*) FILTER (WHERE message_type = 'otp'),
		        COUNT(*) FILTER (WHERE message_type = 'transactional'),
		        COUNT(*) FILTER (WHERE message_type = 'marketing')
		 FROM messages WHERE created_at::date = $1::date
		 ON CONFLICT (date) DO UPDATE SET
		 total_sent = EXCLUDED.total_sent,
		 total_delivered = EXCLUDED.total_delivered,
		 total_failed = EXCLUDED.total_failed,
		 avg_confidence = EXCLUDED.avg_confidence,
		 otp_sent = EXCLUDED.otp_sent,
		 transactional_sent = EXCLUDED.transactional_sent,
		 marketing_sent = EXCLUDED.marketing_sent`,
		today)
	return err
}


