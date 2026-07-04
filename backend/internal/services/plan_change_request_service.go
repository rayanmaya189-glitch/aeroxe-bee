package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// PlanChangeRequest represents a maker-checker plan modification request
type PlanChangeRequest struct {
	ID              string     `json:"id"`
	RequestedBy     string     `json:"requested_by"`
	RequestedByName string     `json:"requested_by_name"`
	Action          string     `json:"action"` // create, update, delete
	PlanID          string     `json:"plan_id"`
	Payload         map[string]interface{} `json:"payload"`
	Status          string     `json:"status"` // pending, approved, rejected
	ReviewedBy      *string    `json:"reviewed_by,omitempty"`
	ReviewedByName  string     `json:"reviewed_by_name"`
	ReviewNotes     string     `json:"review_notes"`
	CreatedAt       time.Time  `json:"created_at"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
}

type PlanChangeRequestService struct {
	db DatabaseQuerier
}

func NewPlanChangeRequestService(db DatabaseQuerier) *PlanChangeRequestService {
	return &PlanChangeRequestService{db: db}
}

func (s *PlanChangeRequestService) Create(ctx context.Context, req *PlanChangeRequest) error {
	payloadBytes, err := json.Marshal(req.Payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}
	err = s.db.QueryRow(ctx,
		`INSERT INTO plan_change_requests (requested_by, requested_by_name, action, plan_id, payload)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		req.RequestedBy, req.RequestedByName, req.Action, req.PlanID, payloadBytes,
	).Scan(&req.ID, &req.CreatedAt)
	return err
}

func (s *PlanChangeRequestService) ListPending(ctx context.Context) ([]PlanChangeRequest, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, requested_by, requested_by_name, action, plan_id, payload, status,
		        review_notes, created_at
		 FROM plan_change_requests WHERE status = 'pending' ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var requests []PlanChangeRequest
	for rows.Next() {
		var r PlanChangeRequest
		var payload []byte
		if err := rows.Scan(&r.ID, &r.RequestedBy, &r.RequestedByName, &r.Action, &r.PlanID,
			&payload, &r.Status, &r.ReviewNotes, &r.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(payload, &r.Payload); err != nil {
			r.Payload = make(map[string]interface{})
		}
		requests = append(requests, r)
	}
	return requests, nil
}

func (s *PlanChangeRequestService) ListAll(ctx context.Context) ([]PlanChangeRequest, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, requested_by, requested_by_name, action, plan_id, payload, status,
		        reviewed_by, reviewed_by_name, review_notes, created_at, reviewed_at
		 FROM plan_change_requests ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var requests []PlanChangeRequest
	for rows.Next() {
		var r PlanChangeRequest
		var payload []byte
		if err := rows.Scan(&r.ID, &r.RequestedBy, &r.RequestedByName, &r.Action, &r.PlanID,
			&payload, &r.Status, &r.ReviewedBy, &r.ReviewedByName, &r.ReviewNotes,
			&r.CreatedAt, &r.ReviewedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(payload, &r.Payload); err != nil {
			r.Payload = make(map[string]interface{})
		}
		requests = append(requests, r)
	}
	return requests, nil
}

func (s *PlanChangeRequestService) Approve(ctx context.Context, id, reviewerID, reviewerName, notes string) error {
	result, err := s.db.Exec(ctx,
		`UPDATE plan_change_requests SET status = 'approved', reviewed_by = $2,
		 reviewed_by_name = $3, review_notes = $4, reviewed_at = NOW() WHERE id = $1 AND status = 'pending'`,
		id, reviewerID, reviewerName, notes)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("request not found or already processed")
	}
	return nil
}

func (s *PlanChangeRequestService) Reject(ctx context.Context, id, reviewerID, reviewerName, notes string) error {
	result, err := s.db.Exec(ctx,
		`UPDATE plan_change_requests SET status = 'rejected', reviewed_by = $2,
		 reviewed_by_name = $3, review_notes = $4, reviewed_at = NOW() WHERE id = $1 AND status = 'pending'`,
		id, reviewerID, reviewerName, notes)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("request not found or already processed")
	}
	return nil
}

func (s *PlanChangeRequestService) GetByID(ctx context.Context, id string) (*PlanChangeRequest, error) {
	var r PlanChangeRequest
	var payload []byte
	err := s.db.QueryRow(ctx,
		`SELECT id, requested_by, requested_by_name, action, plan_id, payload, status,
		        reviewed_by, reviewed_by_name, review_notes, created_at, reviewed_at
		 FROM plan_change_requests WHERE id = $1`, id,
	).Scan(&r.ID, &r.RequestedBy, &r.RequestedByName, &r.Action, &r.PlanID,
		&payload, &r.Status, &r.ReviewedBy, &r.ReviewedByName, &r.ReviewNotes,
		&r.CreatedAt, &r.ReviewedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(payload, &r.Payload); err != nil {
		r.Payload = make(map[string]interface{})
	}
	return &r, nil
}
