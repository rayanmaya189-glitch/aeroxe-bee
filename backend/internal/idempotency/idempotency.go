package idempotency

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Store struct {
	client *redis.Client
	ttl    time.Duration
}

type Result struct {
	MessageID string `json:"message_id"`
	Status    string `json:"status"`
}

func NewStore(client *redis.Client, ttl time.Duration) *Store {
	return &Store{client: client, ttl: ttl}
}

func (s *Store) CheckAndSet(ctx context.Context, key string, messageID string) (*Result, bool, error) {
	redisKey := fmt.Sprintf("idempotency:%s", key)

	existing, err := s.client.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		pipe := s.client.Pipeline()
		pipe.Set(ctx, redisKey, messageID, s.ttl)
		pipe.Expire(ctx, redisKey, s.ttl)
		if _, err := pipe.Exec(ctx); err != nil {
			return nil, false, fmt.Errorf("set idempotency key: %w", err)
		}
		return nil, false, nil
	} else if err != nil {
		return nil, false, fmt.Errorf("check idempotency key: %w", err)
	}

	return &Result{MessageID: existing, Status: "duplicate"}, true, nil
}

func (s *Store) Get(ctx context.Context, key string) (*Result, error) {
	redisKey := fmt.Sprintf("idempotency:%s", key)
	val, err := s.client.Get(ctx, redisKey).Result()
	if err == redis.Nil {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get idempotency key: %w", err)
	}
	return &Result{MessageID: val, Status: "exists"}, nil
}

func (s *Store) Delete(ctx context.Context, key string) error {
	return s.client.Del(ctx, fmt.Sprintf("idempotency:%s", key)).Err()
}
