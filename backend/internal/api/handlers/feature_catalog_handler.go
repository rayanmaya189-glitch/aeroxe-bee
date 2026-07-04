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

// FeatureCatalogHandler manages the global feature catalog.
type FeatureCatalogHandler struct {
	db *pgxpool.Pool
}

func NewFeatureCatalogHandler(db *pgxpool.Pool) *FeatureCatalogHandler {
	return &FeatureCatalogHandler{db: db}
}

type featureCatalogRequest struct {
	Name     string `json:"name"`
	Category string `json:"category"`
}

// List returns all catalog features. Public (used by PlansPage suggestions).
func (h *FeatureCatalogHandler) List(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("active_only") == "true"

	var rows pgx.Rows
	var err error
	if activeOnly {
		rows, err = h.db.Query(r.Context(),
			`SELECT id, name, category, sort_order, active, created_at, updated_at FROM feature_catalog WHERE active = true ORDER BY category, sort_order`)
	} else {
		rows, err = h.db.Query(r.Context(),
			`SELECT id, name, category, sort_order, active, created_at, updated_at FROM feature_catalog ORDER BY category, sort_order`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list features"})
		return
	}
	defer rows.Close()

	type item struct {
		ID        string    `json:"id"`
		Name      string    `json:"name"`
		Category  string    `json:"category"`
		SortOrder int       `json:"sort_order"`
		Active    bool      `json:"active"`
		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	var results []item
	for rows.Next() {
		var i item
		if err := rows.Scan(&i.ID, &i.Name, &i.Category, &i.SortOrder, &i.Active, &i.CreatedAt, &i.UpdatedAt); err != nil {
			continue
		}
		results = append(results, i)
	}
	if results == nil {
		results = []item{}
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: results})
}

// Create adds a new feature to the catalog. Admin only.
func (h *FeatureCatalogHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req featureCatalogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Category = strings.TrimSpace(req.Category)

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "name is required"})
		return
	}
	if req.Category == "" {
		req.Category = "general"
	}

	id := uuid.New().String()
	now := time.Now()

	tag, err := h.db.Exec(r.Context(),
		`INSERT INTO feature_catalog (id, name, category, sort_order, active, created_at, updated_at)
		 VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order),0)+1 FROM feature_catalog WHERE category=$4), true, $5, $5)
		 ON CONFLICT (name) DO NOTHING`,
		id, req.Name, req.Category, req.Category, now,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create feature"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusConflict, APIResponse{Error: "feature already exists"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data:    map[string]string{"id": id, "name": req.Name, "category": req.Category},
	})
}

// UpdateStatus toggles active/inactive. Admin only.
func (h *FeatureCatalogHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE feature_catalog SET active = $1, updated_at = NOW() WHERE id = $2`, req.Active, id,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "feature not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Delete removes a feature from the catalog. Admin only.
func (h *FeatureCatalogHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tag, err := h.db.Exec(r.Context(), `DELETE FROM feature_catalog WHERE id = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "feature not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Reorder updates sort_order for a feature. Admin only.
func (h *FeatureCatalogHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		SortOrder int `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`UPDATE feature_catalog SET sort_order = $1, updated_at = NOW() WHERE id = $2`, req.SortOrder, id,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reorder"})
		return
	}
	if tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "feature not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}


