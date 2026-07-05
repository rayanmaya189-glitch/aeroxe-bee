package fcm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/oauth2/google"
)

// Sender sends push notifications via Firebase Cloud Messaging HTTP v1 API.
// When FCM returns UNREGISTERED (404) or INVALID_ARGUMENT (400) errors,
// it marks the token as invalid via the TokenInvalidator callback to
// prevent wasting resources on dead tokens.
type Sender struct {
	projectID   string
	serviceAcct string
	httpClient  *http.Client
	tokenCache  *oauth2TokenCache
}

// TokenInvalidator is called when an FCM token is confirmed invalid.
// Typically wired to FCMTokenHandler.InvalidateToken().
type TokenInvalidator func(ctx context.Context, deviceID string) error

// DeviceToken maps a device ID to its FCM registration token.
type DeviceToken struct {
	DeviceID string
	FCMToken string
}

// oauth2TokenCache caches the Google OAuth2 access token for FCM API auth.
// Protected by mutex for concurrent access from multiple goroutines.
type oauth2TokenCache struct {
	mu        sync.Mutex
	token     string
	expiresAt time.Time
}

// NewSender creates a new FCM HTTP v1 sender.
// serviceAccountJSON is the path to the Firebase service account JSON file.
func NewSender(projectID, serviceAccountJSON string) (*Sender, error) {
	if projectID == "" {
		return nil, fmt.Errorf("FCM project ID is required (set FCM_PROJECT_ID)")
	}

	s := &Sender{
		projectID:  projectID,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		tokenCache: &oauth2TokenCache{},
	}

	// Load service account credentials for OAuth2 token generation
	if serviceAccountJSON != "" {
		s.serviceAcct = serviceAccountJSON
	}

	return s, nil
}

// SendToToken sends a data message to a single device FCM token.
// Returns an error if the send fails. The caller should check for
// ErrUnregistered or ErrInvalidArgument to handle token invalidation.
func (s *Sender) SendToToken(ctx context.Context, token string, data map[string]string) error {
	if token == "" {
		return fmt.Errorf("empty FCM token")
	}

	// Get OAuth2 access token for FCM API
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get FCM access token: %w", err)
	}

	// Build FCM v1 message payload
	payload := map[string]interface{}{
		"message": map[string]interface{}{
			"token": token,
			"data":  data,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal FCM payload: %w", err)
	}

	// FCM HTTP v1 endpoint
	url := fmt.Sprintf("https://fcm.googleapis.com/v1/projects/%s/messages:send", s.projectID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create FCM request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("FCM request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusOK {
		return nil
	}

	// Parse FCM error response
	var errResp struct {
		Error struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
			Status  string `json:"status"`
		} `json:"error"`
	}
	_ = json.Unmarshal(respBody, &errResp)

	status := errResp.Error.Status
	message := errResp.Error.Message

	// Per Firebase docs:
	// - UNREGISTERED (maps to 404): token is invalid, delete it
	// - INVALID_ARGUMENT (maps to 400): token is invalid if payload is valid
	switch status {
	case "UNREGISTERED":
		return &FCMError{Code: resp.StatusCode, Status: status, Message: message, Invalid: true}
	case "INVALID_ARGUMENT":
		// Only treat as invalid if the error is specifically about the token
		if strings.Contains(message, "registration token") || strings.Contains(message, "token") {
			return &FCMError{Code: resp.StatusCode, Status: status, Message: message, Invalid: true}
		}
		return &FCMError{Code: resp.StatusCode, Status: status, Message: message, Invalid: false}
	default:
		return &FCMError{Code: resp.StatusCode, Status: status, Message: message, Invalid: false}
	}
}

// SendToDevice sends a push notification to a device and handles token
// invalidation automatically. If FCM returns UNREGISTERED or
// INVALID_ARGUMENT for the token, the token is marked invalid via
// the provided TokenInvalidator callback.
func (s *Sender) SendToDevice(ctx context.Context, dt DeviceToken, data map[string]string, invalidator TokenInvalidator) error {
	err := s.SendToToken(ctx, dt.FCMToken, data)
	if err == nil {
		return nil
	}

	// Check if the error indicates an invalid token
	var fcmErr *FCMError
	if errors.As(err, &fcmErr) && fcmErr.Invalid {
		if invalidator != nil {
			if invErr := invalidator(ctx, dt.DeviceID); invErr != nil {
				// Log but don't mask the original error
				_ = invErr
			}
		}
	}

	return err
}

// FCMError represents an error response from the FCM HTTP v1 API.
type FCMError struct {
	Code    int
	Status  string
	Message string
	Invalid bool // true if the token should be considered invalid
}

func (e *FCMError) Error() string {
	return fmt.Sprintf("FCM error %d (%s): %s", e.Code, e.Status, e.Message)
}

// getAccessToken returns a valid Google OAuth2 access token for FCM API.
// Uses the service account JSON to generate tokens, caching until expiry.
// Thread-safe: protected by mutex for concurrent FCM sends.
func (s *Sender) getAccessToken(ctx context.Context) (string, error) {
	// Check cache (fast path, no lock)
	s.tokenCache.mu.Lock()
	if s.tokenCache.token != "" && time.Now().Before(s.tokenCache.expiresAt) {
		token := s.tokenCache.token
		s.tokenCache.mu.Unlock()
		return token, nil
	}
	s.tokenCache.mu.Unlock()

	if s.serviceAcct == "" {
		return "", fmt.Errorf("FCM service account not configured (set FCM_SERVICE_ACCOUNT_PATH)")
	}

	// Read service account JSON
	keyData, err := os.ReadFile(s.serviceAcct)
	if err != nil {
		return "", fmt.Errorf("failed to read service account: %w", err)
	}

	// Generate JWT and exchange for access token
	conf, err := google.JWTConfigFromJSON(keyData, "https://www.googleapis.com/auth/firebase.messaging")
	if err != nil {
		return "", fmt.Errorf("failed to parse service account: %w", err)
	}

	token, err := conf.TokenSource(ctx).Token()
	if err != nil {
		return "", fmt.Errorf("failed to get access token: %w", err)
	}

	// Cache with 5-minute buffer before expiry
	s.tokenCache.mu.Lock()
	s.tokenCache.token = token.AccessToken
	s.tokenCache.expiresAt = token.Expiry.Add(-5 * time.Minute)
	s.tokenCache.mu.Unlock()

	return token.AccessToken, nil
}
