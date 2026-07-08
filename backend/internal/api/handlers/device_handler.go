package handlers

import (
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
	"github.com/aeroxe-bee/backend/internal/mqtt"
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
	passwordFile          *mqtt.PasswordFile
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
	passwordFile *mqtt.PasswordFile,
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
		passwordFile:          passwordFile,
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

	// Track credential in DB for audit trail (actual MQTT auth uses shared "devices" credentials)
	if _, _, err := h.mqttCredentialService.Create(r.Context(), deviceID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create MQTT credentials"})
		return
	}

	// Sync device user to Mosquitto password file
	if h.passwordFile != nil {
		if err := h.passwordFile.AddDeviceUser(deviceID, h.devicePassword); err != nil {
			slog.Error("failed to add MQTT user to password file",
				"device_id", deviceID,
				"error", err,
			)
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to configure MQTT auth"})
			return
		}
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
				"username": deviceID,
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
		SIMSlot:             1,
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
	// Existing device — update to online
	_ = h.deviceService.UpdateStatus(r.Context(), deviceID, models.DeviceStatusOnline)
}

	// Revoke any existing active MQTT credentials for this device
	if err := h.mqttCredentialService.RevokeByDeviceID(r.Context(), deviceID); err != nil {
		slog.Error("failed to revoke old MQTT credentials",
			"device_id", deviceID,
			"error", err,
		)
	}

	// Track credential in DB for audit trail (actual MQTT auth uses shared "devices" credentials)
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

	// Sync device user to Mosquitto password file
	if h.passwordFile != nil {
		if err := h.passwordFile.AddDeviceUser(deviceID, h.devicePassword); err != nil {
			slog.Error("failed to add MQTT user to password file during login",
				"device_id", deviceID,
				"account_id", account.ID,
				"error", err,
			)
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to configure MQTT auth"})
			return
		}
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

	// 2. Log each event to sim_events table
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
	}

	// 3. Compute trust score penalty
	penalty, action := trustScorePenalty(req.Events, req.Frequency)
	newTrustScore := 100.0 - penalty
	if newTrustScore < 0 {
		newTrustScore = 0
	}

	// 4. Update physical_device trust_score and device status if blocked
	_, _ = h.deviceService.DB().Exec(r.Context(),
		`UPDATE physical_devices SET trust_score = $1, updated_at = NOW() WHERE id = $2`,
		newTrustScore, req.DeviceID,
	)

	if action == "BLOCK" {
		// Mark all logical devices on this physical device as OFFLINE
		_, _ = h.deviceService.DB().Exec(r.Context(),
			`UPDATE devices SET status = 'OFFLINE', updated_at = NOW() WHERE physical_device_id = $1`,
			req.DeviceID,
		)
	}

	// 5. Check recent event count for anomaly detection
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
		"penalty", penalty,
		"action", action,
		"recent_events_1h", recentCount,
	)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"action":               action,
			"trust_score":          newTrustScore,
			"penalty":              penalty,
			"recent_events_1h":     recentCount,
			"device_id":            req.DeviceID,
			"sim_events_logged":    len(req.Events),
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

	// Remove device user from Mosquitto password file
	if h.passwordFile != nil {
		if err := h.passwordFile.RemoveDeviceUser(req.DeviceID); err != nil {
			slog.Error("failed to remove MQTT user from password file",
				"device_id", req.DeviceID,
				"error", err,
			)
		}
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
