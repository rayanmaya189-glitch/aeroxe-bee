package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminWebhookBulkHandler handles bulk webhook operations for admins
type AdminWebhookBulkHandler struct {
	db *pgxpool.Pool
}

func NewAdminWebhookBulkHandler(db *pgxpool.Pool) *AdminWebhookBulkHandler {
	return &AdminWebhookBulkHandler{db: db}
}

func (h *AdminWebhookBulkHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "ids array is required"})
		return
	}

	tag, err := h.db.Exec(r.Context(), `DELETE FROM webhooks WHERE id = ANY($1)`, req.IDs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk delete failed"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int64{"deleted": tag.RowsAffected()}})
}
