package database

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/aeroxe-bee/backend/internal/config"
)

type RedisDB struct {
	Client *redis.Client
}

func NewRedis(cfg config.RedisConfig) (*RedisDB, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:     cfg.Password,
		DB:           cfg.DB,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     100,
		MinIdleConns: 10,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &RedisDB{Client: client}, nil
}

func (r *RedisDB) Close() error {
	return r.Client.Close()
}

func (r *RedisDB) HealthCheck(ctx context.Context) error {
	return r.Client.Ping(ctx).Err()
}
