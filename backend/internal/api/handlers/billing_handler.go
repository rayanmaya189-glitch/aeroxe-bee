package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
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
	var plans []models.Plan
	var err error

	if middleware.GetIsAdmin(r.Context()) {
		// Admin sees all plans
		plans, err = h.billingService.ListPlansForAdmin(r.Context())
	} else {
		// Member sees public + custom plans they're subscribed to
		accountID := middleware.GetAccountID(r.Context())
		plans, err = h.billingService.ListPlansForMember(r.Context(), accountID)
	}

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

	// Enforce visibility: admins can see everything
	if !middleware.GetIsAdmin(r.Context()) {
		if plan.Visibility == models.PlanVisibilityPrivate {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "plan not found"})
			return
		}
		// Custom plans are only visible to subscribed members
		if plan.Visibility == models.PlanVisibilityCustom {
			accountID := middleware.GetAccountID(r.Context())
			sub, _ := h.subscriptionService.GetByAccountID(r.Context(), accountID)
			if sub == nil || sub.PlanType != plan.ID || sub.Status != models.SubStatusActive {
				writeJSON(w, http.StatusNotFound, APIResponse{Error: "plan not found"})
				return
			}
		}
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
	// Only admin can directly create plans; staff must use maker-checker flow
	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admins can directly modify plans. Use POST /api/v1/plan-requests to submit a change request."})
		return
	}
	var plan models.Plan
	if err := decodeJSON(r, &plan); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if plan.ID == "" || plan.Name == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "id and name are required"})
		return
	}
	if plan.Visibility != "" && plan.Visibility != models.PlanVisibilityPublic && plan.Visibility != models.PlanVisibilityPrivate && plan.Visibility != models.PlanVisibilityCustom {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "visibility must be public, private, or custom"})
		return
	}
	if plan.DailyQuota < 0 || plan.MonthlyQuota < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "daily_quota and monthly_quota must be non-negative"})
		return
	}
	if plan.MonthlyPrice < 0 || plan.PricePerSMS < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "monthly_price and price_per_sms must be non-negative"})
		return
	}
	if plan.MaxDevices < 1 {
		plan.MaxDevices = 1
	}
	if plan.MaxQueueDepth < 1 {
		plan.MaxQueueDepth = 100
	}
	if plan.OverageBufferPct < 0 || plan.OverageBufferPct > 100 {
		plan.OverageBufferPct = 0
	}
	if len(plan.CtaText) > 100 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "cta_text must be 100 characters or less"})
		return
	}
	if plan.DefaultRoutingStrategy != "" &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyFastest &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyLowestCost &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyHighestReliability &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyGeoAffinity &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyProfitOptimized {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "default_routing_strategy must be fastest_delivery, lowest_cost, highest_reliability, geo_affinity, or profit_optimized"})
		return
	}
	if err := h.billingService.CreatePlan(r.Context(), &plan); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create plan"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: plan})
}

func (h *BillingHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	// Only admin can directly update plans; staff must use maker-checker flow
	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admins can directly modify plans. Use POST /api/v1/plan-requests to submit a change request."})
		return
	}
	id := r.PathValue("id")
	var plan models.Plan
	if err := decodeJSON(r, &plan); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	plan.ID = models.PlanType(id)
	if plan.Visibility != "" && plan.Visibility != models.PlanVisibilityPublic && plan.Visibility != models.PlanVisibilityPrivate && plan.Visibility != models.PlanVisibilityCustom {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "visibility must be public, private, or custom"})
		return
	}
	if plan.DailyQuota < 0 || plan.MonthlyQuota < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "daily_quota and monthly_quota must be non-negative"})
		return
	}
	if plan.MonthlyPrice < 0 || plan.PricePerSMS < 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "monthly_price and price_per_sms must be non-negative"})
		return
	}
	if plan.MaxDevices < 1 {
		plan.MaxDevices = 1
	}
	if plan.MaxQueueDepth < 1 {
		plan.MaxQueueDepth = 100
	}
	if plan.OverageBufferPct < 0 || plan.OverageBufferPct > 100 {
		plan.OverageBufferPct = 0
	}
	if len(plan.CtaText) > 100 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "cta_text must be 100 characters or less"})
		return
	}
	if plan.DefaultRoutingStrategy != "" &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyFastest &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyLowestCost &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyHighestReliability &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyGeoAffinity &&
		plan.DefaultRoutingStrategy != models.RoutingStrategyProfitOptimized {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "default_routing_strategy must be fastest_delivery, lowest_cost, highest_reliability, geo_affinity, or profit_optimized"})
		return
	}
	if err := h.billingService.UpdatePlan(r.Context(), &plan); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update plan"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: plan})
}

func (h *BillingHandler) DeletePlan(w http.ResponseWriter, r *http.Request) {
	// Only admin can directly delete plans; staff must use maker-checker flow
	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admins can directly modify plans. Use POST /api/v1/plan-requests to submit a change request."})
		return
	}
	id := r.PathValue("id")
	if err := h.billingService.DeletePlan(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete plan"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
