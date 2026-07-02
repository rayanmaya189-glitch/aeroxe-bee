package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type TwoFAService struct {
	db DatabaseQuerier
}

func NewTwoFAService(db DatabaseQuerier) *TwoFAService {
	return &TwoFAService{db: db}
}

type TwoFASecret struct {
	ID        string
	UserID    *string
	AccountID *string
	Secret    string
	Enabled   bool
	EnabledAt *time.Time
	CreatedAt time.Time
}

func (s *TwoFAService) GetByID(ctx context.Context, id string) (*TwoFASecret, error) {
	secret := &TwoFASecret{}
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, secret, enabled, enabled_at, created_at
		 FROM two_factor_secrets WHERE id = $1`, id,
	).Scan(&secret.ID, &secret.UserID, &secret.AccountID, &secret.Secret,
		&secret.Enabled, &secret.EnabledAt, &secret.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return secret, err
}

func (s *TwoFAService) GetByUserID(ctx context.Context, userID string) (*TwoFASecret, error) {
	secret := &TwoFASecret{}
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, secret, enabled, enabled_at, created_at
		 FROM two_factor_secrets WHERE user_id = $1`, userID,
	).Scan(&secret.ID, &secret.UserID, &secret.AccountID, &secret.Secret,
		&secret.Enabled, &secret.EnabledAt, &secret.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return secret, err
}

func (s *TwoFAService) GetByAccountID(ctx context.Context, accountID string) (*TwoFASecret, error) {
	secret := &TwoFASecret{}
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, secret, enabled, enabled_at, created_at
		 FROM two_factor_secrets WHERE account_id = $1`, accountID,
	).Scan(&secret.ID, &secret.UserID, &secret.AccountID, &secret.Secret,
		&secret.Enabled, &secret.EnabledAt, &secret.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return secret, err
}

func (s *TwoFAService) GenerateSecret() string {
	b := make([]byte, 20)
	for i := range b {
		b[i] = byte(time.Now().UnixNano()>>uint(i*3)) & 0xFF
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func (s *TwoFAService) Create(ctx context.Context, userID, accountID string) (*TwoFASecret, error) {
	var uid, aid *string
	if userID != "" {
		uid = &userID
	}
	if accountID != "" {
		aid = &accountID
	}

	secret := s.GenerateSecret()
	id := uuid.New().String()

	_, err := s.db.Exec(ctx,
		`INSERT INTO two_factor_secrets (id, user_id, account_id, secret, enabled)
		 VALUES ($1, $2, $3, $4, FALSE)`, id, uid, aid, secret)
	if err != nil {
		return nil, err
	}

	return s.GetByID(ctx, id)
}

func (s *TwoFAService) Enable(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE two_factor_secrets SET enabled = TRUE, enabled_at = $2 WHERE id = $1`, id, now)
	return err
}

func (s *TwoFAService) Disable(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE two_factor_secrets SET enabled = FALSE, enabled_at = NULL WHERE id = $1`, id)
	return err
}

func (s *TwoFAService) IsEnabled(ctx context.Context, userID, accountID string) bool {
	if userID != "" {
		sec, err := s.GetByUserID(ctx, userID)
		return err == nil && sec != nil && sec.Enabled
	}
	if accountID != "" {
		sec, err := s.GetByAccountID(ctx, accountID)
		return err == nil && sec != nil && sec.Enabled
	}
	return false
}

func (s *TwoFAService) GetTOTPURL(secret, issuer, account string) string {
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=6&period=30",
		issuer, account, secret, issuer)
}

func (s *TwoFAService) VerifyCode(ctx context.Context, id string, code string) (bool, error) {
	sec, err := s.GetByID(ctx, id)
	if err != nil {
		return false, err
	}
	if sec == nil || !sec.Enabled {
		return false, nil
	}
	return s.VerifyTOTP(sec.Secret, code), nil
}

func (s *TwoFAService) VerifyTOTP(secret string, code string) bool {
	now := time.Now().Unix()
	for i := -1; i <= 1; i++ {
		t := now/30 + int64(i)
		if s.generateCode(secret, t) == code {
			return true
		}
	}
	return false
}

func (s *TwoFAService) generateCode(secret string, t int64) string {
	key, _ := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(secret))
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(t))

	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0F
	code := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7FFFFFFF
	code = code % uint32(math.Pow10(6))

	return fmt.Sprintf("%06d", code)
}
