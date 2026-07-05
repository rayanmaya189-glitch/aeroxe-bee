package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/services"
)

type KycAdminHandler struct {
	sessionService *services.SessionService
	db             services.DatabaseQuerier
}

func NewKycAdminHandler(db services.DatabaseQuerier) *KycAdminHandler {
	return &KycAdminHandler{db: db}
}

func (h *KycAdminHandler) List(w http.ResponseWriter, r *http.Request) {
	_ = middleware.GetAccountID(r.Context()) // verify auth

	status := r.URL.Query().Get("status")
	pg := ParsePagination(r, 20, 100)
	dateRange := ParseDateRange(r)

	query := `SELECT k.id, k.user_id, COALESCE(u.email, a.email) AS user_email,
		COALESCE(u.name, a.name) AS user_name, k.full_name, k.document_type,
		k.document_number, k.document_url, k.status, k.reviewed_by, k.reviewed_at, k.created_at
		FROM kyc_records k
		LEFT JOIN users u ON k.user_id = u.id::text
		LEFT JOIN accounts a ON k.account_id = a.id`
	whereClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		whereClauses = append(whereClauses, `k.status = $` + itoa(argIdx))
		args = append(args, status)
		argIdx++
	}
	if dateRange.DateFrom != nil {
		whereClauses = append(whereClauses, `k.created_at >= $` + itoa(argIdx))
		args = append(args, *dateRange.DateFrom)
		argIdx++
	}
	if dateRange.DateTo != nil {
		whereClauses = append(whereClauses, `k.created_at <= $` + itoa(argIdx))
		args = append(args, *dateRange.DateTo)
		argIdx++
	}
	if len(whereClauses) > 0 {
		query += ` WHERE ` + whereClauses[0]
		for _, wc := range whereClauses[1:] {
			query += ` AND ` + wc
		}
	}
	query += ` ORDER BY k.created_at DESC LIMIT $` + itoa(argIdx) + ` OFFSET $` + itoa(argIdx+1)
	args = append(args, pg.PageSize, pg.Offset)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list KYC submissions"})
		return
	}
	defer rows.Close()

	type KycRow struct {
		ID             string     `json:"id"`
		UserID         string     `json:"user_id"`
		UserEmail      string     `json:"user_email"`
		UserName       string     `json:"user_name"`
		FullName       string     `json:"full_name"`
		DocumentType   string     `json:"document_type"`
		DocumentNumber string     `json:"document_number"`
		DocumentURL    string     `json:"document_url"`
		Status         string     `json:"status"`
		ReviewedBy     *string    `json:"reviewed_by"`
		ReviewedAt     *time.Time `json:"reviewed_at"`
		CreatedAt      time.Time  `json:"created_at"`
	}

	var results []KycRow
	for rows.Next() {
		var row KycRow
		if err := rows.Scan(&row.ID, &row.UserID, &row.UserEmail, &row.UserName,
			&row.FullName, &row.DocumentType, &row.DocumentNumber, &row.DocumentURL,
			&row.Status, &row.ReviewedBy, &row.ReviewedAt, &row.CreatedAt); err != nil {
			continue
		}
		results = append(results, row)
	}

	// Count total
	var total int64
	countQuery := `SELECT COUNT(*) FROM kyc_records k LEFT JOIN users u ON k.user_id = u.id::text LEFT JOIN accounts a ON k.account_id = a.id`
	if len(whereClauses) > 0 {
		countQuery += ` WHERE ` + whereClauses[0]
		for _, wc := range whereClauses[1:] {
			countQuery += ` AND ` + wc
		}
	}
	countArgs := args[:len(args)-2] // exclude LIMIT/OFFSET args
	_ = h.db.QueryRow(r.Context(), countQuery, countArgs...).Scan(&total)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    pg.ToResponse(results, total),
	})
}

func (h *KycAdminHandler) Approve(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "id required"})
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	now := time.Now()
	_, err := h.db.Exec(r.Context(),
		`UPDATE kyc_records SET status = 'verified', reviewed_by = $1, reviewed_at = $2, review_notes = $3 WHERE id = $4`,
		adminID, now, req.Notes, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve KYC"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "KYC approved"}})
}

func (h *KycAdminHandler) Reject(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "id required"})
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	now := time.Now()
	_, err := h.db.Exec(r.Context(),
		`UPDATE kyc_records SET status = 'rejected', reviewed_by = $1, reviewed_at = $2, review_notes = $3 WHERE id = $4`,
		adminID, now, req.Notes, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject KYC"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"message": "KYC rejected"}})
}
