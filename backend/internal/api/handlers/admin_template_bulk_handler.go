package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminTemplateBulkHandler handles bulk template operations for admins
type AdminTemplateBulkHandler struct {
	db *pgxpool.Pool
}

func NewAdminTemplateBulkHandler(db *pgxpool.Pool) *AdminTemplateBulkHandler {
	return &AdminTemplateBulkHandler{db: db}
}

func (h *AdminTemplateBulkHandler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "ids array is required"})
		return
	}

	tag, err := h.db.Exec(r.Context(), `DELETE FROM templates WHERE id = ANY($1)`, req.IDs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk delete failed"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int64{"deleted": tag.RowsAffected()}})
}

func (h *AdminTemplateBulkHandler) BulkApprove(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "ids array is required"})
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE templates SET approval_status = 'approved', approved_at = NOW() WHERE id = ANY($1) AND approval_status = 'pending'`, req.IDs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk approve failed"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int64{"approved": tag.RowsAffected()}})
}

func (h *AdminTemplateBulkHandler) BulkReject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "ids array is required"})
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE templates SET approval_status = 'rejected' WHERE id = ANY($1) AND approval_status = 'pending'`, req.IDs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "bulk reject failed"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int64{"rejected": tag.RowsAffected()}})
}
