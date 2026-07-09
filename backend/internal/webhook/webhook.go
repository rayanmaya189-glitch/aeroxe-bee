package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/models"
)

type Dispatcher struct {
	client *http.Client
	cfg    config.WebhookConfig
}

type DeliveryResult struct {
	StatusCode   int
	ResponseBody string
	Attempts     int
	Err          error
}

type Payload struct {
	Event           string                `json:"event"`
	MessageID       string                `json:"message_id"`
	Recipient       string                `json:"recipient"`
	Sender          string                `json:"sender"`
	MessageType     string                `json:"message_type"`
	DeliveryStatus  models.DeliveryStatus `json:"delivery_status"`
	ConfidenceScore float64               `json:"confidence_score"`
	Timestamp       time.Time             `json:"timestamp"`
}

func NewDispatcher(cfg config.WebhookConfig) *Dispatcher {
	return &Dispatcher{
		client: &http.Client{
			Timeout: cfg.DeliveryTimeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     30 * time.Second,
			},
		},
		cfg: cfg,
	}
}

func (d *Dispatcher) Dispatch(ctx context.Context, webhook models.Webhook, payload Payload) DeliveryResult {
	body, err := json.Marshal(payload)
	if err != nil {
		return DeliveryResult{Err: fmt.Errorf("marshal payload: %w", err)}
	}

	signature := SignPayload(body, webhook.Secret)

	req, err := http.NewRequestWithContext(ctx, "POST", webhook.URL, bytes.NewReader(body))
	if err != nil {
		return DeliveryResult{Err: fmt.Errorf("create request: %w", err)}
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", fmt.Sprintf("%d", time.Now().Unix()))
	req.Header.Set("User-Agent", "AeroXeBee-Webhook/1.0")

	resp, err := d.client.Do(req)
	if err != nil {
		return DeliveryResult{Err: fmt.Errorf("deliver webhook: %w", err)}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	result := DeliveryResult{
		StatusCode:   resp.StatusCode,
		ResponseBody: string(respBody),
	}

	if resp.StatusCode >= 300 {
		result.Err = fmt.Errorf("webhook returned %d: %s", resp.StatusCode, string(respBody))
	}

	return result
}

// DispatchWithRetry dispatches the webhook and returns the result with the attempt count.
// The caller is responsible for persisting the result and scheduling retries.
func (d *Dispatcher) DispatchWithRetry(ctx context.Context, webhook models.Webhook, payload Payload, previousAttempts int) DeliveryResult {
	result := d.Dispatch(ctx, webhook, payload)
	result.Attempts = previousAttempts + 1
	return result
}

// DispatchTest sends a test payload to the webhook endpoint and returns the result.
func (d *Dispatcher) DispatchTest(ctx context.Context, webhook models.Webhook) DeliveryResult {
	payload := Payload{
		Event:           "test.ping",
		MessageID:       "test-" + fmt.Sprintf("%d", time.Now().UnixNano()),
		Recipient:       "+1234567890",
		Sender:          "TestSender",
		MessageType:     "test",
		DeliveryStatus:  models.DeliveryStatusSent,
		ConfidenceScore: 1.0,
		Timestamp:       time.Now(),
	}
	return d.Dispatch(ctx, webhook, payload)
}

// ComputeBackoff returns the backoff duration for the given attempt number (1-based).
func (d *Dispatcher) ComputeBackoff(attempt int) time.Duration {
	backoff := d.cfg.BaseBackoff * (1 << (attempt - 1))
	if backoff > d.cfg.MaxBackoff {
		backoff = d.cfg.MaxBackoff
	}
	return backoff
}

// Cfg returns a copy of the dispatcher's configuration.
func (d *Dispatcher) Cfg() config.WebhookConfig {
	return d.cfg
}

func SignPayload(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func VerifySignature(payload []byte, secret string, signature string) bool {
	expected := SignPayload(payload, secret)
	return hmac.Equal([]byte(expected), []byte(signature))
}
