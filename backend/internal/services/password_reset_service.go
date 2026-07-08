package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

type PasswordResetService struct {
	db DatabaseQuerier
}

func NewPasswordResetService(db DatabaseQuerier) *PasswordResetService {
	return &PasswordResetService{db: db}
}

func (s *PasswordResetService) GenerateToken(ctx context.Context, accountID string) (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	rawToken := hex.EncodeToString(tokenBytes)
	tokenHash := s.hashToken(rawToken)

	_, err := s.db.Exec(ctx,
		`INSERT INTO password_reset_tokens (account_id, token_hash, expires_at)
		 VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
		accountID, tokenHash)
	if err != nil {
		return "", fmt.Errorf("failed to store reset token: %w", err)
	}

	return rawToken, nil
}

func (s *PasswordResetService) ValidateToken(ctx context.Context, rawToken string) (string, error) {
	tokenHash := s.hashToken(rawToken)

	var accountID string
	var expiresAt time.Time
	var used bool

	err := s.db.QueryRow(ctx,
		`SELECT account_id, expires_at, used
		 FROM password_reset_tokens
		 WHERE token_hash = $1
		 ORDER BY created_at DESC LIMIT 1`,
		tokenHash,
	).Scan(&accountID, &expiresAt, &used)

	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("invalid or expired reset token")
	}
	if err != nil {
		return "", fmt.Errorf("failed to validate reset token: %w", err)
	}

	if used {
		return "", fmt.Errorf("reset token has already been used")
	}

	if time.Now().After(expiresAt) {
		return "", fmt.Errorf("reset token has expired")
	}

	return accountID, nil
}

func (s *PasswordResetService) MarkTokenUsed(ctx context.Context, rawToken string) error {
	tokenHash := s.hashToken(rawToken)
	_, err := s.db.Exec(ctx,
		`UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`,
		tokenHash)
	return err
}

func (s *PasswordResetService) hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
