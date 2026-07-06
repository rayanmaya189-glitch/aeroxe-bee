package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/webhook"
)

type WebhookHandler struct {
	webhookService          *services.WebhookService
	webhookDeliveryService  *services.WebhookDeliveryService
	webhookDispatcher       *webhook.Dispatcher
}

func NewWebhookHandler(webhookService *services.WebhookService, deliveryService *services.WebhookDeliveryService, dispatcher *webhook.Dispatcher) *WebhookHandler {
	return &WebhookHandler{webhookService: webhookService, webhookDeliveryService: deliveryService, webhookDispatcher: dispatcher}
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
	if _, err := rand.Read(secret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate secret"})
		return
	}

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
	pg := ParsePagination(r, 20, 100)

	webhooks, err := h.webhookService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list webhooks"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(webhooks, pg), int64(len(webhooks)))})
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
	if _, err := rand.Read(secret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate secret"})
		return
	}
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

// ListDeliveries returns recent webhook delivery logs (admin)
func (h *WebhookHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	deliveries, err := h.webhookDeliveryService.ListByWebhookID(r.Context(), id, 20)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to fetch deliveries"})
		return
	}
	if deliveries == nil {
		deliveries = []models.WebhookDelivery{}
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: deliveries})
}

// TestWebhook sends a test payload to the webhook endpoint (admin)
func (h *WebhookHandler) TestWebhook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	wh, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || wh == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}

	result := h.webhookDispatcher.DispatchTest(r.Context(), *wh)

	resp := map[string]interface{}{
		"status_code":   result.StatusCode,
		"response_body": result.ResponseBody,
	}
	if result.Err != nil {
		resp["error"] = result.Err.Error()
		writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: resp})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: resp})
}
