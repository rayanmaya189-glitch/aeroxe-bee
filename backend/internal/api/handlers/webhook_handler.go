package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

type WebhookHandler struct {
	webhookService *services.WebhookService
}

func NewWebhookHandler(webhookService *services.WebhookService) *WebhookHandler {
	return &WebhookHandler{webhookService: webhookService}
}

func (h *WebhookHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.URL == "" || len(req.Events) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "url and events are required"})
		return
	}

	secret := make([]byte, 32)
	rand.Read(secret)

	webhook := &models.Webhook{
		AccountID: accountID,
		URL:       req.URL,
		Events:    req.Events,
		Secret:    hex.EncodeToString(secret),
		Active:    true,
	}

	if err := h.webhookService.Create(r.Context(), webhook); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create webhook"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":     webhook.ID,
			"url":    webhook.URL,
			"events": webhook.Events,
			"active": webhook.Active,
			"secret": webhook.Secret,
		},
	})
}

func (h *WebhookHandler) List(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	webhooks, err := h.webhookService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list webhooks"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: webhooks})
}

func (h *WebhookHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	webhook, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if webhook == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: webhook})
}

func (h *WebhookHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
		Active bool     `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	webhook, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || webhook == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}

	webhook.URL = req.URL
	webhook.Events = req.Events
	webhook.Active = req.Active

	if err := h.webhookService.Update(r.Context(), webhook); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *WebhookHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.webhookService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *WebhookHandler) RotateSecret(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	secret := make([]byte, 32)
	rand.Read(secret)
	newSecret := hex.EncodeToString(secret)

	if err := h.webhookService.RotateSecret(r.Context(), id, newSecret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to rotate secret"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]string{"secret": newSecret},
	})
}
