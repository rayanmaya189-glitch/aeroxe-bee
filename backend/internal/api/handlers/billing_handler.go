package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/services"
)

type BillingHandler struct {
	billingService      *services.BillingService
	subscriptionService *services.SubscriptionService
}

func NewBillingHandler(billingService *services.BillingService, subscriptionService *services.SubscriptionService) *BillingHandler {
	return &BillingHandler{
		billingService:      billingService,
		subscriptionService: subscriptionService,
	}
}

func (h *BillingHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.billingService.ListPlans(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list plans"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: plans})
}

func (h *BillingHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	plan, err := h.billingService.GetPlan(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if plan == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "plan not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: plan})
}

func (h *BillingHandler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	now := time.Now()

	year := now.Year()
	month := int(now.Month())

	if y := r.URL.Query().Get("year"); y != "" {
		if parsed, err := strconv.Atoi(y); err == nil && parsed > 2000 && parsed < 2100 {
			year = parsed
		}
	}
	if m := r.URL.Query().Get("month"); m != "" {
		if parsed, err := strconv.Atoi(m); err == nil && parsed >= 1 && parsed <= 12 {
			month = parsed
		}
	}

	data, err := h.billingService.GetInvoiceData(r.Context(), accountID, year, month)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get invoice"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: data})
}

func (h *BillingHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	today := time.Now().Format("2006-01-02")
	daily, err := h.billingService.GetUsage(r.Context(), accountID, today)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get usage"})
		return
	}

	now := time.Now()
	monthly, err := h.billingService.GetMonthlyUsage(r.Context(), accountID, now.Year(), int(now.Month()))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get monthly usage"})
		return
	}

	overUsage, err := h.billingService.CheckOverUsage(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to check over usage"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"daily":      daily.Count,
			"monthly":    monthly,
			"over_usage": overUsage,
			"date":       today,
		},
	})
}

func (h *BillingHandler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var plan models.Plan
	if err := decodeJSON(r, &plan); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if plan.ID == "" || plan.Name == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "id and name are required"})
		return
	}
	if err := h.billingService.CreatePlan(r.Context(), &plan); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create plan"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: plan})
}

func (h *BillingHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var plan models.Plan
	if err := decodeJSON(r, &plan); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	plan.ID = id
	if err := h.billingService.UpdatePlan(r.Context(), &plan); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update plan"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: plan})
}

func (h *BillingHandler) DeletePlan(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.billingService.DeletePlan(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete plan"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
