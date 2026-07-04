package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

type PlanChangeRequestHandler struct {
	service        *services.PlanChangeRequestService
	billingService *services.BillingService
}

func NewPlanChangeRequestHandler(service *services.PlanChangeRequestService, billingService *services.BillingService) *PlanChangeRequestHandler {
	return &PlanChangeRequestHandler{service: service, billingService: billingService}
}

// Submit creates a plan change request (non-admin staff/viewer)
func (h *PlanChangeRequestHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Action  string                 `json:"action"`
		PlanID  string                 `json:"plan_id"`
		Payload map[string]interface{} `json:"payload"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if body.Action != "create" && body.Action != "update" && body.Action != "delete" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "action must be create, update, or delete"})
		return
	}
	if body.PlanID == "" && body.Action != "create" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "plan_id is required for update/delete"})
		return
	}
	accountID := middleware.GetAccountID(r.Context())
	req := &services.PlanChangeRequest{
		RequestedBy: accountID,
		PlanID:      body.PlanID,
		Action:      body.Action,
		Payload:     body.Payload,
		Status:      "pending",
	}
	if err := h.service.Create(r.Context(), req); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit plan change request"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: req})
}

// ListPending returns pending requests (admin only)
func (h *PlanChangeRequestHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	requests, err := h.service.ListPending(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list pending requests"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: requests})
}

// ListAll returns all requests (admin only)
func (h *PlanChangeRequestHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	requests, err := h.service.ListAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list requests"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: requests})
}

// Approve approves a request and applies the plan change (admin only)
func (h *PlanChangeRequestHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	var body struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	req, err := h.service.GetByID(r.Context(), id)
	if err != nil || req == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "request not found"})
		return
	}

	// Apply the plan change before marking approved
	switch req.Action {
	case "create", "update":
		var plan models.Plan
		payloadBytes, _ := json.Marshal(req.Payload)
		if err := json.Unmarshal(payloadBytes, &plan); err != nil {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid plan payload"})
			return
		}
		if req.Action == "create" {
			if err := h.billingService.CreatePlan(r.Context(), &plan); err != nil {
				writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create plan: " + err.Error()})
				return
			}
		} else {
			if err := h.billingService.UpdatePlan(r.Context(), &plan); err != nil {
				writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update plan: " + err.Error()})
				return
			}
		}
	case "delete":
		if req.PlanID != "" {
			if err := h.billingService.DeletePlan(r.Context(), req.PlanID); err != nil {
				writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete plan: " + err.Error()})
				return
			}
		}
	}

	if err := h.service.Approve(r.Context(), id, accountID, "", body.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"status": "approved"}})
}

// Reject rejects a request (admin only)
func (h *PlanChangeRequestHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	var body struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.service.Reject(r.Context(), id, accountID, "", body.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"status": "rejected"}})
}
