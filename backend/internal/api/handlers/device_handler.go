package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

type DeviceHandler struct {
	deviceService         *services.DeviceService
	messageService        *services.MessageService
	apiKeyService         *services.APIKeyService
	mqttCredentialService *services.MQTTCredentialService
	mqttBrokerURL         string
	authMiddleware        *middleware.AuthMiddleware
}

func NewDeviceHandler(
	deviceService *services.DeviceService,
	messageService *services.MessageService,
	apiKeyService *services.APIKeyService,
	mqttCredentialService *services.MQTTCredentialService,
	mqttBrokerURL string,
	authMiddleware *middleware.AuthMiddleware,
) *DeviceHandler {
	return &DeviceHandler{
		deviceService:         deviceService,
		messageService:        messageService,
		apiKeyService:         apiKeyService,
		mqttCredentialService: mqttCredentialService,
		mqttBrokerURL:         mqttBrokerURL,
		authMiddleware:        authMiddleware,
	}
}

// RegisterRequest matches the Android RegisterRequest model
type RegisterRequest struct {
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
	var req RegisterRequest
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

	deviceID := fmt.Sprintf("%s-sim%d", req.PhysicalDeviceID, req.SIMSlot)

	device := models.Device{
		ID:                deviceID,
		PhysicalDeviceID:  req.PhysicalDeviceID,
		AccountID:         accountID,
		SIMSlot:           req.SIMSlot,
		Carrier:           req.Carrier,
		Status:            models.DeviceStatusOnline,
		SIMHealthStatus:   models.SIMHealthHealthy,
		ReliabilityScore:  0.5,
		ReputationScore:   0.5,
		MaxPerMinute:      10,
		MaxPerHour:        100,
		CircuitBreakerState: models.CBStateClosed,
	}

	if err := h.deviceService.Create(r.Context(), &device); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to register device"})
		return
	}

	cred, password, err := h.mqttCredentialService.Create(r.Context(), deviceID)
	if err != nil {
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
			"device_id":          deviceID,
			"token":              token,
			"mqtt_broker_url":    h.mqttBrokerURL,
			"mqtt_credential_id": cred.ID,
			"mqtt_username":      cred.Username,
			"mqtt_password":      password,
		},
	})
}

// StatusUpdateRequest matches the Android StatusUpdateRequest model
type StatusUpdateRequest struct {
	MessageID      string  `json:"message_id"`
	DeviceID       string  `json:"device_id"`
	Status         string  `json:"status"`
	DeliveryStatus string  `json:"delivery_status"`
	ConfidenceScore float64 `json:"confidence_score"`
	Error          *string `json:"error"`
	SIMSlot        int     `json:"sim_slot"`
	Timestamp      int64   `json:"timestamp"`
}

// HandleStatusUpdate handles POST /api/v1/devices/status
func (h *DeviceHandler) HandleStatusUpdate(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req StatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.MessageID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message_id is required"})
		return
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
		ID:                deviceID,
		PhysicalDeviceID:  req.PhysicalDeviceID,
		AccountID:         accountID,
		SIMSlot:           req.SIMSlot,
		Carrier:           req.Carrier,
		Status:            models.DeviceStatusOnline,
		SIMHealthStatus:   models.SIMHealthHealthy,
		ReliabilityScore:  0.5,
		ReputationScore:   0.5,
		CountryCode:       req.CountryCode,
		Region:            req.Region,
		MaxPerMinute:      10,
		MaxPerHour:        100,
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

// Legacy List handler - GET /api/v1/devices
func (h *DeviceHandler) List(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list devices"})
		return
	}

	var result []map[string]interface{}
	for _, d := range devices {
		result = append(result, map[string]interface{}{
			"id":                  d.ID,
			"physical_device_id":  d.PhysicalDeviceID,
			"sim_slot":            d.SIMSlot,
			"carrier":             d.Carrier,
			"status":              d.Status,
			"sim_health_status":   d.SIMHealthStatus,
			"health_trend_slope":  d.HealthTrendSlope,
			"reliability_score":   d.ReliabilityScore,
			"reputation_score":    d.ReputationScore,
			"country_code":        d.CountryCode,
			"region":              d.Region,
			"online":              d.Status == models.DeviceStatusOnline,
			"last_seen":           d.LastSeen,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
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
			"id":                   device.ID,
			"physical_device_id":   device.PhysicalDeviceID,
			"sim_slot":             device.SIMSlot,
			"carrier":              device.Carrier,
			"status":               device.Status,
			"sim_health_status":    device.SIMHealthStatus,
			"health_trend_slope":   device.HealthTrendSlope,
			"reliability_score":    device.ReliabilityScore,
			"reputation_score":     device.ReputationScore,
			"success_rate_24h":     device.SuccessRate24h,
			"uptime_ratio_24h":     device.UptimeRatio24h,
			"avg_latency_ms":       device.AvgLatencyMs,
			"circuit_breaker_state": device.CircuitBreakerState,
			"messages_sent_count":  device.MessagesSentCount,
			"country_code":         device.CountryCode,
			"region":               device.Region,
			"last_seen":            device.LastSeen,
			"last_pong_at":         device.LastPongAt,
		},
	})
}

func uuidV4() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}


