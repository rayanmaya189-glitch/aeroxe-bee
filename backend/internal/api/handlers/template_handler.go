package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

type TemplateHandler struct {
	templateService *services.TemplateService
}

func NewTemplateHandler(templateService *services.TemplateService) *TemplateHandler {
	return &TemplateHandler{templateService: templateService}
}

func (h *TemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var tpl models.Template
	if err := json.NewDecoder(r.Body).Decode(&tpl); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}
	tpl.AccountID = accountID
	tpl.ApprovalStatus = models.TemplatePending

	if err := h.templateService.Create(r.Context(), &tpl); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create template"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: tpl})
}

func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	templates, err := h.templateService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: templates})
}

func (h *TemplateHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tpl, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || tpl == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: tpl})
}

func (h *TemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	var tpl models.Template
	if err := json.NewDecoder(r.Body).Decode(&tpl); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	existing, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	tpl.ID = id
	tpl.AccountID = accountID
	if err := h.templateService.Update(r.Context(), &tpl); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update template"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: tpl})
}

func (h *TemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	existing, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	if err := h.templateService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete template"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
