package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/telemetry"
)

type OTPHandler struct {
	otpService *services.OTPService
	metrics    *telemetry.Metrics
}

func NewOTPHandler(otpService *services.OTPService, metrics *telemetry.Metrics) *OTPHandler {
	return &OTPHandler{otpService: otpService, metrics: metrics}
}

type OTPSendRequest struct {
	Phone string `json:"phone"`
}

type OTPVerifyRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

func (h *OTPHandler) Send(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	accountID := middleware.GetAccountID(r.Context())

	var req OTPSendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "phone is required"})
		return
	}

	code, err := h.otpService.GenerateCode(6)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate code"})
		return
	}

	messageID := uuidV4()
	if err := h.otpService.StoreCode(r.Context(), req.Phone, code, messageID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to store OTP"})
		return
	}

	slog.Debug("OTP sent", "account_id", accountID, "phone", req.Phone, "message_id", messageID)
	h.metrics.ObserveOTPLatency(time.Since(startTime))

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message_id": messageID,
			"expires_in": 300,
		},
	})
}

func (h *OTPHandler) Verify(w http.ResponseWriter, r *http.Request) {
	var req OTPVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Phone == "" || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "phone and code are required"})
		return
	}

	valid, err := h.otpService.VerifyCode(r.Context(), req.Phone, req.Code)
	if err != nil {
		if errors.Is(err, services.ErrOTPNotFound) {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "OTP expired or not found"})
			return
		}
		if errors.Is(err, services.ErrOTPAccountLocked) {
			writeJSON(w, http.StatusTooManyRequests, APIResponse{Error: "too many failed attempts, account locked"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "verification failed"})
		return
	}

	if !valid {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid OTP code"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"verified": true,
			"message":  "OTP verified successfully",
		},
	})
}


