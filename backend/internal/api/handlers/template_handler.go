package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

type TemplateHandler struct {
	templateService      *services.TemplateService
	subscriptionService  *services.SubscriptionService
}

func NewTemplateHandler(templateService *services.TemplateService, subscriptionService *services.SubscriptionService) *TemplateHandler {
	return &TemplateHandler{
		templateService:     templateService,
		subscriptionService: subscriptionService,
	}
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

	// Enforce template limit from plan subscription
	maxTemplates, err := h.subscriptionService.GetMaxTemplates(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to check template limit"})
		return
	}
	count, err := h.templateService.CountByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to count templates"})
		return
	}
	if count >= maxTemplates {
		writeJSON(w, http.StatusTooManyRequests, APIResponse{
			Error: fmt.Sprintf("template limit reached: max %d templates allowed on your plan", maxTemplates),
		})
		return
	}

	if err := h.templateService.Create(r.Context(), &tpl); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create template"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: tpl})
}

func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)

	templates, err := h.templateService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(templates, pg), int64(len(templates)))})
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
