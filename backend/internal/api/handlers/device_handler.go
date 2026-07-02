package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

type DeviceHandler struct {
	deviceService *services.DeviceService
}

func NewDeviceHandler(deviceService *services.DeviceService) *DeviceHandler {
	return &DeviceHandler{deviceService: deviceService}
}

type RegisterDeviceRequest struct {
	PhysicalDeviceID string `json:"physical_device_id"`
	SIMSlot          int    `json:"sim_slot"`
	Carrier          string `json:"carrier"`
	Model            string `json:"model"`
	OSVersion        string `json:"os_version"`
	CountryCode      string `json:"country_code"`
	Region           string `json:"region"`
}

func (h *DeviceHandler) Register(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req RegisterDeviceRequest
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

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

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
			"id":                  device.ID,
			"physical_device_id":  device.PhysicalDeviceID,
			"sim_slot":            device.SIMSlot,
			"carrier":             device.Carrier,
			"status":              device.Status,
			"sim_health_status":   device.SIMHealthStatus,
			"health_trend_slope":  device.HealthTrendSlope,
			"reliability_score":   device.ReliabilityScore,
			"reputation_score":    device.ReputationScore,
			"success_rate_24h":    device.SuccessRate24h,
			"uptime_ratio_24h":    device.UptimeRatio24h,
			"avg_latency_ms":      device.AvgLatencyMs,
			"circuit_breaker_state": device.CircuitBreakerState,
			"messages_sent_count": device.MessagesSentCount,
			"country_code":        device.CountryCode,
			"region":              device.Region,
			"last_seen":           device.LastSeen,
			"last_pong_at":        device.LastPongAt,
		},
	})
}
