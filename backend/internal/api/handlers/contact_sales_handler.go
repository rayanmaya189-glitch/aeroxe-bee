package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ContactSalesHandler handles the public Contact Sales form and admin listing.
type ContactSalesHandler struct {
	db *pgxpool.Pool
}

func NewContactSalesHandler(db *pgxpool.Pool) *ContactSalesHandler {
	return &ContactSalesHandler{db: db}
}

type contactSubmissionRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Company string `json:"company"`
	Phone   string `json:"phone"`
	Plan    string `json:"plan"`
	Message string `json:"message"`
}

// Submit stores a contact sales form submission. Public endpoint - no auth.
func (h *ContactSalesHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var req contactSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	// Trim and validate
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Email == "" || req.Message == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "name, email, and message are required"})
		return
	}

	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid email address"})
		return
	}

	// Extract client IP
	ipAddress := r.Header.Get("X-Forwarded-For")
	if ipAddress == "" {
		ipAddress = r.Header.Get("X-Real-IP")
	}
	if ipAddress == "" {
		parts := strings.Split(r.RemoteAddr, ":")
		if len(parts) > 0 {
			ipAddress = parts[0]
		}
	}

	id := uuid.New().String()
	now := time.Now()

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO contact_submissions (id, name, email, company, phone, plan_interest, message, status, ip_address, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $9)`,
		id, req.Name, req.Email, req.Company, req.Phone, req.Plan, req.Message, ipAddress, now,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit, please try again later"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data:    map[string]string{"id": id, "status": "new"},
	})
}

type contactSubmissionResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Company      string    `json:"company"`
	Phone        string    `json:"phone"`
	PlanInterest string    `json:"plan_interest"`
	Message      string    `json:"message"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	IPAddress    string    `json:"ip_address"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ListSubmissions returns all contact submissions for the admin panel.
func (h *ContactSalesHandler) ListSubmissions(w http.ResponseWriter, r *http.Request) {
	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	statusFilter := r.URL.Query().Get("status")

	var rows pgx.Rows
	var err error

	if statusFilter != "" {
		rows, err = h.db.Query(r.Context(),
			`SELECT id, name, email, company, phone, plan_interest, message, status, notes, ip_address, created_at, updated_at
			 FROM contact_submissions WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
			statusFilter, pageSize, offset,
		)
	} else {
		rows, err = h.db.Query(r.Context(),
			`SELECT id, name, email, company, phone, plan_interest, message, status, notes, ip_address, created_at, updated_at
			 FROM contact_submissions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
			pageSize, offset,
		)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list submissions"})
		return
	}
	defer rows.Close()

	var results []contactSubmissionResponse
	for rows.Next() {
		var s contactSubmissionResponse
		if err := rows.Scan(&s.ID, &s.Name, &s.Email, &s.Company, &s.Phone, &s.PlanInterest, &s.Message, &s.Status, &s.Notes, &s.IPAddress, &s.CreatedAt, &s.UpdatedAt); err != nil {
			continue
		}
		results = append(results, s)
	}
	if results == nil {
		results = []contactSubmissionResponse{}
	}

	// Get total count
	var total int64
	countQuery := `SELECT COUNT(*) FROM contact_submissions`
	if statusFilter != "" {
		h.db.QueryRow(r.Context(), countQuery+` WHERE status = $1`, statusFilter).Scan(&total)
	} else {
		h.db.QueryRow(r.Context(), countQuery).Scan(&total)
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data":        results,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

// UpdateStatus allows admin to change submission status.
func (h *ContactSalesHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	validStatuses := map[string]bool{"new": true, "contacted": true, "converted": true, "closed": true}
	if !validStatuses[req.Status] {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid status"})
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE contact_submissions SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3`,
		req.Status, req.Notes, id,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "submission not found"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
