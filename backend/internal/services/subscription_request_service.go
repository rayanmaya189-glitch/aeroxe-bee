package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type SubscriptionRequestService struct {
	db DatabaseQuerier
}

func NewSubscriptionRequestService(db DatabaseQuerier) *SubscriptionRequestService {
	return &SubscriptionRequestService{db: db}
}

type SubscriptionRequestFilter struct {
	Offset    int
	Limit     int
	Status    string
	AccountID string
	SortBy    string
	SortOrder string
}

func (s *SubscriptionRequestService) List(ctx context.Context, f SubscriptionRequestFilter) ([]models.SubscriptionRequest, int64, error) {
	if f.Limit <= 0 {
		f.Limit = 10
	}
	if f.SortBy == "" {
		f.SortBy = "sr.created_at"
	}
	if f.SortOrder == "" {
		f.SortOrder = "desc"
	}

	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("sr.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.AccountID != "" {
		conditions = append(conditions, fmt.Sprintf("sr.account_id = $%d", argIdx))
		args = append(args, f.AccountID)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	validSorts := map[string]string{
		"created_at": "sr.created_at",
		"status":     "sr.status",
	}
	sortCol := validSorts[f.SortBy]
	if sortCol == "" {
		sortCol = "sr.created_at"
	}
	sortOrder := "DESC"
	if f.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM subscription_requests sr %s`, whereClause)
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT sr.id, sr.account_id, COALESCE(a.name, '') as account_name,
		       sr.requested_plan, COALESCE(rp.name, '') as requested_plan_name,
		       sr.requested_billing_cycle,
		       sr.current_plan, COALESCE(cp.name, '') as current_plan_name,
		       sr.reason, sr.status, sr.reviewed_by, COALESCE(u.name, '') as reviewed_by_name,
		       sr.reviewed_at, sr.review_notes, sr.created_at, sr.updated_at
		FROM subscription_requests sr
		LEFT JOIN accounts a ON sr.account_id = a.id
		LEFT JOIN plans rp ON sr.requested_plan = rp.id
		LEFT JOIN plans cp ON sr.current_plan = cp.id
		LEFT JOIN users u ON sr.reviewed_by = u.id
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, whereClause, sortCol, sortOrder, argIdx, argIdx+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var requests []models.SubscriptionRequest
	for rows.Next() {
		var sr models.SubscriptionRequest
		if err := rows.Scan(&sr.ID, &sr.AccountID, &sr.AccountName,
			&sr.RequestedPlan, &sr.RequestedPlanName,
			&sr.RequestedBillingCycle,
			&sr.CurrentPlan, &sr.CurrentPlanName,
			&sr.Reason, &sr.Status, &sr.ReviewedBy, &sr.ReviewedByName,
			&sr.ReviewedAt, &sr.ReviewNotes, &sr.CreatedAt, &sr.UpdatedAt); err != nil {
			return nil, 0, err
		}
		requests = append(requests, sr)
	}
	return requests, total, nil
}

func (s *SubscriptionRequestService) Create(ctx context.Context, sr *models.SubscriptionRequest) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO subscription_requests (account_id, requested_plan, requested_billing_cycle, current_plan, reason, status)
		 VALUES ($1, $2, $3, $4, $5, 'pending')`,
		sr.AccountID, sr.RequestedPlan, sr.RequestedBillingCycle, sr.CurrentPlan, sr.Reason)
	return err
}

func (s *SubscriptionRequestService) Approve(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE subscription_requests SET status='approved', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *SubscriptionRequestService) Reject(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE subscription_requests SET status='rejected', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *SubscriptionRequestService) GetByID(ctx context.Context, id string) (*models.SubscriptionRequest, error) {
	sr := &models.SubscriptionRequest{}
	err := s.db.QueryRow(ctx,
		`SELECT sr.id, sr.account_id, COALESCE(a.name, '') as account_name,
		        sr.requested_plan, COALESCE(rp.name, '') as requested_plan_name,
		        sr.requested_billing_cycle,
		        sr.current_plan, COALESCE(cp.name, '') as current_plan_name,
		        sr.reason, sr.status, sr.reviewed_by, COALESCE(u.name, '') as reviewed_by_name,
		        sr.reviewed_at, sr.review_notes, sr.created_at, sr.updated_at
		 FROM subscription_requests sr
		 LEFT JOIN accounts a ON sr.account_id = a.id
		 LEFT JOIN plans rp ON sr.requested_plan = rp.id
		 LEFT JOIN plans cp ON sr.current_plan = cp.id
		 LEFT JOIN users u ON sr.reviewed_by = u.id
		 WHERE sr.id = $1`, id,
	).Scan(&sr.ID, &sr.AccountID, &sr.AccountName,
		&sr.RequestedPlan, &sr.RequestedPlanName,
		&sr.RequestedBillingCycle,
		&sr.CurrentPlan, &sr.CurrentPlanName,
		&sr.Reason, &sr.Status, &sr.ReviewedBy, &sr.ReviewedByName,
		&sr.ReviewedAt, &sr.ReviewNotes, &sr.CreatedAt, &sr.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return sr, err
}

func (s *SubscriptionRequestService) CountPending(ctx context.Context) (int64, error) {
	var count int64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM subscription_requests WHERE status = 'pending'`).Scan(&count)
	return count, err
}
