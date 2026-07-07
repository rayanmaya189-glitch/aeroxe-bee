package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/ai"
)

type AIConfigService struct {
	db DatabaseQuerier
}

func NewAIConfigService(db DatabaseQuerier) *AIConfigService {
	return &AIConfigService{db: db}
}

// List returns all AI configs.
func (s *AIConfigService) List(ctx context.Context) ([]ai.AIConfig, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, provider, label, endpoint_url, api_key, model, is_active, created_by, created_at, updated_at
		 FROM ai_configs ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list ai configs: %w", err)
	}
	defer rows.Close()

	var configs []ai.AIConfig
	for rows.Next() {
		var c ai.AIConfig
		if err := rows.Scan(&c.ID, &c.Provider, &c.Label, &c.EndpointURL, &c.APIKey,
			&c.Model, &c.IsActive, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan ai config: %w", err)
		}
		configs = append(configs, c)
	}
	return configs, nil
}

// GetByID returns a single AI config.
func (s *AIConfigService) GetByID(ctx context.Context, id string) (*ai.AIConfig, error) {
	var c ai.AIConfig
	err := s.db.QueryRow(ctx,
		`SELECT id, provider, label, endpoint_url, api_key, model, is_active, created_by, created_at, updated_at
		 FROM ai_configs WHERE id = $1`, id,
	).Scan(&c.ID, &c.Provider, &c.Label, &c.EndpointURL, &c.APIKey,
		&c.Model, &c.IsActive, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get ai config: %w", err)
	}
	return &c, nil
}

// GetActive returns the currently active AI config (with API key).
func (s *AIConfigService) GetActive(ctx context.Context) (*ai.AIConfig, error) {
	var c ai.AIConfig
	err := s.db.QueryRow(ctx,
		`SELECT id, provider, label, endpoint_url, api_key, model, is_active, created_by, created_at, updated_at
		 FROM ai_configs WHERE is_active = TRUE LIMIT 1`,
	).Scan(&c.ID, &c.Provider, &c.Label, &c.EndpointURL, &c.APIKey,
		&c.Model, &c.IsActive, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get active ai config: %w", err)
	}
	return &c, nil
}

// Create inserts a new AI config. If is_active is true, deactivates all others.
func (s *AIConfigService) Create(ctx context.Context, c *ai.AIConfig) error {
	if c.IsActive {
		if _, err := s.db.Exec(ctx, `UPDATE ai_configs SET is_active = FALSE WHERE is_active = TRUE`); err != nil {
			return fmt.Errorf("deactivate configs: %w", err)
		}
	}
	_, err := s.db.Exec(ctx,
		`INSERT INTO ai_configs (provider, label, endpoint_url, api_key, model, is_active, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		c.Provider, c.Label, c.EndpointURL, c.APIKey, c.Model, c.IsActive, c.CreatedBy)
	return err
}

// Update modifies an existing AI config.
func (s *AIConfigService) Update(ctx context.Context, c *ai.AIConfig) error {
	if c.IsActive {
		if _, err := s.db.Exec(ctx, `UPDATE ai_configs SET is_active = FALSE WHERE is_active = TRUE AND id != $1`, c.ID); err != nil {
			return fmt.Errorf("deactivate configs: %w", err)
		}
	}
	_, err := s.db.Exec(ctx,
		`UPDATE ai_configs SET provider=$1, label=$2, endpoint_url=$3, api_key=$4, model=$5, is_active=$6, updated_at=NOW()
		 WHERE id=$7`,
		c.Provider, c.Label, c.EndpointURL, c.APIKey, c.Model, c.IsActive, c.ID)
	return err
}

// Delete removes an AI config by ID.
func (s *AIConfigService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM ai_configs WHERE id=$1`, id)
	return err
}

// ─── Config Change Requests (maker-checker) ─────────────────────────────

type ConfigChangeRequest struct {
	ID               string    `json:"id"`
	RequestedBy      string    `json:"requested_by"`
	RequestedByName  string    `json:"requested_by_name"`
	ConfigType       string    `json:"config_type"`
	Action           string    `json:"action"` // create, update, delete
	ConfigID         *string   `json:"config_id,omitempty"`
	Payload          map[string]interface{} `json:"payload"`
	Status           string    `json:"status"` // pending, approved, rejected
	ReviewedBy       *string   `json:"reviewed_by,omitempty"`
	ReviewedByName   string    `json:"reviewed_by_name"`
	ReviewNotes      string    `json:"review_notes"`
	CreatedAt        time.Time `json:"created_at"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
}

func (s *AIConfigService) CreateChangeRequest(ctx context.Context, req *ConfigChangeRequest) error {
	payloadBytes, _ := serializeMap(req.Payload)
	err := s.db.QueryRow(ctx,
		`INSERT INTO config_change_requests (requested_by, requested_by_name, config_type, action, config_id, payload)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		req.RequestedBy, req.RequestedByName, req.ConfigType, req.Action, req.ConfigID, payloadBytes,
	).Scan(&req.ID, &req.CreatedAt)
	return err
}

func (s *AIConfigService) ListChangeRequests(ctx context.Context) ([]ConfigChangeRequest, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, requested_by, requested_by_name, config_type, action, config_id, payload, status,
		        reviewed_by, reviewed_by_name, review_notes, created_at, reviewed_at
		 FROM config_change_requests ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var requests []ConfigChangeRequest
	for rows.Next() {
		var r ConfigChangeRequest
		var payload []byte
		if err := rows.Scan(&r.ID, &r.RequestedBy, &r.RequestedByName, &r.ConfigType, &r.Action,
			&r.ConfigID, &payload, &r.Status, &r.ReviewedBy, &r.ReviewedByName, &r.ReviewNotes,
			&r.CreatedAt, &r.ReviewedAt); err != nil {
			return nil, err
		}
		deserializeMap(payload, &r.Payload)
		requests = append(requests, r)
	}
	return requests, nil
}

func (s *AIConfigService) ApproveChangeRequest(ctx context.Context, id, reviewerID, reviewerName, notes string) error {
	result, err := s.db.Exec(ctx,
		`UPDATE config_change_requests SET status='approved', reviewed_by=$2, reviewed_by_name=$3,
		 review_notes=$4, reviewed_at=NOW() WHERE id=$1 AND status='pending'`,
		id, reviewerID, reviewerName, notes)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("request not found or already processed")
	}
	return nil
}

func (s *AIConfigService) RejectChangeRequest(ctx context.Context, id, reviewerID, reviewerName, notes string) error {
	result, err := s.db.Exec(ctx,
		`UPDATE config_change_requests SET status='rejected', reviewed_by=$2, reviewed_by_name=$3,
		 review_notes=$4, reviewed_at=NOW() WHERE id=$1 AND status='pending'`,
		id, reviewerID, reviewerName, notes)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("request not found or already processed")
	}
	return nil
}

func serializeMap(m map[string]interface{}) ([]byte, error) {
	return json.Marshal(m)
}

func deserializeMap(data []byte, m *map[string]interface{}) {
	if err := json.Unmarshal(data, m); err != nil {
		*m = make(map[string]interface{})
	}
}
