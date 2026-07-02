package ratecontrol

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/textbee/backend/internal/config"
)

type Manager struct {
	client      *redis.Client
	devicePerMin int
	devicePerHour int
	pacingMin   time.Duration
	pacingMax   time.Duration
	mu          sync.Mutex
}

func NewManager(client *redis.Client, cfg config.RateLimitConfig) *Manager {
	return &Manager{
		client:       client,
		devicePerMin: cfg.DeviceMaxPerMinute,
		devicePerHour: cfg.DeviceMaxPerHour,
		pacingMin:    cfg.SendPacingMin,
		pacingMax:    cfg.SendPacingMax,
	}
}

func (m *Manager) CheckDeviceRate(ctx context.Context, deviceID string) (bool, error) {
	minKey := fmt.Sprintf("rate:device:min:%s:%d", deviceID, time.Now().Truncate(time.Minute).Unix())
	hourKey := fmt.Sprintf("rate:device:hr:%s:%d", deviceID, time.Now().Truncate(time.Hour).Unix())

	minCount, err := m.client.Get(ctx, minKey).Int()
	if err == redis.Nil {
		minCount = 0
	} else if err != nil {
		return false, err
	}

	hourCount, err := m.client.Get(ctx, hourKey).Int()
	if err == redis.Nil {
		hourCount = 0
	} else if err != nil {
		return false, err
	}

	return minCount < m.devicePerMin && hourCount < m.devicePerHour, nil
}

func (m *Manager) IncrementDeviceCounters(ctx context.Context, deviceID string) error {
	pipe := m.client.Pipeline()

	minKey := fmt.Sprintf("rate:device:min:%s:%d", deviceID, time.Now().Truncate(time.Minute).Unix())
	pipe.Incr(ctx, minKey)
	pipe.Expire(ctx, minKey, 2*time.Minute)

	hourKey := fmt.Sprintf("rate:device:hr:%s:%d", deviceID, time.Now().Truncate(time.Hour).Unix())
	pipe.Incr(ctx, hourKey)
	pipe.Expire(ctx, hourKey, 2*time.Hour)

	_, err := pipe.Exec(ctx)
	return err
}

func (m *Manager) GetSendPacing() time.Duration {
	pacing := m.pacingMin + time.Duration(rand.Int63n(int64(m.pacingMax-m.pacingMin)))
	return pacing
}

func (m *Manager) CheckGlobalThrottle(ctx context.Context, scope, scopeValue string) (bool, error) {
	key := fmt.Sprintf("throttle:global:%s:%s", scope, scopeValue)
	count, err := m.client.Get(ctx, key).Int()
	if err == redis.Nil {
		return true, nil
	} else if err != nil {
		return false, err
	}
	maxLimit := 1000
	if scope == "country" {
		maxLimit = 5000
	} else if scope == "carrier" {
		maxLimit = 3000
	} else if scope == "prefix" {
		maxLimit = 1000
	}
	return count < maxLimit, nil
}

func (m *Manager) IncrementGlobalThrottle(ctx context.Context, scope, scopeValue string) error {
	key := fmt.Sprintf("throttle:global:%s:%s", scope, scopeValue)
	pipe := m.client.Pipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}
