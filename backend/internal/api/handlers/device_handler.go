package handlers

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/encryption"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type DeviceHandler struct {
	deviceService         *services.DeviceService
	messageService        *services.MessageService
	apiKeyService         *services.APIKeyService
	mqttCredentialService *services.MQTTCredentialService
	accountService        *services.AccountService
	encryption            *encryption.Manager
	mqttBrokerURL         string
	authMiddleware        *middleware.AuthMiddleware
	devicePassword        string
}



func NewDeviceHandler(
	deviceService *services.DeviceService,
	messageService *services.MessageService,
	apiKeyService *services.APIKeyService,
	mqttCredentialService *services.MQTTCredentialService,
	accountService *services.AccountService,
	encryption *encryption.Manager,
	mqttBrokerURL string,
	authMiddleware *middleware.AuthMiddleware,
	devicePassword string,
) *DeviceHandler {
	return &DeviceHandler{
		deviceService:         deviceService,
		messageService:        messageService,
		apiKeyService:         apiKeyService,
		mqttCredentialService: mqttCredentialService,
		accountService:        accountService,
		encryption:            encryption,
		mqttBrokerURL:         mqttBrokerURL,
		authMiddleware:        authMiddleware,
		devicePassword:        devicePassword,
	}
}

// DeviceRegisterRequest matches the Android RegisterRequest model
type DeviceRegisterRequest struct {
	PhysicalDeviceID string `json:"physical_device_id"`
	PhoneNumber      string `json:"phone_number"`
	Carrier          string `json:"carrier"`
	SIMSlot          int    `json:"sim_slot"`
	AppVersion       string `json:"app_version"`
	Model            string `json:"model"`
	OSVersion        string `json:"os_version"`
	APIKey           string `json:"api_key"`
}

// Register handles POST /api/v1/devices/register
// Validates the API key from the request body, registers the device,
// generates MQTT credentials and a JWT token, returns them to the client.
func (h *DeviceHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req DeviceRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.PhysicalDeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "physical_device_id is required"})
		return
	}
	if req.APIKey == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "api_key is required"})
		return
	}

	keyObj, err := h.apiKeyService.Validate(r.Context(), req.APIKey)
	if err != nil || keyObj == nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid API key"})
		return
	}
	accountID := keyObj.AccountID

	countryCode, region := detectCountryFromPhone(req.PhoneNumber)
	deviceID := fmt.Sprintf("%s-sim%d", req.PhysicalDeviceID, req.SIMSlot)

	device := models.Device{
		ID:                  deviceID,
		PhysicalDeviceID:    req.PhysicalDeviceID,
		AccountID:           accountID,
		SIMSlot:             req.SIMSlot,
		Carrier:             req.Carrier,
		PhoneNumber:         req.PhoneNumber,
		Status:              models.DeviceStatusOnline,
		SIMHealthStatus:     models.SIMHealthHealthy,
		ReliabilityScore:    0.5,
		ReputationScore:     0.5,
		CountryCode:         countryCode,
		Region:              region,
		MaxPerMinute:        10,
		MaxPerHour:          100,
		CircuitBreakerState: models.CBStateClosed,
	}

	if err := h.deviceService.Create(r.Context(), &device); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to register device"})
		return
	}

	// Track credential in DB for audit trail only. Actual MQTT auth uses the shared
	// "device" user (password = MQTT_DEVICE_PASSWORD), which the ACL grants readwrite on devices/#.
	if _, _, err := h.mqttCredentialService.Create(r.Context(), deviceID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create MQTT credentials"})
		return
	}

	token, err := h.authMiddleware.GenerateToken(accountID, "", false, 24*time.Hour)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate token"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"device_id":       deviceID,
			"token":           token,
			"mqtt_broker_url": h.mqttBrokerURL,
			"mqtt": map[string]interface{}{
				"username": "device",
				"password": h.devicePassword,
			},
		},
	})
}

// DeviceLoginRequest is the request body for the device login API
// Used by Android app to authenticate and get MQTT credentials
type DeviceLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	DeviceID string `json:"device_id"`
	SIMSlot  int    `json:"sim_slot"`
	Carrier  string `json:"carrier,omitempty"`
	PhoneNumber string `json:"phone_number,omitempty"`
}

// DeviceLogin handles POST /api/v1/devices/login
// Authenticates the user via email/password, checks or registers the device,
// generates MQTT credentials with AES-256 encrypted password, and returns
// connection details to the Android client.
func (h *DeviceHandler) DeviceLogin(w http.ResponseWriter, r *http.Request) {
	var req DeviceLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Email == "" || req.Password == "" || req.DeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "email, password, and device_id are required"})
		return
	}

	if h.encryption == nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "encryption not configured on server"})
		return
	}

	// Authenticate against accounts table
	account, err := h.accountService.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if account == nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid email or password"})
		return
	}
	if account.Status != models.AccountStatusActive {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "account is " + string(account.Status)})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid email or password"})
		return
	}

	// Use deviceID as the Android identifier; default SIM slot to 1 if not provided
	simSlot := req.SIMSlot
	if simSlot < 1 {
		simSlot = 1
	}
	deviceID := fmt.Sprintf("%s-sim%d", req.DeviceID, simSlot)

	// Check if device is already registered for this account
	isNewDevice := false
	device, err := h.deviceService.GetByID(r.Context(), deviceID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}

	if device == nil {
		// Ensure physical_devices row exists (required by FK constraint on devices.physical_device_id)
		_, _ = h.deviceService.DB().Exec(r.Context(),
			`INSERT INTO physical_devices (id, account_id, model, os_version, app_version, battery_level, network_type, device_state, updated_at)
			 VALUES ($1, $2, '', '', '', 0, '', 'ACTIVE', NOW())
			 ON CONFLICT (id) DO NOTHING`,
			req.DeviceID, account.ID)

		// New device — register it
	device = &models.Device{
		ID:                  deviceID,
		PhysicalDeviceID:    req.DeviceID,
		AccountID:           account.ID,
		SIMSlot:             simSlot,
		Carrier:             req.Carrier,
		PhoneNumber:         req.PhoneNumber,
		Name:                req.DeviceID,
		Status:              models.DeviceStatusOnline,
		SIMHealthStatus:     models.SIMHealthHealthy,
		ReliabilityScore:    0.5,
		ReputationScore:     0.5,
		MaxPerMinute:        10,
		MaxPerHour:          100,
		CircuitBreakerState: models.CBStateClosed,
	}
	if err := h.deviceService.Create(r.Context(), device); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to register device"})
		return
	}
	isNewDevice = true
} else {
	// Existing device — update status to online and refresh info
	_ = h.deviceService.UpdateStatus(r.Context(), deviceID, models.DeviceStatusOnline)
	// Update carrier and phone_number on login (re-activation)
	if req.Carrier != "" {
		_ = h.deviceService.UpdateCarrier(r.Context(), deviceID, req.Carrier)
	}
	if req.PhoneNumber != "" {
		_ = h.deviceService.UpdatePhoneNumber(r.Context(), deviceID, req.PhoneNumber)
	}
}

	// Revoke any existing active MQTT credentials for this device
	if err := h.mqttCredentialService.RevokeByDeviceID(r.Context(), deviceID); err != nil {
		slog.Error("failed to revoke old MQTT credentials",
			"device_id", deviceID,
			"error", err,
		)
	}

	// Track credential in DB for audit trail only. Actual MQTT auth uses the shared
	// "device" user (password = MQTT_DEVICE_PASSWORD), which the ACL grants readwrite on devices/#.
	// Use deviceID (composite: androidId-sim1) — must match devices.id for FK constraint
	if _, _, err := h.mqttCredentialService.CreateWithEncryptedPassword(
		r.Context(),
		deviceID,
		h.encryption.Encrypt,
	); err != nil {
		slog.Error("failed to create MQTT credentials during login",
			"device_id", deviceID,
			"account_id", account.ID,
			"error", err,
		)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create MQTT credentials"})
		return
	}

	// Generate a JWT token for subsequent API calls
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
				"username":   "device",
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

// StatusUpdateRequest matches the Android StatusUpdateRequest model
type StatusUpdateRequest struct {
	MessageID       string  `json:"message_id"`
	DeviceID        string  `json:"device_id"`
	Status          string  `json:"status"`
	DeliveryStatus  string  `json:"delivery_status"`
	ConfidenceScore float64 `json:"confidence_score"`
	Error           *string `json:"error"`
	SIMSlot         int     `json:"sim_slot"`
	Timestamp       int64   `json:"timestamp"`
}

// HandleStatusUpdate handles POST /api/v1/devices/status
// Uses idempotency check: if the message already has a terminal delivery status,
// duplicate updates are silently accepted without re-counting.
func (h *DeviceHandler) HandleStatusUpdate(w http.ResponseWriter, r *http.Request) {
	_ = middleware.GetAccountID(r.Context())

	var req StatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.MessageID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message_id is required"})
		return
	}

	// Idempotency: check if message already has a terminal status
	existing, _ := h.messageService.GetByID(r.Context(), req.MessageID)
	if existing != nil {
		terminal := existing.DeliveryStatus == models.DeliveryStatusSent ||
			existing.DeliveryStatus == models.DeliveryStatusCarrierAccepted ||
			existing.DeliveryStatus == models.DeliveryStatusProbableDelivered ||
			existing.DeliveryStatus == models.DeliveryStatusFailed
		if terminal {
			// Already processed — accept silently to prevent double-counting
			writeJSON(w, http.StatusOK, APIResponse{Success: true})
			return
		}
	}

	if req.Status == "SENT" || req.Status == "DELIVERED" {
		_ = h.messageService.UpdateDeliveryStatus(r.Context(), req.MessageID,
			models.DeliveryStatus(req.DeliveryStatus), req.ConfidenceScore)
		if req.DeviceID != "" {
			_ = h.deviceService.UpdatePong(r.Context(), req.DeviceID)
		}
	} else if req.Status == "FAILED" {
		reason := "device reported failure"
		if req.Error != nil {
			reason = *req.Error
		}
		_ = h.messageService.MarkFailed(r.Context(), req.MessageID, reason)
		if req.DeviceID != "" {
			_ = h.deviceService.UpdateStatus(r.Context(), req.DeviceID, models.DeviceStatusOffline)
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// RegisterDeprecated handles the old POST /api/v1/devices (JWT auth, no MQTT creds)
func (h *DeviceHandler) RegisterDeprecated(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		PhysicalDeviceID string `json:"physical_device_id"`
		SIMSlot          int    `json:"sim_slot"`
		Carrier          string `json:"carrier"`
		Model            string `json:"model"`
		OSVersion        string `json:"os_version"`
		CountryCode      string `json:"country_code"`
		Region           string `json:"region"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	deviceID := fmt.Sprintf("%s-sim%d", req.PhysicalDeviceID, req.SIMSlot)

	device := models.Device{
		ID:                  deviceID,
		PhysicalDeviceID:    req.PhysicalDeviceID,
		AccountID:           accountID,
		SIMSlot:             req.SIMSlot,
		Carrier:             req.Carrier,
		Status:              models.DeviceStatusOnline,
		SIMHealthStatus:     models.SIMHealthHealthy,
		ReliabilityScore:    0.5,
		ReputationScore:     0.5,
		CountryCode:         req.CountryCode,
		Region:              req.Region,
		MaxPerMinute:        10,
		MaxPerHour:          100,
		CircuitBreakerState: models.CBStateClosed,
	}

	if err := h.deviceService.Create(r.Context(), &device); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to register device"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"device_id": deviceID,
			"status":    "registered",
		},
	})
}

// ─── Device Identity ─────────────────────────────────────────

// DeviceIdentityRequest is sent by Android to register a multi-layer
// device fingerprint for anti-clone and anti-spoofing protection.
type DeviceIdentityRequest struct {
	FingerprintHash string `json:"fingerprint_hash"`
	Signature       string `json:"signature"`
	PublicKey       string `json:"public_key"`
	IntegrityToken  *string `json:"integrity_token"`
	AndroidID       string `json:"android_id"`
	UUID            string `json:"uuid"`
	Model           string `json:"model"`
	Brand           string `json:"brand"`
	Manufacturer    string `json:"manufacturer"`
	OSVersion       string `json:"os_version"`
	SDKLevel        int    `json:"sdk_level"`
	Carrier         string `json:"carrier"`
	SIMCountry      string `json:"sim_country"`
	SIMOperator     string `json:"sim_operator"`
	InstallTime     int64  `json:"install_time"`
}

// verifySignature decodes the base64-encoded public key, then verifies
// that `signature` is a valid RSA+SHA256 signature over `fingerprintHash`.
func verifySignature(fingerprintHash, signatureB64, publicKeyB64 string) bool {
	pubKeyBytes, err := base64.StdEncoding.DecodeString(publicKeyB64)
	if err != nil {
		slog.Warn("device identity: failed to decode public key", "error", err)
		return false
	}

	pubKey, err := x509.ParsePKIXPublicKey(pubKeyBytes)
	if err != nil {
		slog.Warn("device identity: failed to parse public key", "error", err)
		return false
	}

	rsaPubKey, ok := pubKey.(*rsa.PublicKey)
	if !ok {
		slog.Warn("device identity: public key is not RSA")
		return false
	}

	sigBytes, err := base64.StdEncoding.DecodeString(signatureB64)
	if err != nil {
		slog.Warn("device identity: failed to decode signature", "error", err)
		return false
	}

	hash := sha256.Sum256([]byte(fingerprintHash))
	err = rsa.VerifyPKCS1v15(rsaPubKey, crypto.SHA256, hash[:], sigBytes)
	if err != nil {
		slog.Warn("device identity: signature verification failed", "error", err)
		return false
	}

	return true
}

// HandleDeviceIdentity handles POST /api/v1/devices/identity
// Accepts a multi-layer device fingerprint, verifies the Keystore-backed
// signature, stores the fingerprint on the physical_device, and returns
// a trust score. This is the authoritative device identity binding.
func (h *DeviceHandler) HandleDeviceIdentity(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req DeviceIdentityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.FingerprintHash == "" || req.Signature == "" || req.PublicKey == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "fingerprint_hash, signature, and public_key are required"})
		return
	}

	// 1. Verify the Keystore-backed signature
	sigValid := verifySignature(req.FingerprintHash, req.Signature, req.PublicKey)
	if !sigValid {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "signature verification failed"})
		return
	}

	// 2. Check for fingerprint reuse across accounts
	var cloneCount int
	err := h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(*) FROM physical_devices
		  WHERE fingerprint_hash = $1 AND fingerprint_hash != '' AND account_id != $2`,
		req.FingerprintHash, accountID,
	).Scan(&cloneCount)
	if err == nil && cloneCount > 0 {
		slog.Warn("device identity: fingerprint reused across accounts",
			"fingerprint_hash", req.FingerprintHash[:8]+"...",
			"clone_count", cloneCount,
			"requesting_account", accountID,
		)
		writeJSON(w, http.StatusConflict, APIResponse{Error: "device fingerprint already registered to another account"})
		return
	}

	// 3. Compute a trust score
	trustScore := 0.5
	if sigValid {
		trustScore += 0.3
	}
	if req.IntegrityToken != nil && *req.IntegrityToken != "" {
		trustScore += 0.2
	}
	if trustScore > 1.0 {
		trustScore = 1.0
	}

	now := time.Now()

	// 4. Upsert the physical_devices row with identity data
	_, err = h.deviceService.DB().Exec(r.Context(),
		`INSERT INTO physical_devices
			(id, account_id, model, os_version, app_version, battery_level, network_type, device_state,
			 fingerprint_hash, signature, public_key, uuid, manufacturer, brand, sdk_level,
			 sim_country, sim_operator, install_time, trust_score, integrity_token, identity_verified_at, updated_at)
		 VALUES ($1, $2, $3, $4, '', 0, '', '',
		         $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
		 ON CONFLICT (id) DO UPDATE SET
		   model=$3, os_version=$4, fingerprint_hash=$5, signature=$6, public_key=$7, uuid=$8,
		   manufacturer=$9, brand=$10, sdk_level=$11, sim_country=$12, sim_operator=$13,
		   install_time=$14, trust_score=$15,
		   integrity_token = CASE WHEN $16 IS NOT NULL THEN $16 ELSE physical_devices.integrity_token END,
		   identity_verified_at = CASE WHEN physical_devices.identity_verified_at IS NULL THEN $17 ELSE physical_devices.identity_verified_at END,
		   updated_at=NOW()`,
		req.AndroidID, accountID, req.Model, req.OSVersion,
		req.FingerprintHash, req.Signature, req.PublicKey, req.UUID,
		req.Manufacturer, req.Brand, req.SDKLevel,
		req.SIMCountry, req.SIMOperator, req.InstallTime,
		trustScore, req.IntegrityToken, now,
	)
	if err != nil {
		slog.Error("device identity: upsert failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to store device identity"})
		return
	}

	// 5. Propagate fingerprint_hash to all logical devices belonging to this physical device
	_, _ = h.deviceService.DB().Exec(r.Context(),
		`UPDATE devices SET fingerprint_hash = $1 WHERE physical_device_id = $2`,
		req.FingerprintHash, req.AndroidID,
	)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"device_id":       req.AndroidID,
			"trust_score":     trustScore,
			"fingerprint_hash": req.FingerprintHash,
			"is_verified":     sigValid,
		},
	})
}

// ─── SIM Rotation Detection ──────────────────────────────────

type SimReportEvent struct {
	Type     string `json:"type"`
	Severity int    `json:"severity"`
	Details  string `json:"details"`
}

type SimSnapshotReport struct {
	SlotIndex      int    `json:"slot_index"`
	SubscriptionID int    `json:"subscription_id"`
	CarrierName    string `json:"carrier_name"`
	MccMnc         string `json:"mcc_mnc"`
	CountryIso     string `json:"country_iso"`
	IsRoaming      bool   `json:"is_roaming"`
}

type SimReportRequest struct {
	DeviceID       string              `json:"device_id"`
	Events         []SimReportEvent    `json:"events"`
	SimState       []SimSnapshotReport `json:"sim_state"`
	Frequency      string              `json:"frequency"`
	FingerprintHash string             `json:"fingerprint_hash"`
}

// trustScorePenalty returns the trust score deduction and action label
// for a given set of SIM events and their frequency.
func trustScorePenalty(events []SimReportEvent, frequency string) (float64, string) {
	var penalty float64
	hasSwap := false
	hasCountryChange := false

	for _, e := range events {
		switch e.Type {
		case "SIM_SWAPPED":
			penalty += 10
			hasSwap = true
		case "COUNTRY_CHANGED":
			penalty += 20
			hasCountryChange = true
		case "CARRIER_CHANGED":
			penalty += 5
		case "NEW_SIM_INSERTED":
			penalty += 5
		case "SIM_REMOVED":
			penalty += 3
		}
	}

	switch frequency {
	case "CRITICAL":
		penalty += 30
	case "HIGH":
		penalty += 20
	case "MEDIUM":
		penalty += 10
	}

	// OTP abuse signal: SIM swap + high frequency
	if hasSwap && frequency == "HIGH" {
		penalty += 15
	}
	if hasCountryChange && hasSwap {
		penalty += 10
	}

	action := computeAction(penalty)
	return penalty, action
}

func computeAction(penalty float64) string {
	effectiveScore := 100.0 - penalty
	switch {
	case effectiveScore >= 80:
		return "NORMAL"
	case effectiveScore >= 50:
		return "THROTTLE"
	case effectiveScore >= 20:
		return "OTP_ONLY"
	default:
		return "BLOCK"
	}
}

// HandleSimReport handles POST /api/v1/devices/sim-report
// Accepts SIM rotation events from the Android device, logs them,
// updates the device trust score, and returns the recommended action.
// HandleSimReport handles POST /api/v1/devices/sim-report
// Accepts SIM rotation events, records SIM→device history,
// detects context-aware risks (roaming vs country change), eSIM lifecycle,
// and updates trust score with behavioral penalties.
func (h *DeviceHandler) HandleSimReport(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req SimReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.DeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device_id is required"})
		return
	}

	// 1. Serialize SIM snapshot to JSON
	simStateJSON, _ := json.Marshal(req.SimState)

	// 2. Log each event to sim_events table + update SIM device history
	for _, event := range req.Events {
		_, err := h.deviceService.DB().Exec(r.Context(),
			`INSERT INTO sim_events
				(physical_device_id, account_id, event_type, severity, details, sim_snapshot, frequency, fingerprint_hash, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
			req.DeviceID, accountID, event.Type, event.Severity, event.Details,
			string(simStateJSON), req.Frequency, req.FingerprintHash,
		)
		if err != nil {
			slog.Error("sim report: failed to insert event",
				"device_id", req.DeviceID,
				"event", event.Type,
				"error", err,
			)
		}

		// Record SIM→device binding for each active SIM in the snapshot
		for _, sim := range req.SimState {
			subID := fmt.Sprintf("%s:%d", sim.MccMnc, sim.SubscriptionID)
			_, _ = h.deviceService.DB().Exec(r.Context(),
				`INSERT INTO sim_device_history
					(subscription_id, physical_device_id, account_id, first_seen, last_seen,
					 first_fingerprint_hash, last_fingerprint_hash, device_count, is_active,
					 sim_slot, carrier_name, mcc_mnc, country_iso)
				 VALUES ($1, $2, $3, NOW(), NOW(), $4, $4,
				   (SELECT COUNT(DISTINCT physical_device_id) FROM sim_device_history WHERE subscription_id = $1),
				   TRUE, $5, $6, $7, $8)
				 ON CONFLICT (subscription_id, physical_device_id) DO UPDATE SET
				   last_seen = NOW(), last_fingerprint_hash = $4, is_active = TRUE,
				   carrier_name = $6, country_iso = $8`,
				subID, req.DeviceID, accountID, req.FingerprintHash,
				sim.SlotIndex, sim.CarrierName, sim.MccMnc, sim.CountryIso,
			)
		}
	}

	// 3. Context-aware checks
	var adjustedPenalty float64
	for _, event := range req.Events {
		switch event.Type {
		case "COUNTRY_CHANGED":
			adjustedPenalty += 18
		case "CARRIER_CHANGED":
			// eSIM activation is normal — check details for "esim" prefix
			if containsString(event.Details, "esim") || containsString(event.Details, "profile") {
				adjustedPenalty += 1 // eSIM lifecycle — minimal risk
			} else {
				adjustedPenalty += 5 // physical SIM carrier change
			}
		case "SIM_REMOVED":
			adjustedPenalty += 3
		case "NEW_SIM_INSERTED":
			adjustedPenalty += 5
		case "SIM_SWAPPED":
			adjustedPenalty += 10
		default:
			adjustedPenalty += 5
		}
	}

	// Frequency bonus
	switch req.Frequency {
	case "CRITICAL":
		adjustedPenalty += 30
	case "HIGH":
		adjustedPenalty += 20
	case "MEDIUM":
		adjustedPenalty += 10
	}

	// 4. Check SIM age from sim_device_history
	for _, sim := range req.SimState {
		subID := fmt.Sprintf("%s:%d", sim.MccMnc, sim.SubscriptionID)
		var simAgeHours float64
		_ = h.deviceService.DB().QueryRow(r.Context(),
			`SELECT EXTRACT(EPOCH FROM (NOW() - first_seen)) / 3600
			  FROM sim_device_history WHERE subscription_id = $1 AND physical_device_id = $2`,
			subID, req.DeviceID,
		).Scan(&simAgeHours)
		// Fresh SIM (< 24h) raises penalty
		if simAgeHours > 0 && simAgeHours < 24 {
			adjustedPenalty += 10
		}
	}

	// 5. Check for SIM reuse across many devices
	var maxSimReuse int
	for _, sim := range req.SimState {
		subID := fmt.Sprintf("%s:%d", sim.MccMnc, sim.SubscriptionID)
		var count int
		_ = h.deviceService.DB().QueryRow(r.Context(),
			`SELECT COUNT(DISTINCT physical_device_id) FROM sim_device_history
			  WHERE subscription_id = $1 AND is_active = TRUE`,
			subID,
		).Scan(&count)
		if count > maxSimReuse {
			maxSimReuse = count
		}
	}
	if maxSimReuse >= 3 {
		adjustedPenalty += 20 // same SIM on 3+ devices — farm indicator
	}

	// 6. Compute action
	action := computeAction(adjustedPenalty)
	newTrustScore := 100.0 - adjustedPenalty
	if newTrustScore < 0 {
		newTrustScore = 0
	}

	// 7. Update physical_device trust_score and device status if blocked
	_, _ = h.deviceService.DB().Exec(r.Context(),
		`UPDATE physical_devices SET trust_score = $1, updated_at = NOW() WHERE id = $2`,
		newTrustScore, req.DeviceID,
	)

	if action == "BLOCK" {
		_, _ = h.deviceService.DB().Exec(r.Context(),
			`UPDATE devices SET status = 'OFFLINE', updated_at = NOW() WHERE physical_device_id = $1`,
			req.DeviceID,
		)
	}

	// 8. Check recent event count for anomaly detection
	var recentCount int
	_ = h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(*) FROM sim_events
		  WHERE physical_device_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
		req.DeviceID,
	).Scan(&recentCount)

	slog.Info("sim report processed",
		"device_id", req.DeviceID,
		"events", len(req.Events),
		"frequency", req.Frequency,
		"penalty", adjustedPenalty,
		"action", action,
		"recent_events_1h", recentCount,
	)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"action":               action,
			"trust_score":          newTrustScore,
			"penalty":              adjustedPenalty,
			"recent_events_1h":     recentCount,
			"device_id":            req.DeviceID,
			"sim_events_logged":    len(req.Events),
		},
	})
}

// ─── Device Intelligence (enriched fingerprint + weighted scoring) ─────

type DeviceIntelligenceRequest struct {
	AndroidID       string              `json:"android_id"`
	UUID            string              `json:"uuid"`
	FingerprintHash string              `json:"fingerprint_hash"`
	Signature       string              `json:"signature"`
	PublicKey       string              `json:"public_key"`
	KeyVersion      int                 `json:"key_version"`

	BuildFingerprint  string `json:"build_fingerprint"`
	BuildHardware     string `json:"build_hardware"`
	BuildProduct      string `json:"build_product"`
	BuildManufacturer string `json:"build_manufacturer"`
	BuildDevice       string `json:"build_device"`
	BuildBootloader   string `json:"build_bootloader"`
	BuildBoard        string `json:"build_board"`
	BuildBrand        string `json:"build_brand"`
	BuildModel        string `json:"build_model"`
	BuildType         string `json:"build_type"`
	BuildTags         string `json:"build_tags"`
	BuildDisplay      string `json:"build_display"`
	BuildHost         string `json:"build_host"`
	OSVersion         string `json:"os_version"`
	SDKLevel          int    `json:"sdk_level"`
	SecurityPatch     string `json:"security_patch"`

	SystemTime  int64    `json:"system_time"`
	BuildTime   int64    `json:"build_time"`
	InstallTime int64    `json:"install_time"`
	TimeIssues  []string `json:"time_issues"`

	EmulatorConfidence  float64          `json:"emulator_confidence"`
	EmulatorFlags       map[string]bool  `json:"emulator_flags"`
	RootConfidence      float64          `json:"root_confidence"`
	RootFlags           map[string]bool  `json:"root_flags"`
	VirtualizationFlags map[string]bool  `json:"virtualization_flags"`
	HookConfidence      float64          `json:"hook_confidence"`
	HookFlags           map[string]bool  `json:"hook_flags"`
	IntegrityScore      float64          `json:"integrity_score"`
	IntegrityFlags      map[string]any   `json:"integrity_flags"`

	NetworkType          string `json:"network_type"`
	IsVpnActive          bool   `json:"is_vpn_active"`
	SensorCount          int    `json:"sensor_count"`
	MissingCommonSensors bool   `json:"missing_common_sensors"`

	Imei           string `json:"imei"`
	Meid           string `json:"meid"`
	HardwareSerial string `json:"hardware_serial"`

	ScreenWidth        int     `json:"screen_width"`
	ScreenHeight       int     `json:"screen_height"`
	ScreenDensityDpi   int     `json:"screen_density_dpi"`
	ScreenDensityBucket string `json:"screen_density_bucket"`
	ScreenRefreshRate  float64 `json:"screen_refresh_rate"`

	CpuAbis    []string `json:"cpu_abis"`
	Cpu64Abis  []string `json:"cpu_64_abis"`
	CpuCores   int      `json:"cpu_cores"`
	TotalRamMb int64    `json:"total_ram_mb"`

	FeatureFlags       map[string]bool `json:"feature_flags"`
	FeatureAnomalyScore float64         `json:"feature_anomaly_score"`

	SimInfo     map[string]string `json:"sim_info"`
	Carrier     string            `json:"carrier"`
	SimCountry  string            `json:"sim_country"`
	SimOperator string            `json:"sim_operator"`
	AppVersion  string            `json:"app_version"`
}

type DeviceIntelligenceResponse struct {
	DeviceID        string   `json:"device_id"`
	ConfidenceScore float64  `json:"confidence_score"`
	TrustScore      float64  `json:"trust_score"`
	Action          string   `json:"action"`
	RiskFactors     []string `json:"risk_factors"`
	DriftDetected   bool     `json:"drift_detected"`
	DriftDetails    string   `json:"drift_details,omitempty"`
}

// weightedConfidence computes a confidence score from weighted signals.
// Returns (confidence 0-100, riskFactors, driftDetected, driftDetails).
func weightedConfidence(req *DeviceIntelligenceRequest, prevFPHash string) (float64, []string, bool, string) {
	var score float64
	var maxScore float64 = 100.0
	var riskFactors []string
	driftDetected := false
	driftDetails := ""

	// Signal weights
	type signal struct {
		name   string
		weight float64
		check  func() (float64, bool)
	}

	signals := []signal{
		// Keystore signature (30%) — strongest signal
		{
			name: "keystore_signature", weight: 30,
			check: func() (float64, bool) {
				if req.Signature != "" && req.PublicKey != "" {
					if verifySignature(req.FingerprintHash, req.Signature, req.PublicKey) {
						return 30, false
					}
					riskFactors = append(riskFactors, "invalid_signature")
					return 0, false
				}
				riskFactors = append(riskFactors, "missing_signature")
				return 0, false
			},
		},
		// Play Integrity would add ~25% here
		// Emulator detection (penalty up to 15%)
		{
			name: "emulator", weight: 15,
			check: func() (float64, bool) {
				if req.EmulatorConfidence > 0.7 {
					riskFactors = append(riskFactors, "emulator_high_confidence")
					return 0, false
				}
				if req.EmulatorConfidence > 0.3 {
					riskFactors = append(riskFactors, "emulator_suspected")
					return 5, false
				}
				return 15, false
			},
		},
		// Root detection (penalty up to 15%)
		{
			name: "root", weight: 15,
			check: func() (float64, bool) {
				if req.RootConfidence > 0.7 {
					riskFactors = append(riskFactors, "rooted_high_confidence")
					return 0, false
				}
				if req.RootConfidence > 0.3 {
					riskFactors = append(riskFactors, "root_suspected")
					return 3, false
				}
				return 15, false
			},
		},
		// Runtime hooking (penalty up to 10%)
		{
			name: "runtime_hooking", weight: 10,
			check: func() (float64, bool) {
				if req.HookConfidence > 0.5 {
					riskFactors = append(riskFactors, "runtime_hooked")
					return 0, false
				}
				return 10, false
			},
		},
		// Integrity score (penalty up to 10%)
		{
			name: "integrity", weight: 10,
			check: func() (float64, bool) {
				if req.IntegrityScore < 0.3 {
					riskFactors = append(riskFactors, "low_integrity")
					return 0, false
				}
				if req.IntegrityScore < 0.7 {
					riskFactors = append(riskFactors, "reduced_integrity")
					return 5, false
				}
				return 10, false
			},
		},
		// Time consistency (penalty up to 5%)
		{
			name: "time_consistency", weight: 5,
			check: func() (float64, bool) {
				if len(req.TimeIssues) > 0 {
					riskFactors = append(riskFactors, "time_inconsistent")
					return 0, false
				}
				return 5, false
			},
		},
		// Virtualization (penalty up to 10%)
		{
			name: "virtualization", weight: 10,
			check: func() (float64, bool) {
				if val, ok := req.VirtualizationFlags["virt_any_found"]; ok && val {
					riskFactors = append(riskFactors, "virtualized_environment")
					return 0, false
				}
				return 10, false
			},
		},
		// Network (bonus for no VPN, penalty for VPN)
		{
			name: "network", weight: 5,
			check: func() (float64, bool) {
				if req.IsVpnActive {
					riskFactors = append(riskFactors, "vpn_active")
					return 2, false
				}
				return 5, false
			},
		},
		// Sensors (penalty for missing common sensors)
		{
			name: "sensors", weight: 5,
			check: func() (float64, bool) {
				if req.MissingCommonSensors {
					riskFactors = append(riskFactors, "missing_sensors")
					return 0, false
				}
				return 5, false
			},
		},
	}

	for _, s := range signals {
		sigScore, _ := s.check()
		score += sigScore
	}

	// Normalize to 0-100
	if score > maxScore {
		score = maxScore
	}

	// --- Fingerprint drift detection ---
	if prevFPHash != "" && prevFPHash != req.FingerprintHash {
		driftDetected = true
		driftDetails = "fingerprint_hash_changed"
		riskFactors = append(riskFactors, "fingerprint_drift")
		score -= 20
	}

	// Detect impossible hardware transitions in the same session
	driftReasons := detectHardwareDrift(req)
	if len(driftReasons) > 0 {
		driftDetected = true
		driftDetails = joinStrings(driftReasons, "; ")
		for _, r := range driftReasons {
			riskFactors = append(riskFactors, "drift_"+r)
		}
		score -= 15
	}

	if score < 0 {
		score = 0
	}

	return score, riskFactors, driftDetected, driftDetails
}

// enhancedConfidence extends weightedConfidence with IMEI reputation,
// SIM age, behavioral correlation, and time-decayed historical scores.
// This is called from HandleDeviceIntelligence when DB lookups succeed.
// Returns (confidence 0-100, riskFactors, driftDetected, driftDetails).
func enhancedConfidence(req *DeviceIntelligenceRequest, prevFPHash string, db services.DatabaseQuerier, ctx context.Context, accountID string) (float64, []string, bool, string) {
	score, riskFactors, driftDetected, driftDetails := weightedConfidence(req, prevFPHash)

	// --- IMEI reputation (when available) ---
	if req.Imei != "" {
		imeiHash := sha256Hex(req.Imei)
		var deviceCount int
		_ = db.QueryRow(ctx,
			`SELECT COUNT(DISTINCT physical_device_id) FROM imei_registry WHERE imei = $1 AND is_active = TRUE`,
			imeiHash,
		).Scan(&deviceCount)

		if deviceCount > 5 {
			riskFactors = append(riskFactors, "imei_high_reuse")
			score -= 20
		} else if deviceCount > 2 {
			riskFactors = append(riskFactors, "imei_reused")
			score -= 10
		} else if deviceCount > 1 {
			score -= 3
		}

		// Concurrent sessions
		var concurrentCount int
		_ = db.QueryRow(ctx,
			`SELECT COUNT(DISTINCT physical_device_id) FROM imei_registry
			  WHERE imei = $1 AND is_active = TRUE AND last_seen > NOW() - INTERVAL '1 hour'
			    AND physical_device_id != $2`,
			imeiHash, req.AndroidID,
		).Scan(&concurrentCount)

		if concurrentCount > 0 {
			riskFactors = append(riskFactors, "imei_concurrent_session")
			score -= 15
		}
	}

	// --- SIM age (fresh SIMs are riskier) ---
	if req.SimOperator != "" {
		var youngestAgeHours float64
		_ = db.QueryRow(ctx,
			`SELECT MIN(EXTRACT(EPOCH FROM (NOW() - first_seen)) / 3600)
			  FROM sim_device_history
			  WHERE physical_device_id = $1 AND is_active = TRUE AND carrier_name = $2`,
			req.AndroidID, req.Carrier,
		).Scan(&youngestAgeHours)

		if youngestAgeHours > 0 && youngestAgeHours < 1 {
			riskFactors = append(riskFactors, "sim_less_than_1h")
			score -= 15
		} else if youngestAgeHours > 0 && youngestAgeHours < 24 {
			riskFactors = append(riskFactors, "sim_less_than_24h")
			score -= 8
		} else if youngestAgeHours >= 720 {
			score += 5 // SIM > 30 days = trusted
		}
	}

	// --- Behavioral correlation ---
	var recentRiskyBehaviors int
	_ = db.QueryRow(ctx,
		`SELECT COUNT(*) FROM behavior_events
		  WHERE physical_device_id = $1
		    AND created_at > NOW() - INTERVAL '1 hour'
		    AND event_type IN ('password_reset', 'new_payee', 'large_transfer', 'kyc_update')`,
		req.AndroidID,
	).Scan(&recentRiskyBehaviors)

	if recentRiskyBehaviors > 0 {
		riskFactors = append(riskFactors, "recent_risky_behavior")
		score -= float64(recentRiskyBehaviors) * 5
	}

	// --- OTP burst detection ---
	var recentOtpCount int
	_ = db.QueryRow(ctx,
		`SELECT COUNT(*) FROM behavior_events
		  WHERE physical_device_id = $1 AND event_type = 'otp_request'
		    AND created_at > NOW() - INTERVAL '5 minutes'`,
		req.AndroidID,
	).Scan(&recentOtpCount)

	if recentOtpCount > 10 {
		riskFactors = append(riskFactors, "otp_burst_extreme")
		score -= 25
	} else if recentOtpCount > 5 {
		riskFactors = append(riskFactors, "otp_burst")
		score -= 10
	}

	// --- Time decay: confidence drops if reports are stale ---
	// (This is applied on the server when querying historical trust score)

	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	return score, riskFactors, driftDetected, driftDetails
}

// detectHardwareDrift checks for impossible hardware transitions
// compared to previously reported values stored on the server side.
// For the initial report, we flag suspicious combinations.
func detectHardwareDrift(req *DeviceIntelligenceRequest) []string {
	var reasons []string

	// Brand + model mismatch (common in virtual/cloned devices)
	if req.BuildBrand != "" && req.BuildModel != "" && req.BuildManufacturer != "" {
		// Check if brand/manufacturer are consistent
		knownBrands := map[string][]string{
			"samsung":   {"samsung"},
			"google":    {"google"},
			"xiaomi":    {"xiaomi", "redmi"},
			"oneplus":   {"oneplus"},
			"oppo":      {"oppo", "realme"},
			"vivo":      {"vivo"},
			"huawei":    {"huawei"},
			"honor":     {"honor"},
			"motorola":  {"motorola"},
			"nokia":     {"nokia", "hmd global"},
			"sony":      {"sony"},
			"lg":        {"lg"},
			"asus":      {"asus"},
			"lenovo":    {"lenovo"},
			"htc":       {"htc"},
		}

		brandLower := toLower(req.BuildBrand)
		manuLower := toLower(req.BuildManufacturer)

		// If brand is known, manufacturer should be related
		for knownBrand, manuAliases := range knownBrands {
			if contains(brandLower, knownBrand) {
				match := false
				for _, alias := range manuAliases {
					if contains(manuLower, alias) {
						match = true
						break
					}
				}
				if !match {
					reasons = append(reasons, "brand_manufacturer_mismatch")
				}
				break
			}
		}
	}

	// Emulator + real hardware flags (contradiction)
	if req.EmulatorConfidence > 0.5 && req.SensorCount > 5 {
		reasons = append(reasons, "emulator_with_hardware_sensors")
	}

	// Virtualization + high sensor count
	if val, ok := req.VirtualizationFlags["virt_any_found"]; ok && val && req.SensorCount > 8 {
		reasons = append(reasons, "virtualized_with_real_sensors")
	}

	return reasons
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		b[i] = c
	}
	return string(b)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsString(s, substr)
}

func containsString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}

// computeActionFromScore maps a confidence score to a device action.
func computeActionFromScore(score float64) string {
	switch {
	case score >= 80:
		return "NORMAL"
	case score >= 55:
		return "THROTTLE"
	case score >= 30:
		return "OTP_ONLY"
	default:
		return "BLOCK"
	}
}

// HandleDeviceIntelligence handles POST /api/v1/devices/intelligence
// Accepts an enriched multi-signal fingerprint, computes weighted confidence,
// detects fingerprint drift, and returns action + risk factors.
func (h *DeviceHandler) HandleDeviceIntelligence(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req DeviceIntelligenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.AndroidID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "android_id is required"})
		return
	}

	// 1. Fetch previously stored fingerprint hash for drift detection
	var prevFPHash string
	_ = h.deviceService.DB().QueryRow(r.Context(),
		`SELECT fingerprint_hash FROM physical_devices WHERE id = $1`,
		req.AndroidID,
	).Scan(&prevFPHash)

	// 2. Compute weighted confidence score (with IMEI, SIM age, behavioral enrichments)
	db := h.deviceService.DB()
	confidence, riskFactors, driftDetected, driftDetails := enhancedConfidence(&req, prevFPHash, db, r.Context(), accountID)
	action := computeActionFromScore(confidence)

	// 3. Compute trust_score as a smoother version (50% weight on existing)
	var existingTrust float64 = 0.5
	_ = h.deviceService.DB().QueryRow(r.Context(),
		`SELECT trust_score FROM physical_devices WHERE id = $1`,
		req.AndroidID,
	).Scan(&existingTrust)

	normalizedConfidence := confidence / 100.0
	newTrustScore := (existingTrust * 0.4) + (normalizedConfidence * 0.6)
	if newTrustScore > 1.0 {
		newTrustScore = 1.0
	}
	if newTrustScore < 0.0 {
		newTrustScore = 0.0
	}

	// 4. Upsert physical_devices with all intelligence data
	_, err := h.deviceService.DB().Exec(r.Context(),
		`INSERT INTO physical_devices
			(id, account_id, model, os_version, app_version,
			 fingerprint_hash, signature, public_key, uuid, manufacturer,
			 brand, sdk_level, sim_country, sim_operator, install_time,
			 trust_score, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
		 ON CONFLICT (id) DO UPDATE SET
		   model=$3, os_version=$4, fingerprint_hash=$6, signature=$7, public_key=$8, uuid=$9,
		   manufacturer=$10, brand=$11, sdk_level=$12, sim_country=$13, sim_operator=$14,
		   install_time=$15, trust_score=$16, updated_at=NOW()`,
		req.AndroidID, accountID, req.BuildModel, req.OSVersion, req.AppVersion,
		req.FingerprintHash, req.Signature, req.PublicKey, req.UUID, req.BuildManufacturer,
		req.BuildBrand, req.SDKLevel, req.SimCountry, req.SimOperator, req.InstallTime,
		newTrustScore,
	)
	if err != nil {
		slog.Error("device intelligence: upsert failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to store device intelligence"})
		return
	}

	// 5. Propagate to devices table
	_, _ = h.deviceService.DB().Exec(r.Context(),
		`UPDATE devices SET fingerprint_hash = $1 WHERE physical_device_id = $2`,
		req.FingerprintHash, req.AndroidID,
	)

	// 6. If blocked, set all devices offline
	if action == "BLOCK" {
		_, _ = h.deviceService.DB().Exec(r.Context(),
			`UPDATE devices SET status = 'OFFLINE', updated_at = NOW() WHERE physical_device_id = $1`,
			req.AndroidID,
		)
	}

	slog.Info("device intelligence processed",
		"device_id", req.AndroidID,
		"confidence", confidence,
		"trust_score", newTrustScore,
		"action", action,
		"risk_factors", riskFactors,
		"drift", driftDetected,
	)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: DeviceIntelligenceResponse{
			DeviceID:        req.AndroidID,
			ConfidenceScore: confidence,
			TrustScore:      newTrustScore,
			Action:          action,
			RiskFactors:     riskFactors,
			DriftDetected:   driftDetected,
			DriftDetails:    driftDetails,
		},
	})
}

// ─── IMEI Registry ──────────────────────────────────────────

type ImeiReportRequest struct {
	AndroidID      string `json:"android_id"`
	Imei           string `json:"imei"`
	Meid           string `json:"meid"`
	HardwareSerial string `json:"hardware_serial"`
}

type ImeiReportResponse struct {
	ImeiHash          string  `json:"imei_hash"`
	DeviceCount       int     `json:"device_count"`
	ConcurrentSessions bool   `json:"concurrent_sessions"`
	TrustImpact       float64 `json:"trust_impact"`
}

// HandleImeiReport handles POST /api/v1/devices/imei
// Stores IMEI-to-device binding, detects cross-device IMEI sharing,
// concurrent sessions, and factory reset scenarios.
func (h *DeviceHandler) HandleImeiReport(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req ImeiReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.AndroidID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "android_id is required"})
		return
	}

	// No IMEI provided — not an error, just skip
	if req.Imei == "" {
		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: ImeiReportResponse{
			ImeiHash:          "",
			DeviceCount:       0,
			ConcurrentSessions: false,
			TrustImpact:       0,
		}})
		return
	}

	imeiHash := sha256Hex(req.Imei)
	now := time.Now()
	var trustImpact float64

	// 1. Upsert the IMEI → device binding
	_, err := h.deviceService.DB().Exec(r.Context(),
		`INSERT INTO imei_registry (imei, physical_device_id, account_id, first_seen, last_seen, is_active)
		 VALUES ($1, $2, $3, $4, $4, TRUE)
		 ON CONFLICT (imei, physical_device_id) DO UPDATE SET
		   last_seen = EXCLUDED.last_seen, is_active = TRUE`,
		imeiHash, req.AndroidID, accountID, now,
	)
	if err != nil {
		slog.Error("imei report: upsert failed", "error", err)
	}

	// 2. Count unique devices that have used this IMEI
	var deviceCount int
	h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(DISTINCT physical_device_id) FROM imei_registry WHERE imei = $1 AND is_active = TRUE`,
		imeiHash,
	).Scan(&deviceCount)

	// 3. Detect concurrent sessions: same IMEI, different devices, active recently
	var concurrentCount int
	h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(DISTINCT physical_device_id) FROM imei_registry
		  WHERE imei = $1 AND is_active = TRUE AND last_seen > NOW() - INTERVAL '1 hour'
		    AND physical_device_id != $2`,
		imeiHash, req.AndroidID,
	).Scan(&concurrentCount)

	concurrentSessions := concurrentCount > 0

	// 4. Compute trust impact
	if deviceCount > 5 {
		trustImpact = -30
	} else if deviceCount > 3 {
		trustImpact = -15
	} else if deviceCount > 1 {
		trustImpact = -5
	}
	if concurrentSessions {
		trustImpact -= 20
	}

	slog.Info("imei report processed",
		"device_id", req.AndroidID,
		"imei_present", req.Imei != "",
		"device_count", deviceCount,
		"concurrent", concurrentSessions,
		"trust_impact", trustImpact,
	)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: ImeiReportResponse{
			ImeiHash:           imeiHash,
			DeviceCount:        deviceCount,
			ConcurrentSessions: concurrentSessions,
			TrustImpact:        trustImpact,
		},
	})
}

// HandleImeiConcurrentCheck handles POST /api/v1/devices/imei/check
// Checks whether the given IMEI is active on multiple devices simultaneously.
func (h *DeviceHandler) HandleImeiConcurrentCheck(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		Imei string `json:"imei"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Imei == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "imei is required"})
		return
	}

	imeiHash := sha256Hex(req.Imei)

	var activeDevices []struct {
		DeviceID  string    `json:"device_id"`
		AccountID string    `json:"account_id"`
		LastSeen  time.Time `json:"last_seen"`
	}

	rows, err := h.deviceService.DB().Query(r.Context(),
		`SELECT physical_device_id, account_id, last_seen FROM imei_registry
		  WHERE imei = $1 AND is_active = TRUE
		  ORDER BY last_seen DESC`,
		imeiHash,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var d struct {
				DeviceID  string    `json:"device_id"`
				AccountID string    `json:"account_id"`
				LastSeen  time.Time `json:"last_seen"`
			}
			if err := rows.Scan(&d.DeviceID, &d.AccountID, &d.LastSeen); err == nil {
				activeDevices = append(activeDevices, d)
			}
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]any{
			"imei_hash":           imeiHash,
			"active_device_count": len(activeDevices),
			"devices":             activeDevices,
			"has_concurrent":      len(activeDevices) > 1,
			"same_account":        isSingleAccount(activeDevices, accountID),
		},
	})
}

func isSingleAccount(devices []struct {
	DeviceID  string    `json:"device_id"`
	AccountID string    `json:"account_id"`
	LastSeen  time.Time `json:"last_seen"`
}, accountID string) bool {
	if len(devices) <= 1 {
		return true
	}
	for _, d := range devices {
		if d.AccountID != accountID {
			return false
		}
	}
	return true
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h)
}

// ─── Behavior Events (correlation) ──────────────────────────

type BehaviorEventRequest struct {
	PhysicalDeviceID string         `json:"physical_device_id"`
	EventType        string         `json:"event_type"`
	Details          string         `json:"details"`
	Metadata         map[string]any `json:"metadata,omitempty"`
}

// HandleBehaviorEvent handles POST /api/v1/devices/behavior
// Logs a behavior event (password reset, OTP request, new payee, etc.)
// for correlation with identity changes.
func (h *DeviceHandler) HandleBehaviorEvent(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req BehaviorEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.PhysicalDeviceID == "" || req.EventType == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "physical_device_id and event_type are required"})
		return
	}

	ip := r.RemoteAddr
	metaJSON, _ := json.Marshal(req.Metadata)

	_, err := h.deviceService.DB().Exec(r.Context(),
		`INSERT INTO behavior_events
			(physical_device_id, account_id, event_type, severity, details, ip_address, metadata, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		req.PhysicalDeviceID, accountID, req.EventType, 5, req.Details, ip, string(metaJSON),
	)
	if err != nil {
		slog.Error("behavior event: insert failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to log behavior event"})
		return
	}

	// Score impact: check for risky combinations
	var riskFlags []string

	// Check if there was a recent SIM swap on this device
	var recentSimSwapCount int
	h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(*) FROM sim_events
		  WHERE physical_device_id = $1 AND event_type = 'SIM_SWAPPED'
		    AND created_at > NOW() - INTERVAL '15 minutes'`,
		req.PhysicalDeviceID,
	).Scan(&recentSimSwapCount)

	if recentSimSwapCount > 0 {
		switch req.EventType {
		case "password_reset":
			riskFlags = append(riskFlags, "sim_swap_then_password_reset")
		case "new_payee":
			riskFlags = append(riskFlags, "sim_swap_then_new_payee")
		case "large_transfer":
			riskFlags = append(riskFlags, "sim_swap_then_large_transfer")
		case "kyc_update":
			riskFlags = append(riskFlags, "sim_swap_then_kyc_update")
		}
	}

	// Check for OTP bursts
	var recentOtpCount int
	h.deviceService.DB().QueryRow(r.Context(),
		`SELECT COUNT(*) FROM behavior_events
		  WHERE physical_device_id = $1 AND event_type = 'otp_request'
		    AND created_at > NOW() - INTERVAL '5 minutes'`,
		req.PhysicalDeviceID,
	).Scan(&recentOtpCount)

	if req.EventType == "otp_request" && recentOtpCount > 5 {
		riskFlags = append(riskFlags, "otp_burst")
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]any{
			"risk_flags": riskFlags,
			"logged":     true,
		},
	})
}

// HandleSimHistory handles GET /api/v1/devices/sim-history?device_id=X
// Returns the full SIM→device binding history for a physical device.
func (h *DeviceHandler) HandleSimHistory(w http.ResponseWriter, r *http.Request) {
	deviceID := r.URL.Query().Get("device_id")
	if deviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device_id query param is required"})
		return
	}

	type simHistoryEntry struct {
		SubscriptionID   string    `json:"subscription_id"`
		CarrierName      string    `json:"carrier_name"`
		CountryIso       string    `json:"country_iso"`
		FirstSeen        time.Time `json:"first_seen"`
		LastSeen         time.Time `json:"last_seen"`
		DeviceCount      int       `json:"device_count"`
		IsActive         bool      `json:"is_active"`
	}

	rows, err := h.deviceService.DB().Query(r.Context(),
		`SELECT subscription_id, carrier_name, country_iso, first_seen, last_seen,
		        COALESCE(device_count, 0), is_active
		  FROM sim_device_history
		  WHERE physical_device_id = $1
		  ORDER BY last_seen DESC
		  LIMIT 50`,
		deviceID,
	)
	if err != nil {
		slog.Error("sim history query failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to query sim history"})
		return
	}
	defer rows.Close()

	var history []simHistoryEntry
	for rows.Next() {
		var e simHistoryEntry
		if err := rows.Scan(&e.SubscriptionID, &e.CarrierName, &e.CountryIso,
			&e.FirstSeen, &e.LastSeen, &e.DeviceCount, &e.IsActive); err != nil {
			continue
		}
		history = append(history, e)
	}

	// Also gather cross-device SIM reuse info for each subscription
	type reuseInfo struct {
		SubscriptionID string `json:"subscription_id"`
		DeviceIDs      []string `json:"device_ids"`
	}
	var reuseList []reuseInfo
	for _, entry := range history {
		devRows, err := h.deviceService.DB().Query(r.Context(),
			`SELECT physical_device_id FROM sim_device_history
			  WHERE subscription_id = $1 AND is_active = TRUE
			  ORDER BY last_seen DESC`,
			entry.SubscriptionID,
		)
		if err != nil {
			continue
		}
		var deviceIDs []string
		for devRows.Next() {
			var did string
			if err := devRows.Scan(&did); err == nil {
				deviceIDs = append(deviceIDs, did)
			}
		}
		devRows.Close()
		if len(deviceIDs) > 0 {
			reuseList = append(reuseList, reuseInfo{
				SubscriptionID: entry.SubscriptionID,
				DeviceIDs:      deviceIDs,
			})
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]any{
			"device_id":       deviceID,
			"sim_history":     history,
			"sim_reuse_info":  reuseList,
			"total_entries":   len(history),
		},
	})
}

// Deregister handles POST /api/v1/devices/deregister
// Revokes MQTT credentials and marks the device as offline
func (h *DeviceHandler) Deregister(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		DeviceID string `json:"device_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	device, err := h.deviceService.GetByID(r.Context(), req.DeviceID)
	if err != nil || device == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "device not found"})
		return
	}
	if device.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "device does not belong to account"})
		return
	}

	if err := h.mqttCredentialService.RevokeByDeviceID(r.Context(), req.DeviceID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to revoke MQTT credentials"})
		return
	}

	if err := h.deviceService.UpdateStatus(r.Context(), req.DeviceID, models.DeviceStatusOffline); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update device status"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]interface{}{
		"status":  "deregistered",
		"message": "MQTT credentials revoked and device set offline",
	}})
}

// Legacy List handler - GET /api/v1/devices
func (h *DeviceHandler) List(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)

	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list devices"})
		return
	}

	var result []map[string]interface{}
	for _, d := range devices {
		result = append(result, map[string]interface{}{
			"id":                 d.ID,
			"physical_device_id": d.PhysicalDeviceID,
			"sim_slot":           d.SIMSlot,
			"carrier":            d.Carrier,
			"status":             d.Status,
			"sim_health_status":  d.SIMHealthStatus,
			"health_trend_slope": d.HealthTrendSlope,
			"reliability_score":  d.ReliabilityScore,
			"reputation_score":   d.ReputationScore,
			"country_code":       d.CountryCode,
			"region":             d.Region,
			"online":             d.Status == models.DeviceStatusOnline,
			"last_seen":          d.LastSeen,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(result, pg), int64(len(result)))})
}

// Legacy Get handler - GET /api/v1/devices/{id}
func (h *DeviceHandler) Get(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("id")
	device, err := h.deviceService.GetByID(r.Context(), deviceID)
	if err != nil || device == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "device not found"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":                    device.ID,
			"physical_device_id":    device.PhysicalDeviceID,
			"sim_slot":              device.SIMSlot,
			"carrier":               device.Carrier,
			"status":                device.Status,
			"sim_health_status":     device.SIMHealthStatus,
			"health_trend_slope":    device.HealthTrendSlope,
			"reliability_score":     device.ReliabilityScore,
			"reputation_score":      device.ReputationScore,
			"success_rate_24h":      device.SuccessRate24h,
			"uptime_ratio_24h":      device.UptimeRatio24h,
			"avg_latency_ms":        device.AvgLatencyMs,
			"circuit_breaker_state": device.CircuitBreakerState,
			"messages_sent_count":   device.MessagesSentCount,
			"country_code":          device.CountryCode,
			"region":                device.Region,
			"last_seen":             device.LastSeen,
			"last_pong_at":          device.LastPongAt,
		},
	})
}

// getEnvOrDefault and detectCountryFromPhone are defined in helpers.go

// DeviceInfoRequest is sent by Android to report physical device metadata
// after login. Enables the backend to populate the physical_devices table
// with model, OS version, battery, network, and device state.
type DeviceInfoRequest struct {
	PhysicalDeviceID string  `json:"physical_device_id"`
	Model            string  `json:"model"`
	Manufacturer     string  `json:"manufacturer"`
	OSVersion        string  `json:"os_version"`
	SDKLevel         int     `json:"sdk_level"`
	AppVersion       string  `json:"app_version"`
	BatteryLevel     float64 `json:"battery_level"`
	IsCharging       bool    `json:"is_charging"`
	NetworkType      string  `json:"network_type"`
	DeviceState      string  `json:"device_state"` // ACTIVE, DOZE_RISK, OEM_KILL_RISK
}

// HandleDeviceInfo handles POST /api/v1/devices/info
// Called by Android after login to report physical device metadata.
// Upserts into physical_devices and updates device state on the logical device.
func (h *DeviceHandler) HandleDeviceInfo(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req DeviceInfoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.PhysicalDeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "physical_device_id is required"})
		return
	}

	// Upsert physical_devices table
	_, err := h.deviceService.DB().Exec(r.Context(),
		`INSERT INTO physical_devices (id, account_id, model, os_version, app_version, battery_level, network_type, device_state, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		 ON CONFLICT (id) DO UPDATE SET
		   model=$3, os_version=$4, app_version=$5, battery_level=$6, network_type=$7, device_state=$8, updated_at=NOW()`,
		req.PhysicalDeviceID, accountID, req.Model, req.OSVersion, req.AppVersion,
		req.BatteryLevel, req.NetworkType, req.DeviceState)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update device info"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
