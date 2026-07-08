package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	accountService         *services.AccountService
	adminService           *services.AdminService
	userService            *services.UserService
	authMiddleware         *middleware.AuthMiddleware
	twoFAService           *services.TwoFAService
	sessionService         *services.SessionService
	passwordResetService   *services.PasswordResetService
	mailer                 *services.Mailer
	appBaseURL             string
}

func NewAuthHandler(accountService *services.AccountService, adminService *services.AdminService, userService *services.UserService, authMiddleware *middleware.AuthMiddleware, twoFAService *services.TwoFAService, sessionService *services.SessionService, passwordResetService *services.PasswordResetService, mailer *services.Mailer, appBaseURL string) *AuthHandler {
	return &AuthHandler{
		accountService:       accountService,
		adminService:         adminService,
		userService:          userService,
		authMiddleware:       authMiddleware,
		twoFAService:         twoFAService,
		sessionService:       sessionService,
		passwordResetService: passwordResetService,
		mailer:               mailer,
		appBaseURL:           appBaseURL,
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

	// Validate email format (OWASP A03: Injection)
	if !middleware.IsValidEmail(req.Email) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid email format"})
		return
	}

	// Enforce strong password policy (OWASP A07: Auth Failures)
	if pwErr := middleware.PasswordStrength(req.Password); pwErr != "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: pwErr})
		return
	}

	// Check both users and accounts tables for duplicate email
	existing, err := h.accountService.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error checking email"})
		return
	}
	if existing != nil {
		writeJSON(w, http.StatusConflict, APIResponse{Error: "email already registered"})
		return
	}

	existingUser, _ := h.userService.GetByEmail(r.Context(), req.Email)
	if existingUser != nil {
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

	// Create free subscription for new account
	h.accountService.CreateFreeSubscription(r.Context(), account.ID)

	// Generate JWT token so user is immediately logged in
	token, err := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 15*time.Minute)
	if err != nil {
		// Registration succeeded even without token
		writeJSON(w, http.StatusCreated, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"id":    account.ID,
				"name":  account.Name,
				"email": account.Email,
				"plan":  account.PlanID,
			},
		})
		return
	}

	refresh, _ := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 7*24*time.Hour)

	writeJSON(w, http.StatusCreated, APIResponse{
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

		// Check if 2FA is enabled for this user
		twoFAEnabled := h.twoFAService.IsEnabled(r.Context(), user.ID, "")
		if twoFAEnabled {
			tempToken, err := h.authMiddleware.GenerateTokenWithPurpose(user.ID, user.Email, true, 5*time.Minute, "2fa_pending")
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
				return
			}
			writeJSON(w, http.StatusOK, APIResponse{
				Success: true,
				Data: map[string]interface{}{
					"requires_2fa":   true,
					"two_fa_pending": true,
					"two_fa_token":   tempToken,
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

		_ = h.userService.UpdateLastLogin(r.Context(), user.ID)

		// Record session
		if h.sessionService != nil {
			_ = h.sessionService.Create(r.Context(), user.ID, "user", r.RemoteAddr, r.UserAgent(), token)
		}

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

	// Check if 2FA is enabled for this account
	if h.twoFAService.IsEnabled(r.Context(), "", account.ID) {
		tempToken, err := h.authMiddleware.GenerateTokenWithPurpose(account.ID, account.Email, false, 5*time.Minute, "2fa_pending")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "token generation failed"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"requires_2fa":   true,
				"two_fa_pending": true,
				"two_fa_token":   tempToken,
				"user": map[string]interface{}{
					"id":    account.ID,
					"email": account.Email,
					"name":  account.Name,
					"role":  "member",
				},
			},
		})
		return
	}

	// Record session
	if h.sessionService != nil {
		_ = h.sessionService.Create(r.Context(), account.ID, "account", r.RemoteAddr, r.UserAgent(), token)
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

	// Enforce strong password policy (OWASP A07: Auth Failures)
	if pwErr := middleware.PasswordStrength(req.NewPassword); pwErr != "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: pwErr})
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

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Email == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "email is required"})
		return
	}

	account, err := h.accountService.GetByEmail(r.Context(), req.Email)
	if err != nil || account == nil {
		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "If that email is registered, you will receive a password reset link."}})
		return
	}

	rawToken, err := h.passwordResetService.GenerateToken(r.Context(), account.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate reset token"})
		return
	}

	resetLink := fmt.Sprintf("%s/reset-password/%s", h.appBaseURL, rawToken)
	if err := h.mailer.SendPasswordReset(req.Email, resetLink); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to send reset email"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "If that email is registered, you will receive a password reset link."}})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "token and new_password are required"})
		return
	}

	if pwErr := middleware.PasswordStrength(req.NewPassword); pwErr != "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: pwErr})
		return
	}

	accountID, err := h.passwordResetService.ValidateToken(r.Context(), req.Token)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to hash password"})
		return
	}

	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}
	account.PasswordHash = string(hash)
	if err := h.accountService.Update(r.Context(), account); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update password"})
		return
	}

	if err := h.passwordResetService.MarkTokenUsed(r.Context(), req.Token); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to mark token as used"})
		return
	}

	h.mailer.SendPasswordResetSuccess(account.Email)
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "Password has been reset successfully."}})
}

// Login2FA handles POST /api/v1/auth/login/2fa — second step after password
func (h *AuthHandler) Login2FA(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"` // temporary token from first login step
		Code  string `json:"code"`  // 6-digit TOTP code
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Token == "" || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "token and code are required"})
		return
	}

	// Parse the temporary 2FA token
	claims, err := h.authMiddleware.ParseToken(req.Token)
	if err != nil || claims == nil {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid or expired 2FA token"})
		return
	}

	// Check this is a 2FA pending token
	purpose, _ := claims["purpose"].(string)
	if purpose != "2fa_pending" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid token type"})
		return
	}

	userID, _ := claims["sub"].(string)
	isStaff, _ := claims["admin"].(bool)

	// Verify the TOTP code
	if isStaff {
		user, err := h.userService.GetByID(r.Context(), userID)
		if err != nil || user == nil {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "user not found"})
			return
		}

		valid, err := h.twoFAService.VerifyCode(r.Context(), user.ID, req.Code)
		if err != nil || !valid {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid 2FA code"})
			return
		}

		// Issue full tokens
		token, _ := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 15*time.Minute)
		refresh, _ := h.authMiddleware.GenerateToken(user.ID, user.Email, true, 7*24*time.Hour)

		_ = h.userService.UpdateLastLogin(r.Context(), user.ID)

		// Record session
		if h.sessionService != nil {
			_ = h.sessionService.Create(r.Context(), user.ID, "user", r.RemoteAddr, r.UserAgent(), token)
		}

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

		account, err := h.accountService.GetByID(r.Context(), userID)
		if err != nil || account == nil {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "account not found"})
			return
		}

		valid, err := h.twoFAService.VerifyCode(r.Context(), account.ID, req.Code)
		if err != nil || !valid {
			writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "invalid 2FA code"})
			return
		}

		token, _ := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 15*time.Minute)
		refresh, _ := h.authMiddleware.GenerateToken(account.ID, account.Email, false, 7*24*time.Hour)

		// Record session
		if h.sessionService != nil {
			_ = h.sessionService.Create(r.Context(), account.ID, "account", r.RemoteAddr, r.UserAgent(), token)
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
