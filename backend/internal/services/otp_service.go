package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

var (
	ErrOTPNotFound      = errors.New("no OTP found or expired")
	ErrOTPAccountLocked = errors.New("account locked due to too many attempts")
)

type OTPService struct {
	redis *redis.ClusterClient
	pg    DatabaseQuerier
	cfg   config.OTPConfig
}

func NewOTPService(redis *redis.ClusterClient, pg DatabaseQuerier, cfg config.OTPConfig) *OTPService {
	return &OTPService{redis: redis, pg: pg, cfg: cfg}
}

func (s *OTPService) GenerateCode(length int) (string, error) {
	if length <= 0 {
		length = s.cfg.CodeLength
	}
	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(length)), nil)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	format := fmt.Sprintf("%%0%dd", length)
	return fmt.Sprintf(format, n), nil
}

func (s *OTPService) StoreCode(ctx context.Context, phone string, code string, messageID string) error {
	key := fmt.Sprintf("otp:%s", phone)
	pipe := s.redis.Pipeline()

	codeHash := s.hashCode(code)
	pipe.Set(ctx, key, codeHash, s.cfg.TTL)

	metaKey := fmt.Sprintf("otp:attempts:%s", phone)
	pipe.Set(ctx, metaKey, 0, s.cfg.TTL)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return err
	}

	_, err = s.pg.Exec(ctx,
		`INSERT INTO otp_metadata (message_id, phone, verified, attempts, created_at, expires_at)
		 VALUES ($1, $2, false, 0, NOW(), $3)
		 ON CONFLICT (message_id) DO NOTHING`,
		messageID, phone, time.Now().Add(s.cfg.TTL))
	return err
}

func (s *OTPService) VerifyCode(ctx context.Context, phone string, code string) (bool, error) {
	key := fmt.Sprintf("otp:%s", phone)
	lockoutKey := fmt.Sprintf("otp:lockout:%s", phone)

	locked, err := s.redis.Exists(ctx, lockoutKey).Result()
	if err != nil {
		return false, err
	}
	if locked > 0 {
		return false, ErrOTPAccountLocked
	}

	storedHash, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, ErrOTPNotFound
	} else if err != nil {
		return false, err
	}

	if s.hashCode(code) != storedHash {
		attemptKey := fmt.Sprintf("otp:attempts:%s", phone)
		attempts, err := s.redis.Incr(ctx, attemptKey).Result()
		if err != nil {
			return false, err
		}

		if attempts >= int64(s.cfg.MaxAttempts) {
			s.redis.Set(ctx, lockoutKey, 1, s.cfg.LockoutTTL)
			s.redis.Del(ctx, key)
		}
		return false, nil
	}

	s.redis.Del(ctx, key)
	s.redis.Del(ctx, fmt.Sprintf("otp:attempts:%s", phone))

	_, err = s.pg.Exec(ctx,
		`UPDATE otp_metadata SET verified=true, attempts=$1 WHERE phone=$2 AND verified=false`,
		0, phone)
	return true, err
}

func (s *OTPService) MarkAttempt(ctx context.Context, phone string) error {
	_, err := s.pg.Exec(ctx,
		`UPDATE otp_metadata SET attempts = attempts + 1 WHERE phone = $1`, phone)
	return err
}

func (s *OTPService) GetMetadata(ctx context.Context, messageID string) (*models.OTPMetadata, error) {
	meta := &models.OTPMetadata{}
	err := s.pg.QueryRow(ctx,
		`SELECT message_id, phone, verified, attempts, created_at, expires_at
		 FROM otp_metadata WHERE message_id = $1`, messageID,
	).Scan(&meta.MessageID, &meta.Phone, &meta.Verified, &meta.Attempts, &meta.CreatedAt, &meta.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return meta, nil
}

func (s *OTPService) IsVerified(ctx context.Context, messageID string) (bool, error) {
	meta, err := s.GetMetadata(ctx, messageID)
	if err != nil {
		return false, err
	}
	return meta.Verified, nil
}

func (s *OTPService) hashCode(code string) string {
	mac := hmac.New(sha256.New, []byte("otp-hash-key"))
	mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

func (s *OTPService) Cleanup(ctx context.Context) error {
	_, err := s.pg.Exec(ctx,
		`DELETE FROM otp_metadata WHERE expires_at < NOW()`)
	return err
}
