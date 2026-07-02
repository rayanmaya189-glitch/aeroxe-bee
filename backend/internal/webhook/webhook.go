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
	"sync"
	"time"

	"github.com/textbee/backend/internal/config"
	"github.com/textbee/backend/internal/models"
)

type Dispatcher struct {
	client     *http.Client
	cfg        config.WebhookConfig
	deliveries map[string]*deliveryState
	mu         sync.Mutex
}

type deliveryState struct {
	WebhookID    string
	MessageID    string
	Attempts     int
	LastStatus   string
	LastAttempt  time.Time
	NextRetry    time.Time
	Completed    bool
}

type Payload struct {
	Event           string                  `json:"event"`
	MessageID       string                  `json:"message_id"`
	Recipient       string                  `json:"recipient"`
	Sender          string                  `json:"sender"`
	MessageType     string                  `json:"message_type"`
	DeliveryStatus  models.DeliveryStatus   `json:"delivery_status"`
	ConfidenceScore float64                 `json:"confidence_score"`
	Timestamp       time.Time               `json:"timestamp"`
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
		cfg:        cfg,
		deliveries: make(map[string]*deliveryState),
	}
}

func (d *Dispatcher) Dispatch(ctx context.Context, webhook models.Webhook, payload Payload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	signature := SignPayload(body, webhook.Secret)

	req, err := http.NewRequestWithContext(ctx, "POST", webhook.URL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature", signature)
	req.Header.Set("X-Timestamp", fmt.Sprintf("%d", time.Now().Unix()))
	req.Header.Set("User-Agent", "TextBee-Webhook/1.0")

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("deliver webhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("webhook returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

func (d *Dispatcher) DispatchWithRetry(ctx context.Context, webhook models.Webhook, payload Payload) *deliveryState {
	d.mu.Lock()
	key := fmt.Sprintf("%s:%s", webhook.ID, payload.MessageID)
	state, exists := d.deliveries[key]
	if !exists {
		state = &deliveryState{
			WebhookID:  webhook.ID,
			MessageID:  payload.MessageID,
			NextRetry:  time.Now(),
		}
		d.deliveries[key] = state
	}
	d.mu.Unlock()

	err := d.Dispatch(ctx, webhook, payload)
	state.LastAttempt = time.Now()

	if err != nil {
		state.Attempts++
		state.LastStatus = fmt.Sprintf("failed: %v", err)
		if state.Attempts < d.cfg.MaxAttempts {
			backoff := d.cfg.BaseBackoff * (1 << (state.Attempts - 1))
			if backoff > d.cfg.MaxBackoff {
				backoff = d.cfg.MaxBackoff
			}
			state.NextRetry = time.Now().Add(backoff)
		} else {
			state.Completed = true
			state.LastStatus = "dead_letter"
		}
	} else {
		state.Completed = true
		state.LastStatus = "delivered"
	}

	return state
}

func (d *Dispatcher) GetState(webhookID, messageID string) *deliveryState {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.deliveries[fmt.Sprintf("%s:%s", webhookID, messageID)]
}

func (d *Dispatcher) RetryDeadLetters(ctx context.Context, webhook models.Webhook, payload Payload) error {
	return d.Dispatch(ctx, webhook, payload)
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
