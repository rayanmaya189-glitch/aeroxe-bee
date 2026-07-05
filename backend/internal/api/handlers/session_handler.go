package handlers

import (
	"net/http"
	"strings"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/services"
)

type SessionHandler struct {
	sessionService *services.SessionService
}

func NewSessionHandler(sessionService *services.SessionService) *SessionHandler {
	return &SessionHandler{sessionService: sessionService}
}

// ListSessions handles GET /api/v1/auth/sessions
func (h *SessionHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	isStaff := middleware.GetIsAdmin(r.Context())
	userType := "account"
	if isStaff {
		userType = "user"
	}

	sessions, err := h.sessionService.ListActive(r.Context(), accountID, userType)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list sessions"})
		return
	}

	pg := ParsePagination(r, 20, 100)
	total := int64(len(sessions))
	start := pg.Offset
	if start > len(sessions) {
		start = len(sessions)
	}
	end := start + pg.PageSize
	if end > len(sessions) {
		end = len(sessions)
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    pg.ToResponse(sessions[start:end], total),
	})
}

// RevokeSession handles DELETE /api/v1/auth/sessions/{id}
func (h *SessionHandler) RevokeSession(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	// Extract session ID from URL path: /api/v1/auth/sessions/{id}
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/auth/sessions/")
	sessionID := strings.TrimSuffix(path, "/")
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "session ID required"})
		return
	}

	if err := h.sessionService.Revoke(r.Context(), sessionID, accountID); err != nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "session not found or already revoked"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "session revoked"}})
}

// RevokeAllSessions handles DELETE /api/v1/auth/sessions
func (h *SessionHandler) RevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	if accountID == "" {
		writeJSON(w, http.StatusUnauthorized, APIResponse{Error: "unauthorized"})
		return
	}

	isStaff := middleware.GetIsAdmin(r.Context())
	userType := "account"
	if isStaff {
		userType = "user"
	}

	// Revoke all except the current session (identified by token hash from Authorization header)
	authHeader := r.Header.Get("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")
	currentHash := h.sessionService.HashToken(token)

	if err := h.sessionService.RevokeAll(r.Context(), accountID, userType, currentHash); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to revoke sessions"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "all other sessions revoked"}})
}
