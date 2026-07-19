package fraud

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

type Detector struct {
	client        *redis.ClusterClient
	flags         []models.FraudFlag
	contentFilter *ContentFilter
	mu            sync.RWMutex
}

func NewDetector(client *redis.ClusterClient) *Detector {
	return &Detector{
		client:        client,
		flags:         make([]models.FraudFlag, 0),
		contentFilter: NewContentFilter(),
	}
}

type DetectionInput struct {
	AccountID   string
	DeviceID    string
	Recipient   string
	Sender      string
	Message     string
	MessageType models.MessageType
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

// GetAllFlags returns all fraud flags, optionally filtered by content-type prefix.
// When contentOnly is true, only flags whose FlagType starts with "sensitive content detected:" are returned.
// GetSmishingFlagsPendingCount returns the count of unreviewed content-based fraud flags.
func (d *Detector) GetSmishingFlagsPendingCount(ctx context.Context) int {
	d.mu.RLock()
	defer d.mu.RUnlock()
	count := 0
	for _, f := range d.flags {
		if !f.Reviewed && strings.HasPrefix(f.FlagType, "sensitive content detected:") {
			count++
		}
	}
	return count
}

func (d *Detector) GetAllFlags(ctx context.Context, contentOnly bool) []models.FraudFlag {
	d.mu.RLock()
	defer d.mu.RUnlock()
	if !contentOnly {
		result := make([]models.FraudFlag, len(d.flags))
		copy(result, d.flags)
		return result
	}
	var filtered []models.FraudFlag
	for _, f := range d.flags {
		if strings.HasPrefix(f.FlagType, "sensitive content detected:") {
			filtered = append(filtered, f)
		}
	}
	return filtered
}

// BulkReview marks multiple flags as reviewed.
func (d *Detector) BulkReview(ctx context.Context, flagIDs []string) int {
	d.mu.Lock()
	defer d.mu.Unlock()
	ids := make(map[string]struct{}, len(flagIDs))
	for _, id := range flagIDs {
		ids[id] = struct{}{}
	}
	count := 0
	now := time.Now()
	for i, f := range d.flags {
		if _, ok := ids[f.ID]; ok && !f.Reviewed {
			d.flags[i].Reviewed = true
			d.flags[i].ReviewedAt = &now
			count++
		}
	}
	return count
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

	// Content filter: check message body and sender for sensitive content
	if contentResult := d.CheckSensitiveContent(input); contentResult.Flagged {
		return contentResult
	}

	return &DetectionResult{Flagged: false}
}

// CheckSensitiveContent scans the message body, sender, and recipient for prohibited content.
func (d *Detector) CheckSensitiveContent(input DetectionInput) *DetectionResult {
	blocked, violations := d.contentFilter.Scan(input.Message, input.Sender, input.Recipient)
	if !blocked || len(violations) == 0 {
		return &DetectionResult{Flagged: false}
	}

	// Use the highest-weight violation as the reason
	maxWeight := 0.0
	worstCategory := violations[0].Category
	for _, v := range violations {
		if v.Weight > maxWeight {
			maxWeight = v.Weight
			worstCategory = v.Category
		}
	}

	return &DetectionResult{
		Flagged: true,
		Reason:  fmt.Sprintf("sensitive content detected: %s (%d violations)", worstCategory, len(violations)),
		Weight:  maxWeight,
	}
}

func (d *Detector) String() string {
	return "FraudDetector{pattern+velocity based}"
}
