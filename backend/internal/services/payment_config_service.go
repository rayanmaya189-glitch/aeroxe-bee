package services

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type PaymentConfigService struct {
	db DatabaseQuerier
}

func NewPaymentConfigService(db DatabaseQuerier) *PaymentConfigService {
	return &PaymentConfigService{db: db}
}

func (s *PaymentConfigService) List(ctx context.Context) ([]models.PaymentConfig, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, method, label, details, enabled, created_by, created_at, updated_at
		 FROM payment_configs ORDER BY method`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []models.PaymentConfig
	for rows.Next() {
		var c models.PaymentConfig
		if err := rows.Scan(&c.ID, &c.Method, &c.Label, &c.Details, &c.Enabled,
			&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (s *PaymentConfigService) ListEnabled(ctx context.Context) ([]models.PaymentConfig, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, method, label, details, enabled, created_by, created_at, updated_at
		 FROM payment_configs WHERE enabled = TRUE ORDER BY method`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []models.PaymentConfig
	for rows.Next() {
		var c models.PaymentConfig
		if err := rows.Scan(&c.ID, &c.Method, &c.Label, &c.Details, &c.Enabled,
			&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (s *PaymentConfigService) GetByID(ctx context.Context, id string) (*models.PaymentConfig, error) {
	c := &models.PaymentConfig{}
	err := s.db.QueryRow(ctx,
		`SELECT id, method, label, details, enabled, created_by, created_at, updated_at
		 FROM payment_configs WHERE id = $1`, id,
	).Scan(&c.ID, &c.Method, &c.Label, &c.Details, &c.Enabled,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (s *PaymentConfigService) GetByMethod(ctx context.Context, method string) (*models.PaymentConfig, error) {
	c := &models.PaymentConfig{}
	err := s.db.QueryRow(ctx,
		`SELECT id, method, label, details, enabled, created_by, created_at, updated_at
		 FROM payment_configs WHERE method = $1`, method,
	).Scan(&c.ID, &c.Method, &c.Label, &c.Details, &c.Enabled,
		&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (s *PaymentConfigService) Update(ctx context.Context, id string, label string, details json.RawMessage, enabled bool, createdBy string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE payment_configs SET label=$2, details=$3, enabled=$4, created_by=$5, updated_at=$6
		 WHERE id=$1`, id, label, details, enabled, createdBy, now)
	return err
}

func (s *PaymentConfigService) Upsert(ctx context.Context, method, label string, details json.RawMessage, enabled bool, createdBy string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`INSERT INTO payment_configs (method, label, details, enabled, created_by, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (method) DO UPDATE SET label=$2, details=$3, enabled=$4, created_by=$5, updated_at=$7`,
		method, label, details, enabled, createdBy, now, now)
	return err
}
