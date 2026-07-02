package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type APIKeyService struct {
	db DatabaseQuerier
}

func NewAPIKeyService(db DatabaseQuerier) *APIKeyService {
	return &APIKeyService{db: db}
}

func (s *APIKeyService) Generate(ctx context.Context, accountID, label string, scopes []string, expiresAt *time.Time) (string, *models.APIKey, error) {
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", nil, fmt.Errorf("generate key: %w", err)
	}
	rawKey := hex.EncodeToString(keyBytes)
	keyHash := s.hashKey(rawKey)

	apiKey := &models.APIKey{}
	err := s.db.QueryRow(ctx,
		`INSERT INTO api_keys (account_id, key_hash, label, scopes, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, account_id, key_hash, label, scopes, expires_at, revoked_at, created_at`,
		accountID, keyHash, label, scopes, expiresAt,
	).Scan(&apiKey.ID, &apiKey.AccountID, &apiKey.KeyHash, &apiKey.Label, &apiKey.Scopes,
		&apiKey.ExpiresAt, &apiKey.RevokedAt, &apiKey.CreatedAt)
	if err != nil {
		return "", nil, fmt.Errorf("save api key: %w", err)
	}

	return rawKey, apiKey, nil
}

func (s *APIKeyService) Validate(ctx context.Context, rawKey string) (*models.APIKey, error) {
	keyHash := s.hashKey(rawKey)
	apiKey := &models.APIKey{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, key_hash, label, scopes, expires_at, revoked_at, created_at
		 FROM api_keys WHERE key_hash = $1`, keyHash,
	).Scan(&apiKey.ID, &apiKey.AccountID, &apiKey.KeyHash, &apiKey.Label, &apiKey.Scopes,
		&apiKey.ExpiresAt, &apiKey.RevokedAt, &apiKey.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("validate api key: %w", err)
	}

	if apiKey.RevokedAt != nil {
		return nil, fmt.Errorf("api key revoked")
	}
	if apiKey.ExpiresAt != nil && apiKey.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("api key expired")
	}

	return apiKey, nil
}

func (s *APIKeyService) List(ctx context.Context, accountID string) ([]models.APIKey, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, account_id, key_hash, label, scopes, expires_at, revoked_at, created_at
		 FROM api_keys WHERE account_id = $1 ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.AccountID, &k.KeyHash, &k.Label, &k.Scopes,
			&k.ExpiresAt, &k.RevokedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (s *APIKeyService) Revoke(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx, `UPDATE api_keys SET revoked_at=$1 WHERE id=$2`, now, id)
	return err
}

func (s *APIKeyService) hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}
