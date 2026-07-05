package fraud

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/aeroxe-bee/backend/internal/models"
)

type Detector struct {
	client         *redis.Client
	flags          []models.FraudFlag
	mu             sync.RWMutex
}

func NewDetector(client *redis.Client) *Detector {
	return &Detector{
		client: client,
		flags:  make([]models.FraudFlag, 0),
	}
}

type DetectionInput struct {
	AccountID      string
	DeviceID       string
	Recipient      string
	MessageType    models.MessageType
}

type DetectionResult struct {
	Flagged bool
	Reason  string
	Weight  float64
}

func (d *Detector) CheckOTPSpam(ctx context.Context, input DetectionInput) (*DetectionResult, error) {
	hourKey := fmt.Sprintf("fraud:otp:account:%s:hour:%d", input.AccountID, time.Now().Truncate(time.Hour).Unix())
	ipDistinctKey := fmt.Sprintf("fraud:otp:account:%s:recipients:%d", input.AccountID, time.Now().Truncate(10*time.Minute).Unix())

	pipe := d.client.Pipeline()
	pipe.Incr(ctx, hourKey)
	pipe.Expire(ctx, hourKey, 2*time.Hour)
	pipe.SAdd(ctx, ipDistinctKey, input.Recipient)
	pipe.Expire(ctx, ipDistinctKey, 15*time.Minute)
	cmds, err := pipe.Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("fraud check: %w", err)
	}

	hourCount := cmds[0].(*redis.IntCmd).Val()
	distinctCount := d.client.SCard(ctx, ipDistinctKey).Val()

	if hourCount > 1000 {
		return &DetectionResult{Flagged: true, Reason: "OTP spam detected: >1000/hr", Weight: 0.8}, nil
	}
	if distinctCount > 500 {
		return &DetectionResult{Flagged: true, Reason: "OTP spam detected: >500 distinct recipients in 10min", Weight: 0.7}, nil
	}

	return &DetectionResult{Flagged: false}, nil
}

func (d *Detector) CheckVelocityAnomaly(ctx context.Context, accountID string, currentRate float64) (*DetectionResult, error) {
	baselineKey := fmt.Sprintf("fraud:baseline:account:%s", accountID)

	baselineStr, err := d.client.Get(ctx, baselineKey).Result()
	if err == redis.Nil {
		d.client.Set(ctx, baselineKey, currentRate, 24*time.Hour)
		return &DetectionResult{Flagged: false}, nil
	} else if err != nil {
		return nil, err
	}

	var baseline float64
	if _, err := fmt.Sscanf(baselineStr, "%f", &baseline); err != nil {
		baseline = 0
	}

	if baseline > 0 && currentRate > baseline*3 {
		return &DetectionResult{
			Flagged: true,
			Reason:  fmt.Sprintf("Velocity anomaly: current rate %.0f is %.0fx baseline %.0f", currentRate, currentRate/baseline, baseline),
			Weight:  0.6,
		}, nil
	}

	return &DetectionResult{Flagged: false}, nil
}

func (d *Detector) CheckRecipientBlacklist(ctx context.Context, recipient string) (*DetectionResult, error) {
	exists, err := d.client.SIsMember(ctx, "blacklist:recipients", recipient).Result()
	if err != nil {
		return nil, err
	}
	if exists {
		return &DetectionResult{Flagged: true, Reason: "Recipient is blacklisted", Weight: 1.0}, nil
	}
	return &DetectionResult{Flagged: false}, nil
}

func (d *Detector) AddFraudFlag(ctx context.Context, flag models.FraudFlag) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.flags = append(d.flags, flag)
}

func (d *Detector) GetPendingFlags(ctx context.Context) []models.FraudFlag {
	d.mu.RLock()
	defer d.mu.RUnlock()
	var pending []models.FraudFlag
	for _, f := range d.flags {
		if !f.Reviewed {
			pending = append(pending, f)
		}
	}
	return pending
}

func (d *Detector) MarkReviewed(ctx context.Context, flagID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	for i, f := range d.flags {
		if f.ID == flagID {
			d.flags[i].Reviewed = true
			now := time.Now()
			d.flags[i].ReviewedAt = &now
			return nil
		}
	}
	return fmt.Errorf("flag not found: %s", flagID)
}

func (d *Detector) Analyze(ctx context.Context, input DetectionInput) *DetectionResult {
	otpResult, err := d.CheckOTPSpam(ctx, input)
	if err == nil && otpResult != nil && otpResult.Flagged {
		return otpResult
	}

	blacklistResult, err := d.CheckRecipientBlacklist(ctx, input.Recipient)
	if err == nil && blacklistResult != nil && blacklistResult.Flagged {
		return blacklistResult
	}

	velocityResult, err := d.CheckVelocityAnomaly(ctx, input.AccountID, 0)
	if err == nil && velocityResult != nil && velocityResult.Flagged {
		return velocityResult
	}

	return &DetectionResult{Flagged: false}
}

func (d *Detector) String() string {
	return "FraudDetector{pattern+velocity based}"
}
