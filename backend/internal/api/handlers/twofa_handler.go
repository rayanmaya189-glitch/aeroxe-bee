package handlers

import (
	"net/http"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/services"
)

type TwoFAHandler struct {
	twoFAService *services.TwoFAService
}

func NewTwoFAHandler(twoFAService *services.TwoFAService) *TwoFAHandler {
	return &TwoFAHandler{twoFAService: twoFAService}
}

func (h *TwoFAHandler) Setup(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isStaff := middleware.GetIsAdmin(r.Context())

	var secret *services.TwoFASecret
	var err error

	if isStaff {
		secret, err = h.twoFAService.GetByUserID(r.Context(), accountID)
	} else {
		secret, err = h.twoFAService.GetByAccountID(r.Context(), accountID)
	}

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}

	if secret == nil {
		if isStaff {
			secret, err = h.twoFAService.Create(r.Context(), accountID, "")
		} else {
			secret, err = h.twoFAService.Create(r.Context(), "", accountID)
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create 2FA secret"})
			return
		}
	}

	totpURL := h.twoFAService.GetTOTPURL(secret.Secret, "AeroXe Bee", accountID)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"secret":  secret.Secret,
			"url":     totpURL,
			"enabled": secret.Enabled,
		},
	})
}

func (h *TwoFAHandler) Verify(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isStaff := middleware.GetIsAdmin(r.Context())

	var req struct {
		Code string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Code == "" || len(req.Code) != 6 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "code must be 6 digits"})
		return
	}

	var secret *services.TwoFASecret
	var err error

	if isStaff {
		secret, err = h.twoFAService.GetByUserID(r.Context(), accountID)
	} else {
		secret, err = h.twoFAService.GetByAccountID(r.Context(), accountID)
	}

	if err != nil || secret == nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "2FA not set up"})
		return
	}

	if !h.twoFAService.VerifyTOTP(secret.Secret, req.Code) {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid code"})
		return
	}

	if !secret.Enabled {
		if err := h.twoFAService.Enable(r.Context(), secret.ID); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to enable 2FA"})
			return
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"enabled": true},
	})
}

func (h *TwoFAHandler) Status(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isStaff := middleware.GetIsAdmin(r.Context())

	enabled := h.twoFAService.IsEnabled(r.Context(), func() string {
		if isStaff {
			return accountID
		}
		return ""
	}(), func() string {
		if !isStaff {
			return accountID
		}
		return ""
	}())

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]interface{}{"enabled": enabled},
	})
}

func (h *TwoFAHandler) Disable(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isStaff := middleware.GetIsAdmin(r.Context())

	var secret *services.TwoFASecret
	var err error

	if isStaff {
		secret, err = h.twoFAService.GetByUserID(r.Context(), accountID)
	} else {
		secret, err = h.twoFAService.GetByAccountID(r.Context(), accountID)
	}

	if err != nil || secret == nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "2FA not set up"})
		return
	}

	var req struct {
		Code string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if !h.twoFAService.VerifyTOTP(secret.Secret, req.Code) {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid code"})
		return
	}

	if err := h.twoFAService.Disable(r.Context(), secret.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to disable 2FA"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *TwoFAHandler) LoginVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
		Code  string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Token == "" || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "token and code are required"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
