package services

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/textbee/backend/internal/models"
)

type SessionService struct {
	pool *pgxpool.Pool
}

func NewSessionService(pool *pgxpool.Pool) *SessionService {
	return &SessionService{pool: pool}
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}

// Create records a new login session.
func (s *SessionService) Create(ctx context.Context, userID, userType, ipAddress, userAgent, token string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO user_sessions (user_id, user_type, ip_address, user_agent, token_hash)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, userType, ipAddress, userAgent, hashToken(token),
	)
	return err
}

// ListActive returns all non-revoked sessions for a user, most recent first.
func (s *SessionService) ListActive(ctx context.Context, userID, userType string) ([]models.UserSession, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, user_id, user_type, ip_address, user_agent, token_hash, last_active, created_at, revoked_at
		 FROM user_sessions
		 WHERE user_id = $1 AND user_type = $2 AND revoked_at IS NULL
		 ORDER BY last_active DESC`,
		userID, userType,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.UserSession
	for rows.Next() {
		var sess models.UserSession
		if err := rows.Scan(&sess.ID, &sess.UserID, &sess.UserType, &sess.IPAddress, &sess.UserAgent, &sess.TokenHash, &sess.LastActive, &sess.CreatedAt, &sess.RevokedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

// Revoke marks a single session as revoked.
func (s *SessionService) Revoke(ctx context.Context, sessionID, userID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE user_sessions SET revoked_at = $1 WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`,
		time.Now(), sessionID, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("session not found or already revoked")
	}
	return nil
}

// RevokeAll revokes all active sessions for a user except the current one.
func (s *SessionService) RevokeAll(ctx context.Context, userID, userType, currentTokenHash string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE user_sessions SET revoked_at = $1
		 WHERE user_id = $2 AND user_type = $3 AND revoked_at IS NULL AND token_hash != $4`,
		time.Now(), userID, userType, currentTokenHash,
	)
	return err
}

// HashToken exposes the token hashing logic for callers that need to identify the current session.
func (s *SessionService) HashToken(token string) string {
	return hashToken(token)
}
