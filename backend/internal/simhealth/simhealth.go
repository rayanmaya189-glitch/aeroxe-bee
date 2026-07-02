package simhealth

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/textbee/backend/internal/config"
	"github.com/textbee/backend/internal/models"
)

type Engine struct {
	cfg          config.SIMHealthConfig
	deliveryHistory map[string][]deliverySample
	mu           sync.RWMutex
}

type deliverySample struct {
	Timestamp time.Time
	Success   bool
}

func NewEngine(cfg config.SIMHealthConfig) *Engine {
	return &Engine{
		cfg:             cfg,
		deliveryHistory: make(map[string][]deliverySample),
	}
}

func (e *Engine) RecordDelivery(deviceID string, success bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.deliveryHistory[deviceID] = append(e.deliveryHistory[deviceID], deliverySample{
		Timestamp: time.Now(),
		Success:   success,
	})
}

func (e *Engine) EvaluateDevice(deviceID string, currentStatus models.SIMHealthStatus, _ float64) (models.SIMHealthStatus, float64) {
	e.mu.RLock()
	samples := e.deliveryHistory[deviceID]
	e.mu.RUnlock()

	recentSamples := e.filterByDuration(samples, e.cfg.WindowDuration)
	trendSamples := e.filterByDuration(samples, e.cfg.TrendWindowDuration)

	shortRate := e.calculateRate(recentSamples)
	trendSlope := e.calculateTrend(trendSamples)

	newStatus := currentStatus

	if shortRate < e.cfg.BlockedThreshold {
		newStatus = models.SIMHealthBlocked
	} else if shortRate < e.cfg.DegradedThreshold {
		newStatus = models.SIMHealthDegraded
	}

	return newStatus, trendSlope
}

func (e *Engine) filterByDuration(samples []deliverySample, duration time.Duration) []deliverySample {
	cutoff := time.Now().Add(-duration)
	var filtered []deliverySample
	for _, s := range samples {
		if s.Timestamp.After(cutoff) {
			filtered = append(filtered, s)
		}
	}
	return filtered
}

func (e *Engine) calculateRate(samples []deliverySample) float64 {
	if len(samples) == 0 {
		return 1.0
	}
	successes := 0
	for _, s := range samples {
		if s.Success {
			successes++
		}
	}
	return float64(successes) / float64(len(samples))
}

func (e *Engine) calculateTrend(samples []deliverySample) float64 {
	if len(samples) < 10 {
		return 0
	}

	windowSamples := 20
	if len(samples) < windowSamples {
		windowSamples = len(samples)
	}
	samples = samples[len(samples)-windowSamples:]

	n := float64(len(samples))
	sumX := 0.0
	sumY := 0.0
	sumXY := 0.0
	sumX2 := 0.0

	for i, s := range samples {
		x := float64(i)
		y := 1.0
		if !s.Success {
			y = 0.0
		}
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
	return slope
}

func (e *Engine) GetDeliveryRate(ctx context.Context, deviceID string) (float64, int, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	samples := e.filterByDuration(e.deliveryHistory[deviceID], e.cfg.WindowDuration)
	if len(samples) == 0 {
		return 0, 0, nil
	}
	rate := e.calculateRate(samples)
	return rate, len(samples), nil
}

func (e *Engine) Cleanup() {
	e.mu.Lock()
	defer e.mu.Unlock()

	cutoff := time.Now().Add(-e.cfg.TrendWindowDuration)
	for deviceID, samples := range e.deliveryHistory {
		var filtered []deliverySample
		for _, s := range samples {
			if s.Timestamp.After(cutoff) {
				filtered = append(filtered, s)
			}
		}
		if len(filtered) == 0 {
			delete(e.deliveryHistory, deviceID)
		} else {
			e.deliveryHistory[deviceID] = filtered
		}
	}
}

func (e *Engine) StatusString(status models.SIMHealthStatus) string {
	switch status {
	case models.SIMHealthHealthy:
		return "HEALTHY"
	case models.SIMHealthDegraded:
		return "DEGRADED"
	case models.SIMHealthBlocked:
		return "BLOCKED"
	default:
		return "UNKNOWN"
	}
}

func (e *Engine) WeightReductionFactor(status models.SIMHealthStatus, trendSlope float64) float64 {
	switch status {
	case models.SIMHealthBlocked:
		return 1.0
	case models.SIMHealthDegraded:
		return 0.7
	default:
		if trendSlope < e.cfg.TrendSlopeThreshold {
			severity := math.Abs(trendSlope) / math.Abs(e.cfg.TrendSlopeThreshold)
			if severity > 1.0 {
				severity = 1.0
			}
			return 0.3 * severity
		}
		return 0.0
	}
}

func (e *Engine) String() string {
	return fmt.Sprintf("SIMHealthEngine{degraded=%.0f%%, blocked=%.0f%%, trend_window=%v}",
		e.cfg.DegradedThreshold*100, e.cfg.BlockedThreshold*100, e.cfg.TrendWindowDuration)
}
