package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/fraud"
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

type MemberOTPSendRequest struct {
	Phone string `json:"phone"`
}

type MemberOTPSendResponse struct {
	MessageID string `json:"message_id"`
	Code      string `json:"code"`
	ExpiresIn int    `json:"expires_in"`
}

type OTPStatusResponse struct {
	MessageID string    `json:"message_id"`
	Phone     string    `json:"phone"`
	Verified  bool      `json:"verified"`
	Attempts  int       `json:"attempts"`
	ExpiresAt time.Time `json:"expires_at"`
	Status    string    `json:"status"` // active, expired, verified
}

// Send generates an OTP and stores it. Returns the message_id for status
// tracking but NOT the code — code is only exposed through the member portal.
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

	if !fraud.IsValidPhoneNumber(req.Phone) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid phone number format"})
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

// MemberSend generates an OTP and returns the code — intended for the member
// portal where the member/admin needs the code to include in an SMS.
func (h *OTPHandler) MemberSend(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	accountID := middleware.GetAccountID(r.Context())

	var req MemberOTPSendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "phone is required"})
		return
	}

	if !fraud.IsValidPhoneNumber(req.Phone) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid phone number format"})
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

	slog.Debug("Member OTP generated", "account_id", accountID, "phone", req.Phone, "message_id", messageID)
	h.metrics.ObserveOTPLatency(time.Since(startTime))

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: MemberOTPSendResponse{
			MessageID: messageID,
			Code:      code,
			ExpiresIn: 300,
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

// Status returns the current state of an OTP by message_id — lets merchants
// check whether an OTP was sent, verified, or expired.
func (h *OTPHandler) Status(w http.ResponseWriter, r *http.Request) {
	messageID := r.PathValue("id")
	if messageID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message_id is required"})
		return
	}

	meta, err := h.otpService.GetMetadata(r.Context(), messageID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "OTP not found"})
		return
	}

	status := "active"
	if meta.Verified {
		status = "verified"
	} else if time.Now().After(meta.ExpiresAt) {
		status = "expired"
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: OTPStatusResponse{
			MessageID: meta.MessageID,
			Phone:     meta.Phone,
			Verified:  meta.Verified,
			Attempts:  meta.Attempts,
			ExpiresAt: meta.ExpiresAt,
			Status:    status,
		},
	})
}
