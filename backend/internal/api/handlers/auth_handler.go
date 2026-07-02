package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	accountService *services.AccountService
	adminService   *services.AdminService
	authMiddleware *middleware.AuthMiddleware
}

func NewAuthHandler(accountService *services.AccountService, adminService *services.AdminService, authMiddleware *middleware.AuthMiddleware) *AuthHandler {
	return &AuthHandler{
		accountService: accountService,
		adminService:   adminService,
		authMiddleware: authMiddleware,
	}
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "name, email, and password are required"})
		return
	}

	if len(req.Password) < 8 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "password must be at least 8 characters"})
		return
	}

	existing, err := h.accountService.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error checking email"})
		return
	}
	if existing != nil {
		writeJSON(w, http.StatusConflict, APIResponse{Error: "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to hash password"})
		return
	}

	account, err := h.accountService.Create(r.Context(), req.Name, req.Email, string(hash))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create account"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":    account.ID,
			"name":  account.Name,
			"email": account.Email,
			"plan":  account.PlanID,
		},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

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

	token, err := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 15*time.Minute)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
		return
	}

	refresh, err := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 7*24*time.Hour)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "refresh token generation failed"})
		return
	}

	// Include user object in response for frontend alignment
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"token":         token,
			"refreshToken":  refresh,
			"user": map[string]interface{}{
				"id":    account.ID,
				"email": account.Email,
				"name":  account.Name,
				"role":  "member",
			},
		},
	})
}

func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	// Support both JWT auth header and body-based refresh token
	accountID := middleware.GetAccountID(r.Context())
	
	// If no account ID from JWT, try body-based refresh
	if accountID == "" {
		var req struct {
			RefreshToken string `json:"refreshToken"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.RefreshToken != "" {
			// Parse the refresh token to get account ID
			claims, err := h.authMiddleware.ParseToken(req.RefreshToken)
			if err != nil || claims == nil {
				writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid refresh token"})
				return
			}
			accountID, _ = claims["sub"].(string)
		}
	}

	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "missing authentication"})
		return
	}

	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "account not found"})
		return
	}

	token, err := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 15*time.Minute)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"token": token,
		},
	})
}

func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}

	isAdmin := false
	adminAccounts, err := h.adminService.ListAccounts(r.Context(), 0, 1000)
	if err == nil {
		for _, a := range adminAccounts {
			if a.ID == accountID {
				isAdmin = true
				break
			}
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":        account.ID,
			"name":      account.Name,
			"email":     account.Email,
			"plan":      account.PlanID,
			"status":    account.Status,
			"verified":  account.Verified,
			"risk_score": account.RiskScore,
			"created_at": account.CreatedAt,
			"is_admin":  isAdmin,
		},
	})
}

// UpdateProfile handles PUT /api/v1/auth/profile
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}
	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}
	if req.Name != "" {
		account.Name = req.Name
	}
	if err := h.accountService.Update(r.Context(), account); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update profile"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":   account.ID,
			"name": account.Name,
		},
	})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.OldPassword)); err != nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "incorrect password"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to hash password"})
		return
	}

	account.PasswordHash = string(hash)
	if err := h.accountService.Update(r.Context(), account); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update password"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

