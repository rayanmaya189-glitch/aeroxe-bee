package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/encryption"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/mqtt"
	"github.com/aeroxe-bee/backend/internal/services"
)

// QRPairingHandler handles QR code-based device pairing.
// Flow:
//  1. Member portal calls GenerateQRCode (JWT auth) → returns a short-lived pairing token
//  2. Frontend encodes the token in a QR code
//  3. Android scans the QR code, then calls QRLogin with the token
//  4. Backend validates the token, creates the device, returns MQTT credentials
type QRPairingHandler struct {
	deviceService         *services.DeviceService
	accountService        *services.AccountService
	mqttCredentialService *services.MQTTCredentialService
	encryption            *encryption.Manager
	mqttBrokerURL         string
	authMiddleware        *middleware.AuthMiddleware
	passwordFile          *mqtt.PasswordFile
	devicePassword        string
}

func NewQRPairingHandler(
	deviceService *services.DeviceService,
	accountService *services.AccountService,
	mqttCredentialService *services.MQTTCredentialService,
	enc *encryption.Manager,
	mqttBrokerURL string,
	authMiddleware *middleware.AuthMiddleware,
	passwordFile *mqtt.PasswordFile,
	devicePassword string,
) *QRPairingHandler {
	return &QRPairingHandler{
		deviceService:         deviceService,
		accountService:        accountService,
		mqttCredentialService: mqttCredentialService,
		encryption:            enc,
		mqttBrokerURL:         mqttBrokerURL,
		authMiddleware:        authMiddleware,
		passwordFile:          passwordFile,
		devicePassword:        devicePassword,
	}
}

// QRCodeResponse is returned when a QR pairing token is generated
type QRCodeResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
	QRData    string `json:"qr_data"` // JSON payload to encode in QR
}

// GenerateQRCode creates a short-lived pairing token for the authenticated member.
// The frontend displays this as a QR code for the Android app to scan.
func (h *QRPairingHandler) GenerateQRCode(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	db := h.deviceService.DB()

	// Generate a random token (32 bytes = 64 hex chars)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate token"})
		return
	}
	token := hex.EncodeToString(tokenBytes)

	// Token expires in 5 minutes
	expiresAt := time.Now().Add(5 * time.Minute)

	// Invalidate any previous unused QR tokens for this account
	_, _ = db.Exec(r.Context(),
		`UPDATE qr_pairing_tokens SET used = true WHERE account_id = $1 AND used = false`,
		accountID,
	)

	// Insert the new token
	if _, err := db.Exec(r.Context(),
		`INSERT INTO qr_pairing_tokens (account_id, token, expires_at) VALUES ($1, $2, $3)`,
		accountID, token, expiresAt,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create pairing token"})
		return
	}

	// Build QR data JSON payload
	qrData := fmt.Sprintf(`{"token":"%s","type":"aeroxe_pair","server":"%s"}`, token, getQRServerURL())

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: QRCodeResponse{
			Token:     token,
			ExpiresAt: expiresAt.Format(time.RFC3339),
			QRData:    qrData,
		},
	})
}

// QRLoginRequest is the request body when Android scans a QR code and logs in
type QRLoginRequest struct {
	PairingToken string `json:"pairing_token"`
	DeviceID     string `json:"device_id"`
	PhoneNumber  string `json:"phone_number"`
	Carrier      string `json:"carrier"`
	SIMSlot      int    `json:"sim_slot"`
	AppVersion   string `json:"app_version"`
	Model        string `json:"model"`
	OSVersion    string `json:"os_version"`
}

// QRLogin handles POST /api/v1/devices/qr-login
// Validates the pairing token, creates the device, generates MQTT credentials,
// and returns connection details to the Android client.
func (h *QRPairingHandler) QRLogin(w http.ResponseWriter, r *http.Request) {
	var req QRLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.PairingToken == "" || req.DeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "pairing_token and device_id are required"})
		return
	}

	db := h.deviceService.DB()

	// Look up the pairing token
	var tokenID, accountID string
	var expiresAt time.Time
	var used bool

	err := db.QueryRow(r.Context(),
		`SELECT id, account_id, expires_at, used FROM qr_pairing_tokens WHERE token = $1`,
		req.PairingToken,
	).Scan(&tokenID, &accountID, &expiresAt, &used)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid pairing token"})
		return
	}

	// Validate token
	if used {
		writeJSON(w, http.StatusConflict, APIResponse{Error: "pairing token has already been used"})
		return
	}
	if time.Now().After(expiresAt) {
		writeJSON(w, http.StatusGone, APIResponse{Error: "pairing token has expired"})
		return
	}

	// Mark token as used
	_, _ = db.Exec(r.Context(),
		`UPDATE qr_pairing_tokens SET used = true, device_id = $1 WHERE id = $2`,
		req.DeviceID, tokenID,
	)

	// Verify account exists and is active
	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "account not found"})
		return
	}
	if account.Status != models.AccountStatusActive {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "account is " + string(account.Status)})
		return
	}

	// Determine SIM slot (default to 1)
	simSlot := req.SIMSlot
	if simSlot < 1 {
		simSlot = 1
	}
	deviceID := fmt.Sprintf("%s-sim%d", req.DeviceID, simSlot)

	// Check if device already exists for this account
	isNewDevice := false
	device, err := h.deviceService.GetByID(r.Context(), deviceID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}

	if device == nil {
		// Ensure physical_devices row exists (required by FK constraint)
		_, _ = db.Exec(r.Context(),
			`INSERT INTO physical_devices (id, account_id, model, os_version, app_version, battery_level, network_type, device_state, updated_at)
			 VALUES ($1, $2, '', '', '', 0, '', 'ACTIVE', NOW())
			 ON CONFLICT (id) DO NOTHING`,
			req.DeviceID, accountID)

		// New device — register it
		countryCode, region := detectCountryFromPhone(req.PhoneNumber)
		device = &models.Device{
			ID:                deviceID,
			PhysicalDeviceID:  req.DeviceID,
			AccountID:         account.ID,
			SIMSlot:           simSlot,
			Name:              req.DeviceID,
			Carrier:           req.Carrier,
			CountryCode:       countryCode,
			Region:            region,
			Status:            models.DeviceStatusOnline,
			SIMHealthStatus:   models.SIMHealthHealthy,
			ReliabilityScore:  0.5,
			ReputationScore:   0.5,
			MaxPerMinute:      10,
			MaxPerHour:        100,
			CircuitBreakerState: models.CBStateClosed,
		}
		if err := h.deviceService.Create(r.Context(), device); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to register device"})
			return
		}
		isNewDevice = true
	} else {
		// Existing device — verify it belongs to this account
		if device.AccountID != accountID {
			writeJSON(w, http.StatusForbidden, APIResponse{Error: "device belongs to a different account"})
			return
		}
		_ = h.deviceService.UpdateStatus(r.Context(), deviceID, models.DeviceStatusOnline)
	}

	// Revoke any existing active MQTT credentials for this device
	if err := h.mqttCredentialService.RevokeByDeviceID(r.Context(), deviceID); err != nil {
		slog.Error("failed to revoke old MQTT credentials",
			"device_id", deviceID,
			"error", err,
		)
	}

	// Create MQTT credentials with encrypted password
	// Use deviceID (composite: androidId-sim1) — must match devices.id for FK constraint
	if _, _, err := h.mqttCredentialService.CreateWithEncryptedPassword(
		r.Context(),
		deviceID,
		h.encryption.Encrypt,
	); err != nil {
		slog.Error("failed to create MQTT credentials during QR login",
			"device_id", deviceID,
			"account_id", accountID,
			"error", err,
		)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create MQTT credentials"})
		return
	}

	// Sync device user to Mosquitto password file
	if h.passwordFile != nil {
		if err := h.passwordFile.AddDeviceUser(deviceID, h.devicePassword); err != nil {
			slog.Error("failed to add MQTT user to password file during QR login",
				"device_id", deviceID,
				"account_id", accountID,
				"error", err,
			)
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to configure MQTT auth"})
			return
		}
	}

	// Generate JWT token for subsequent API calls
	token, err := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 24*time.Hour)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate token"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"device_id":     deviceID,
			"is_new_device": isNewDevice,
			"token":         token,
			"mqtt": map[string]interface{}{
				"broker_url": h.mqttBrokerURL,
				"username":   deviceID,
				"password":   h.devicePassword,
			},
			"device": map[string]interface{}{
				"id":       device.ID,
				"name":     device.Name,
				"sim_slot": device.SIMSlot,
				"status":   device.Status,
				"carrier":  device.Carrier,
			},
			"account": map[string]interface{}{
				"id":    account.ID,
				"email": account.Email,
				"name":  account.Name,
			},
		},
	})
}

// getQRServerURL returns the server URL to embed in QR codes.
func getQRServerURL() string {
	if url := os.Getenv("QR_SERVER_URL"); url != "" {
		return url
	}
	if url := os.Getenv("API_BASE_URL"); url != "" {
		return url
	}
	return "http://localhost:8080"
}
