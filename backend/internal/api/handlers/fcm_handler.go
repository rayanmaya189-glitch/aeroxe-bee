package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/textbee/backend/internal/api/middleware"
)

// FCMTokenHandler handles FCM token registration from Android devices
type FCMTokenHandler struct {
	db *pgxpool.Pool
}

func NewFCMTokenHandler(db *pgxpool.Pool) *FCMTokenHandler {
	return &FCMTokenHandler{db: db}
}

type FCMTokenRequest struct {
	DeviceID  string `json:"device_id"`
	FCMToken  string `json:"fcm_token"`
	Platform  string `json:"platform"` // "android"
}

// RegisterFCMToken handles POST /api/v1/auth/fcm-token
// Stores the FCM token for push notification revival when MQTT disconnects.
// Per Firebase best practices, updates last_seen_at on every registration
// to track token freshness. Tokens older than 1 month are considered stale;
// tokens inactive for 270 days are garbage collected by FCM.
func (h *FCMTokenHandler) RegisterFCMToken(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	var req FCMTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.DeviceID == "" || req.FCMToken == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device_id and fcm_token are required"})
		return
	}

	// Upsert the FCM token for this device.
	// Update last_seen_at to track registration freshness per Firebase docs.
	// Mark as valid again in case it was previously invalidated.
	_, err := h.db.Exec(r.Context(),
		`INSERT INTO device_fcm_tokens (device_id, account_id, fcm_token, platform, is_valid, updated_at, last_seen_at)
		 VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
		 ON CONFLICT (device_id) DO UPDATE SET
		   fcm_token=$3, platform=$4, is_valid=TRUE, updated_at=NOW(), last_seen_at=NOW()`,
		req.DeviceID, accountID, req.FCMToken, req.Platform)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to store FCM token"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// InvalidateToken marks an FCM token as invalid when FCM returns
// UNREGISTERED (404) or INVALID_ARGUMENT (400) errors.
// This prevents wasting resources sending to dead tokens.
func (h *FCMTokenHandler) InvalidateToken(ctx context.Context, deviceID string) error {
	_, err := h.db.Exec(ctx,
		`UPDATE device_fcm_tokens SET is_valid = FALSE, updated_at = NOW() WHERE device_id = $1`,
		deviceID)
	return err
}

// PruneStaleTokens removes FCM tokens that haven't been seen in 30 days.
// Per Firebase docs: "Stale registrations are associated with inactive devices
// that have not connected to FCM for over a month."
// Returns the number of tokens removed.
func (h *FCMTokenHandler) PruneStaleTokens(ctx context.Context) (int64, error) {
	result, err := h.db.Exec(ctx,
		`DELETE FROM device_fcm_tokens
	 WHERE last_seen_at < NOW() - INTERVAL '30 days'
	    OR is_valid = FALSE`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// DB returns the underlying database pool for raw queries
// (used by the background job to look up FCM tokens for revival).
func (h *FCMTokenHandler) DB() *pgxpool.Pool {
	return h.db
}
