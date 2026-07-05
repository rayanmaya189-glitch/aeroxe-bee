package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aeroxe-bee/backend/internal/models"
)

type AdminService struct {
	db DatabaseQuerier
}

func NewAdminService(db DatabaseQuerier) *AdminService {
	return &AdminService{db: db}
}

type PlatformStats struct {
	TotalAccounts  int64              `json:"total_accounts"`
	ActiveDevices  int64              `json:"active_devices"`
	TotalSent      int64              `json:"total_sent"`
	TotalDelivered int64              `json:"total_delivered"`
	TotalFailed    int64              `json:"total_failed"`
	AvgConfidence  float64            `json:"avg_confidence"`
	ActiveCircuits int64              `json:"active_circuits"`
	PendingFraud   int64              `json:"pending_fraud"`
	QueueDepth     map[string]int64   `json:"queue_depth"`
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
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages WHERE delivery_status IN ('CARRIER_ACCEPTED', 'PROBABLE_DELIVERED')`).Scan(&stats.TotalDelivered); err != nil {
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

func (s *AdminService) DeleteAccount(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM accounts WHERE id=$1`, id)
	return err
}

func (s *AdminService) GetTotalAccountCount(ctx context.Context) (int64, error) {
	var count int64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&count)
	return count, err
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

	_, err = s.db.Exec(ctx, `UPDATE messages SET status='pending' WHERE id=$1`, letter.MessageID)
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

func (s *AdminService) GetPendingTemplateApprovals(ctx context.Context) ([]models.TemplateWithAccount, error) {
	rows, err := s.db.Query(ctx,
		`SELECT t.id, t.account_id, COALESCE(a.name, '') as account_name,
		        t.name, t.body, t.variables, t.approval_status, t.approved_at, t.created_at
	 FROM templates t
	 LEFT JOIN accounts a ON t.account_id = a.id
	 WHERE t.approval_status = 'pending' ORDER BY t.created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.TemplateWithAccount
	for rows.Next() {
		var t models.TemplateWithAccount
		if err := rows.Scan(&t.ID, &t.AccountID, &t.AccountName, &t.Name, &t.Body, &t.Variables,
			&t.ApprovalStatus, &t.ApprovedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

// ListAllTemplates returns all templates with account names (admin only)
func (s *AdminService) ListAllTemplates(ctx context.Context, status string, dateFrom, dateTo string) ([]models.TemplateWithAccount, error) {
	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("t.approval_status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}
	if dateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("t.created_at >= $%d", argIdx))
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		conditions = append(conditions, fmt.Sprintf("t.created_at <= $%d::date + INTERVAL '1 day'", argIdx))
		args = append(args, dateTo)
		argIdx++
	}

	query := fmt.Sprintf(
		`SELECT t.id, t.account_id, COALESCE(a.name, '') as account_name,
		        t.name, t.body, t.variables, t.approval_status, t.approved_at, t.created_at
	 FROM templates t
	 LEFT JOIN accounts a ON t.account_id = a.id
	 WHERE %s
	 ORDER BY t.created_at DESC`, strings.Join(conditions, " AND "))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.TemplateWithAccount
	for rows.Next() {
		var t models.TemplateWithAccount
		if err := rows.Scan(&t.ID, &t.AccountID, &t.AccountName, &t.Name, &t.Body, &t.Variables,
			&t.ApprovalStatus, &t.ApprovedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (s *AdminService) GetDeadLetters(ctx context.Context, offset, limit int, dateFrom, dateTo string) ([]models.QueueDeadLetter, int64, error) {
	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if dateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("failed_at >= $%d", argIdx))
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		conditions = append(conditions, fmt.Sprintf("failed_at <= $%d::date + INTERVAL '1 day'", argIdx))
		args = append(args, dateTo)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM queue_dead_letters WHERE %s`, whereClause)
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(
		`SELECT id, stream, message_id, payload, fail_reason, failed_at, retry_count
	 FROM queue_dead_letters WHERE %s
	 ORDER BY failed_at DESC LIMIT $%d OFFSET $%d`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var letters []models.QueueDeadLetter
	for rows.Next() {
		var l models.QueueDeadLetter
		if err := rows.Scan(&l.ID, &l.Stream, &l.MessageID, &l.Payload, &l.FailReason, &l.FailedAt, &l.RetryCount); err != nil {
			return nil, 0, err
		}
		letters = append(letters, l)
	}
	return letters, total, nil
}

// ListAllWebhooks returns all webhooks with account names (admin only)
func (s *AdminService) ListAllWebhooks(ctx context.Context, dateFrom, dateTo string) ([]models.WebhookWithAccount, error) {
	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if dateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("w.created_at >= $%d", argIdx))
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		conditions = append(conditions, fmt.Sprintf("w.created_at <= $%d::date + INTERVAL '1 day'", argIdx))
		args = append(args, dateTo)
		argIdx++
	}

	query := fmt.Sprintf(
		`SELECT w.id, w.account_id, COALESCE(a.name, '') as account_name,
		        w.url, w.events, w.secret, w.active, w.last_rotated_at, w.created_at
	 FROM webhooks w
	 LEFT JOIN accounts a ON w.account_id = a.id
	 WHERE %s
	 ORDER BY w.created_at DESC`, strings.Join(conditions, " AND "))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var webhooks []models.WebhookWithAccount
	for rows.Next() {
		var w models.WebhookWithAccount
		if err := rows.Scan(&w.ID, &w.AccountID, &w.AccountName, &w.URL, &w.Events, &w.Secret,
			&w.Active, &w.LastRotatedAt, &w.CreatedAt); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
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
