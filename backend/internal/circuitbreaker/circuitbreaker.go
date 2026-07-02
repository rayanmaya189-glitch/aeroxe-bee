package circuitbreaker

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/textbee/backend/internal/config"
	"github.com/textbee/backend/internal/models"
)

type StateManager struct {
	client          *redis.Client
	cfg             config.CircuitBreakerConfig
	state           map[string]*circuitState
	mu              sync.RWMutex
}

type circuitState struct {
	Scope           models.CircuitBreakerScope
	ScopeValue      string
	State           models.CircuitBreakerState
	FailureCount    int
	SuccessCount    int
	LastStateChange time.Time
	CooldownUntil   time.Time
	HalfOpenTrial   int
	Reason          string
}

func NewStateManager(client *redis.Client, cfg config.CircuitBreakerConfig) *StateManager {
	return &StateManager{
		client: client,
		cfg:    cfg,
		state:  make(map[string]*circuitState),
	}
}

func keyCB(scope models.CircuitBreakerScope, scopeValue string) string {
	return fmt.Sprintf("cb:%s:%s", scope, scopeValue)
}

func (sm *StateManager) getOrCreateState(scope models.CircuitBreakerScope, scopeValue string) *circuitState {
	k := keyCB(scope, scopeValue)
	cs, ok := sm.state[k]
	if !ok {
		cs = &circuitState{
			Scope:      scope,
			ScopeValue: scopeValue,
			State:      models.CBStateClosed,
		}
		sm.state[k] = cs
	}
	return cs
}

func (sm *StateManager) RecordFailure(ctx context.Context, scope models.CircuitBreakerScope, scopeValue string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	cs := sm.getOrCreateState(scope, scopeValue)
	cs.FailureCount++

	if cs.State == models.CBStateHalfOpen {
		cs.SuccessCount = 0
		cs.State = models.CBStateOpen
		cs.LastStateChange = time.Now()
		cs.CooldownUntil = time.Now().Add(sm.cooldownFor(scope))
		cs.Reason = fmt.Sprintf("half-open trial failure #%d", cs.FailureCount)
		return sm.persistStateNoLock(ctx, cs)
	}

	threshold := sm.failureThreshold(scope)
	total := cs.FailureCount + cs.SuccessCount
	if total == 0 {
		total = 1
	}
	failureRate := float64(cs.FailureCount) / float64(total)

	if failureRate > threshold {
		cs.State = models.CBStateOpen
		cs.LastStateChange = time.Now()
		cs.CooldownUntil = time.Now().Add(sm.cooldownFor(scope))
		cs.Reason = fmt.Sprintf("failure rate %.2f > threshold %.2f (%d failures)", failureRate, threshold, cs.FailureCount)
		return sm.persistStateNoLock(ctx, cs)
	}

	return sm.persistStateNoLock(ctx, cs)
}

func (sm *StateManager) RecordSuccess(ctx context.Context, scope models.CircuitBreakerScope, scopeValue string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	cs := sm.getOrCreateState(scope, scopeValue)

	if cs.State == models.CBStateOpen {
		return nil
	}

	cs.SuccessCount++

	if cs.State == models.CBStateHalfOpen {
		cs.HalfOpenTrial++
		if cs.HalfOpenTrial >= sm.halfOpenSuccessesFor(scope) {
			cs.State = models.CBStateClosed
			cs.LastStateChange = time.Now()
			cs.FailureCount = 0
			cs.SuccessCount = 0
			cs.HalfOpenTrial = 0
			cs.Reason = "half-open trial passed, circuit closed"
			return sm.persistStateNoLock(ctx, cs)
		}
	}

	return sm.persistStateNoLock(ctx, cs)
}

func (sm *StateManager) GetState(ctx context.Context, scope models.CircuitBreakerScope, scopeValue string) models.CircuitBreakerState {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	cs := sm.getOrCreateState(scope, scopeValue)

	if cs.State == models.CBStateOpen && time.Now().After(cs.CooldownUntil) {
		cs.State = models.CBStateHalfOpen
		cs.HalfOpenTrial = 0
		cs.LastStateChange = time.Now()
		cs.Reason = "cooldown expired, entering half-open"
		sm.persistStateNoLock(ctx, cs)
		return models.CBStateHalfOpen
	}

	return cs.State
}

func (sm *StateManager) IsOpen(ctx context.Context, scope models.CircuitBreakerScope, scopeValue string) bool {
	return sm.GetState(ctx, scope, scopeValue) == models.CBStateOpen
}

func (sm *StateManager) GetAllStates(ctx context.Context) []models.CircuitBreakerEvent {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	events := make([]models.CircuitBreakerEvent, 0, len(sm.state))
	for _, cs := range sm.state {
		closedAt := cs.LastStateChange
		events = append(events, models.CircuitBreakerEvent{
			Scope:      cs.Scope,
			ScopeValue: cs.ScopeValue,
			State:      cs.State,
			OpenedAt:   cs.LastStateChange,
			ClosedAt:   &closedAt,
			Reason:     cs.Reason,
		})
	}
	return events
}

func (sm *StateManager) Reset(ctx context.Context, scope models.CircuitBreakerScope, scopeValue string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	delete(sm.state, keyCB(scope, scopeValue))
	return sm.client.Del(ctx, keyCB(scope, scopeValue)).Err()
}

func (sm *StateManager) persistStateNoLock(ctx context.Context, cs *circuitState) error {
	pipe := sm.client.Pipeline()
	k := keyCB(cs.Scope, cs.ScopeValue)
	pipe.HSet(ctx, k, map[string]interface{}{
		"state":             string(cs.State),
		"failure_count":     cs.FailureCount,
		"success_count":     cs.SuccessCount,
		"half_open_trial":   cs.HalfOpenTrial,
		"last_state_change": cs.LastStateChange.Unix(),
		"cooldown_until":    cs.CooldownUntil.Unix(),
		"reason":            cs.Reason,
	})
	pipe.Expire(ctx, k, 24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

func (sm *StateManager) persistState(ctx context.Context, cs *circuitState) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	return sm.persistStateNoLock(ctx, cs)
}

func (sm *StateManager) failureThreshold(scope models.CircuitBreakerScope) float64 {
	switch scope {
	case models.CBScopeDevice:
		return sm.cfg.DeviceFailureThreshold
	case models.CBScopeAccount:
		return sm.cfg.AccountFailureMultiplier * sm.cfg.DeviceFailureThreshold
	case models.CBScopeCarrier:
		return sm.cfg.CarrierFailureThreshold
	default:
		return 0.5
	}
}

func (sm *StateManager) cooldownFor(scope models.CircuitBreakerScope) time.Duration {
	switch scope {
	case models.CBScopeDevice:
		return sm.cfg.DeviceCooldownDuration
	case models.CBScopeAccount:
		return sm.cfg.AccountCooldownDuration
	case models.CBScopeCarrier:
		return sm.cfg.CarrierCooldownDuration
	default:
		return 2 * time.Minute
	}
}

func (sm *StateManager) halfOpenSuccessesFor(scope models.CircuitBreakerScope) int {
	switch scope {
	case models.CBScopeDevice:
		return sm.cfg.DeviceHalfOpenSuccesses
	default:
		return 3
	}
}

func (sm *StateManager) TrafficReductionFor(scope models.CircuitBreakerScope) float64 {
	if scope == models.CBScopeCarrier {
		return sm.cfg.CarrierTrafficReduction
	}
	return 0.5
}
