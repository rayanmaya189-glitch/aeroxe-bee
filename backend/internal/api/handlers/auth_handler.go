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
	userService    *services.UserService
	authMiddleware *middleware.AuthMiddleware
}

func NewAuthHandler(accountService *services.AccountService, adminService *services.AdminService, userService *services.UserService, authMiddleware *middleware.AuthMiddleware) *AuthHandler {
	return &AuthHandler{
		accountService: accountService,
		adminService:   adminService,
		userService:    userService,
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

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "email and password are required"})
		return
	}

	// First, try to find the user in the users table (staff/admin login)
	user, userErr := h.userService.GetByEmail(r.Context(), req.Email)
	if userErr == nil && user != nil {
		if user.Status != "active" {
			writeJSON(w, http.StatusForbidden, APIResponse{Error: "account is " + user.Status})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid email or password"})
			return
		}

		token, err := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 15*time.Minute)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
			return
		}

		refresh, err := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 7*24*time.Hour)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "refresh token generation failed"})
			return
		}

		_ = h.userService.UpdateLastLogin(r.Context(), user.ID)

		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"token":        token,
				"refreshToken": refresh,
				"user": map[string]interface{}{
					"id":    user.ID,
					"email": user.Email,
					"name":  user.Name,
					"role":  user.Role,
				},
			},
		})
		return
	}

	// Not found in users table - try accounts table (member login)
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

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"token":        token,
			"refreshToken": refresh,
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
	accountID := middleware.GetAccountID(r.Context())

	// If no account ID from JWT, try body-based refresh
	if accountID == "" {
		var req struct {
			RefreshToken string `json:"refreshToken"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.RefreshToken != "" {
			claims, err := h.authMiddleware.ParseToken(req.RefreshToken)
			if err != nil || claims == nil {
				writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid refresh token"})
				return
			}
			accountID, _ = claims["sub"].(string)
			isStaff, _ := claims["admin"].(bool)

			if isStaff {
				user, err := h.userService.GetByID(r.Context(), accountID)
				if err != nil || user == nil {
					writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "user not found"})
					return
				}
				token, err := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 15*time.Minute)
				if err != nil {
					writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
					return
				}
				writeJSON(w, http.StatusOK, APIResponse{
					Success: true,
					Data:    map[string]interface{}{"token": token},
				})
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
				Data:    map[string]interface{}{"token": token},
			})
			return
		}
	}

	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "missing authentication"})
		return
	}

	// Use context admin flag (set by middleware)
	isStaff := middleware.GetIsAdmin(r.Context())

	if isStaff {
		user, err := h.userService.GetByID(r.Context(), accountID)
		if err != nil || user == nil {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "user not found"})
			return
		}
		token, err := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 15*time.Minute)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    map[string]interface{}{"token": token},
		})
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
		Data:    map[string]interface{}{"token": token},
	})
}

func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	isStaff := middleware.GetIsAdmin(r.Context())

	if isStaff {
		user, err := h.userService.GetByID(r.Context(), accountID)
		if err != nil || user == nil {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"id":         user.ID,
				"name":       user.Name,
				"email":      user.Email,
				"role":       user.Role,
				"status":     user.Status,
				"avatar":     user.Avatar,
				"last_login": user.LastLogin,
				"created_at": user.CreatedAt,
				"is_admin":   true,
			},
		})
		return
	}

	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":         account.ID,
			"name":       account.Name,
			"email":      account.Email,
			"plan":       account.PlanID,
			"status":     account.Status,
			"verified":   account.Verified,
			"risk_score": account.RiskScore,
			"created_at": account.CreatedAt,
			"is_admin":   false,
		},
	})
}

// UpdateProfile handles PUT /api/v1/auth/profile
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	isStaff := middleware.GetIsAdmin(r.Context())

	if isStaff {
		user, err := h.userService.GetByID(r.Context(), accountID)
		if err != nil || user == nil {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
			return
		}
		if req.Name != "" {
			user.Name = req.Name
		}
		if err := h.userService.Update(r.Context(), user); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update profile"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    map[string]interface{}{"id": user.ID, "name": user.Name},
		})
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
		Data:    map[string]interface{}{"id": account.ID, "name": account.Name},
	})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	if len(req.NewPassword) < 8 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "new password must be at least 8 characters"})
		return
	}

	isStaff := middleware.GetIsAdmin(r.Context())

	if isStaff {
		user, err := h.userService.GetByID(r.Context(), accountID)
		if err != nil || user == nil {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "incorrect password"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to hash password"})
			return
		}
		if err := h.userService.UpdatePassword(r.Context(), user.ID, string(hash)); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update password"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{Success: true})
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
