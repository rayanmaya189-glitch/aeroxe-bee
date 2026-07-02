package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

// PaymentRequestService manages payment/recharge requests with maker-checker flow
type PaymentRequestService struct {
	db DatabaseQuerier
}

func NewPaymentRequestService(db DatabaseQuerier) *PaymentRequestService {
	return &PaymentRequestService{db: db}
}

// PaymentRequestFilter for server-side filtering + pagination
type PaymentRequestFilter struct {
	Offset        int
	Limit         int
	Status        string // pending, approved, rejected
	AccountID     string
	PaymentMethod string
	SortBy        string // created_at, amount, status
	SortOrder     string // asc, desc
}

func (s *PaymentRequestService) List(ctx context.Context, f PaymentRequestFilter) ([]models.PaymentRequest, int64, error) {
	if f.Limit <= 0 {
		f.Limit = 10
	}
	if f.SortBy == "" {
		f.SortBy = "pr.created_at"
	}
	if f.SortOrder == "" {
		f.SortOrder = "desc"
	}

	conditions := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("pr.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.AccountID != "" {
		conditions = append(conditions, fmt.Sprintf("pr.account_id = $%d", argIdx))
		args = append(args, f.AccountID)
		argIdx++
	}
	if f.PaymentMethod != "" {
		conditions = append(conditions, fmt.Sprintf("pr.payment_method = $%d", argIdx))
		args = append(args, f.PaymentMethod)
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Validate sort column (whitelist)
	validSorts := map[string]string{
		"created_at": "pr.created_at",
		"amount":     "pr.amount",
		"status":     "pr.status",
	}
	sortCol := validSorts[f.SortBy]
	if sortCol == "" {
		sortCol = "pr.created_at"
	}
	sortOrder := "DESC"
	if f.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	// Count total
	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM payment_requests pr %s`, whereClause)
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch with LEFT JOINs
	query := fmt.Sprintf(`
		SELECT pr.id, pr.account_id, COALESCE(a.name, '') as account_name,
		       pr.plan_id, COALESCE(p.name, '') as plan_name,
		       pr.billing_cycle, pr.payment_method, pr.amount, pr.proof_url,
		       pr.status, pr.reviewed_by, COALESCE(u.name, '') as reviewed_by_name,
		       pr.reviewed_at, pr.review_notes, pr.created_at, pr.updated_at
		FROM payment_requests pr
		LEFT JOIN accounts a ON pr.account_id = a.id
		LEFT JOIN plans p ON pr.plan_id = p.id
		LEFT JOIN users u ON pr.reviewed_by = u.id
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, whereClause, sortCol, sortOrder, argIdx, argIdx+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var requests []models.PaymentRequest
	for rows.Next() {
		var pr models.PaymentRequest
		if err := rows.Scan(&pr.ID, &pr.AccountID, &pr.AccountName,
			&pr.PlanID, &pr.PlanName,
			&pr.BillingCycle, &pr.PaymentMethod, &pr.Amount, &pr.ProofURL,
			&pr.Status, &pr.ReviewedBy, &pr.ReviewedByName,
			&pr.ReviewedAt, &pr.ReviewNotes, &pr.CreatedAt, &pr.UpdatedAt); err != nil {
			return nil, 0, err
		}
		requests = append(requests, pr)
	}
	return requests, total, nil
}

func (s *PaymentRequestService) Create(ctx context.Context, pr *models.PaymentRequest) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO payment_requests (account_id, plan_id, billing_cycle, payment_method, amount, proof_url, status)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
		pr.AccountID, pr.PlanID, pr.BillingCycle, pr.PaymentMethod, pr.Amount, pr.ProofURL)
	return err
}

func (s *PaymentRequestService) Approve(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE payment_requests SET status='approved', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *PaymentRequestService) Reject(ctx context.Context, id, reviewedBy, notes string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE payment_requests SET status='rejected', reviewed_by=$2, reviewed_at=NOW(), review_notes=$3, updated_at=NOW()
		 WHERE id=$1`, id, reviewedBy, notes)
	return err
}

func (s *PaymentRequestService) GetByID(ctx context.Context, id string) (*models.PaymentRequest, error) {
	pr := &models.PaymentRequest{}
	err := s.db.QueryRow(ctx,
		`SELECT pr.id, pr.account_id, COALESCE(a.name, '') as account_name,
		        pr.plan_id, COALESCE(p.name, '') as plan_name,
		        pr.billing_cycle, pr.payment_method, pr.amount, pr.proof_url,
		        pr.status, pr.reviewed_by, COALESCE(u.name, '') as reviewed_by_name,
		        pr.reviewed_at, pr.review_notes, pr.created_at, pr.updated_at
		 FROM payment_requests pr
		 LEFT JOIN accounts a ON pr.account_id = a.id
		 LEFT JOIN plans p ON pr.plan_id = p.id
		 LEFT JOIN users u ON pr.reviewed_by = u.id
		 WHERE pr.id = $1`, id,
	).Scan(&pr.ID, &pr.AccountID, &pr.AccountName,
		&pr.PlanID, &pr.PlanName,
		&pr.BillingCycle, &pr.PaymentMethod, &pr.Amount, &pr.ProofURL,
		&pr.Status, &pr.ReviewedBy, &pr.ReviewedByName,
		&pr.ReviewedAt, &pr.ReviewNotes, &pr.CreatedAt, &pr.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return pr, err
}

func (s *PaymentRequestService) CountPending(ctx context.Context) (int64, error) {
	var count int64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM payment_requests WHERE status = 'pending'`).Scan(&count)
	return count, err
}
