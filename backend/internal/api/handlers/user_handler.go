package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userService     *services.UserService
	authMiddleware  *middleware.AuthMiddleware
}

func NewUserHandler(userService *services.UserService, authMiddleware *middleware.AuthMiddleware) *UserHandler {
	return &UserHandler{
		userService:    userService,
		authMiddleware: authMiddleware,
	}
}

// List handles GET /admin/users with server-side pagination and filtering
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)
	opts := services.UserFilterOptions{
		Search:    r.URL.Query().Get("search"),
		Role:      r.URL.Query().Get("role"),
		Status:    r.URL.Query().Get("status"),
		SortBy:    r.URL.Query().Get("sortBy"),
		SortOrder: r.URL.Query().Get("sortOrder"),
		Page:      pg.Page,
		PageSize:  pg.PageSize,
	}

	result, err := h.userService.ListUsers(r.Context(), opts)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list users: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

// Get handles GET /admin/users/{id}
func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: user})
}

// Create handles POST /admin/users
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "name, email, and password are required"})
		return
	}

	// Validate email format (OWASP A03)
	if !middleware.IsValidEmail(req.Email) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid email format"})
		return
	}

	// Enforce strong password policy (OWASP A07)
	if pwErr := middleware.PasswordStrength(req.Password); pwErr != "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: pwErr})
		return
	}

	// Check duplicate email
	existing, err := h.userService.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if existing != nil {
		writeJSON(w, http.StatusConflict, APIResponse{Error: "email already exists"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to hash password"})
		return
	}

	role := req.Role
	if role == "" {
		role = "staff"
	}
	if !middleware.ValidateRole(role) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "role must be one of: admin, staff, viewer"})
		return
	}

	user := &models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         role,
		Status:       "active",
	}

	if err := h.userService.Create(r.Context(), user); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create user"})
		return
	}

	// Log activity
	accountID := middleware.GetAccountID(r.Context())
	logActivity(r.Context(), h.userService, accountID, "user_created", "user", "", "Created user: "+req.Email)

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// Update handles PUT /admin/users/{id}
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
		return
	}

	var req struct {
		Name   string `json:"name"`
		Role   string `json:"role"`
		Status string `json:"status"`
		Avatar string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Role != "" {
		validRoles := map[string]bool{"admin": true, "staff": true, "viewer": true}
		if !validRoles[req.Role] {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "role must be one of: admin, staff, viewer"})
			return
		}
		user.Role = req.Role
	}
	if req.Status != "" {
		validStatuses := map[string]bool{"active": true, "inactive": true, "suspended": true}
		if !validStatuses[req.Status] {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "status must be one of: active, inactive, suspended"})
			return
		}
		user.Status = req.Status
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}

	if err := h.userService.Update(r.Context(), user); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update user"})
		return
	}

	accountID := middleware.GetAccountID(r.Context())
	logActivity(r.Context(), h.userService, accountID, "user_updated", "user", id, "Updated user: "+user.Email)

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: user})
}

// Delete handles DELETE /admin/users/{id}
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "user not found"})
		return
	}

	if err := h.userService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete user"})
		return
	}

	accountID := middleware.GetAccountID(r.Context())
	logActivity(r.Context(), h.userService, accountID, "user_deleted", "user", id, "Deleted user: "+user.Email)

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// BulkDelete handles POST /admin/users/bulk-delete
func (h *UserHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if err := h.userService.BulkDelete(r.Context(), req.IDs); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk delete failed"})
		return
	}

	accountID := middleware.GetAccountID(r.Context())
	logActivity(r.Context(), h.userService, accountID, "users_bulk_deleted", "user", "", "Bulk deleted users")

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// BulkUpdate handles POST /admin/users/bulk-update
func (h *UserHandler) BulkUpdate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs  []string               `json:"ids"`
		Data map[string]interface{} `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if err := h.userService.BulkUpdate(r.Context(), req.IDs, req.Data); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk update failed"})
		return
	}

	accountID := middleware.GetAccountID(r.Context())
	logActivity(r.Context(), h.userService, accountID, "users_bulk_updated", "user", "", "Bulk updated users")

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// GetActivityLog handles GET /admin/activity
func (h *UserHandler) GetActivityLog(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)

	activities, total, err := h.userService.ListActivityLog(r.Context(), pg.Offset, pg.PageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get activity log"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(activities, int64(total))})
}

// logActivity writes an entry to the activity_log table (best effort)
func logActivity(ctx context.Context, svc *services.UserService, userID, action, resourceType, resourceID, description string) {
	if svc == nil {
		return
	}
	_ = svc.LogActivity(ctx, userID, action, resourceType, resourceID, description)
}


