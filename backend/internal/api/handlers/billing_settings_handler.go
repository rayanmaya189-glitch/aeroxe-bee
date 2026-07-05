package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

// ─── Payment Config Handler ────────────────────────────────────────

type PaymentConfigHandler struct {
	paymentConfigService *services.PaymentConfigService
}

func NewPaymentConfigHandler(paymentConfigService *services.PaymentConfigService) *PaymentConfigHandler {
	return &PaymentConfigHandler{paymentConfigService: paymentConfigService}
}

func (h *PaymentConfigHandler) List(w http.ResponseWriter, r *http.Request) {
	configs, err := h.paymentConfigService.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list payment configs"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: configs})
}

func (h *PaymentConfigHandler) ListEnabled(w http.ResponseWriter, r *http.Request) {
	configs, err := h.paymentConfigService.ListEnabled(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list payment configs"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: configs})
}

func (h *PaymentConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Label   string          `json:"label"`
		Details json.RawMessage `json:"details"`
		Enabled bool            `json:"enabled"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	adminID := middleware.GetAccountID(r.Context())
	if err := h.paymentConfigService.Update(r.Context(), id, req.Label, req.Details, req.Enabled, adminID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *PaymentConfigHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Method  string          `json:"method"`
		Label   string          `json:"label"`
		Details json.RawMessage `json:"details"`
		Enabled bool            `json:"enabled"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Method == "" || req.Label == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "method and label are required"})
		return
	}
	adminID := middleware.GetAccountID(r.Context())
	if err := h.paymentConfigService.Upsert(r.Context(), req.Method, req.Label, req.Details, req.Enabled, adminID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to save"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// ─── Payment Request Handler (maker-checker) ────────────────────────

type PaymentRequestHandler struct {
	paymentRequestService *services.PaymentRequestService
	paymentConfigService  *services.PaymentConfigService
}

func NewPaymentRequestHandler(pr *services.PaymentRequestService, pc *services.PaymentConfigService) *PaymentRequestHandler {
	return &PaymentRequestHandler{paymentRequestService: pr, paymentConfigService: pc}
}

func (h *PaymentRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	f := services.PaymentRequestFilter{
		Offset:        offset,
		Limit:         pageSize,
		Status:        r.URL.Query().Get("status"),
		AccountID:     r.URL.Query().Get("account_id"),
		PaymentMethod: r.URL.Query().Get("payment_method"),
		SortBy:        r.URL.Query().Get("sort_by"),
		SortOrder:     r.URL.Query().Get("sort_order"),
	}

	requests, total, err := h.paymentRequestService.List(r.Context(), f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data": requests, "total": total, "page": page,
			"page_size": pageSize, "total_pages": totalPages,
		},
	})
}

func (h *PaymentRequestHandler) ListByAccount(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	f := services.PaymentRequestFilter{
		Offset: offset, Limit: pageSize, AccountID: accountID,
		Status: r.URL.Query().Get("status"),
	}
	requests, total, err := h.paymentRequestService.List(r.Context(), f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list"})
		return
	}
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data": requests, "total": total, "page": page,
			"page_size": pageSize, "total_pages": totalPages,
		},
	})
}

func (h *PaymentRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		PlanID        string  `json:"plan_id"`
		BillingCycle  string  `json:"billing_cycle"`
		PaymentMethod string  `json:"payment_method"`
		Amount        float64 `json:"amount"`
		ProofURL      string  `json:"proof_url"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.PlanID == "" || req.PaymentMethod == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "plan_id and payment_method are required"})
		return
	}
	if req.BillingCycle == "" {
		req.BillingCycle = "monthly"
	}

	config, err := h.paymentConfigService.GetByMethod(r.Context(), req.PaymentMethod)
	if err != nil || config == nil || !config.Enabled {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "payment method not available"})
		return
	}

	pr := &models.PaymentRequest{
		AccountID:     accountID,
		PlanID:        req.PlanID,
		BillingCycle:  req.BillingCycle,
		PaymentMethod: req.PaymentMethod,
		Amount:        req.Amount,
		ProofURL:      req.ProofURL,
	}
	if err := h.paymentRequestService.Create(r.Context(), pr); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true})
}

func (h *PaymentRequestHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	pr, err := h.paymentRequestService.GetByID(r.Context(), id)
	if err != nil || pr == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pr})
}

func (h *PaymentRequestHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := middleware.GetAccountID(r.Context())
	var req struct {
		Notes string `json:"notes"`
	}
	_ = decodeJSON(r, &req)
	if err := h.paymentRequestService.Approve(r.Context(), id, adminID, req.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *PaymentRequestHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := middleware.GetAccountID(r.Context())
	var req struct {
		Notes string `json:"notes"`
	}
	_ = decodeJSON(r, &req)
	if err := h.paymentRequestService.Reject(r.Context(), id, adminID, req.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// ─── Subscription Request Handler (member upgrade + admin approve/reject) ──

type SubscriptionRequestHandler struct {
	subscriptionRequestService *services.SubscriptionRequestService
	subscriptionService        *services.SubscriptionService
	billingService             *services.BillingService
}

func NewSubscriptionRequestHandler(sr *services.SubscriptionRequestService, sub *services.SubscriptionService, billing *services.BillingService) *SubscriptionRequestHandler {
	return &SubscriptionRequestHandler{
		subscriptionRequestService: sr,
		subscriptionService:        sub,
		billingService:             billing,
	}
}

func (h *SubscriptionRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	f := services.SubscriptionRequestFilter{
		Offset:    offset,
		Limit:     pageSize,
		Status:    r.URL.Query().Get("status"),
		AccountID: r.URL.Query().Get("account_id"),
		SortBy:    r.URL.Query().Get("sort_by"),
		SortOrder: r.URL.Query().Get("sort_order"),
	}

	requests, total, err := h.subscriptionRequestService.List(r.Context(), f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list"})
		return
	}
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data": requests, "total": total, "page": page,
			"page_size": pageSize, "total_pages": totalPages,
		},
	})
}

func (h *SubscriptionRequestHandler) ListByAccount(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	f := services.SubscriptionRequestFilter{
		Offset: offset, Limit: pageSize, AccountID: accountID,
		Status: r.URL.Query().Get("status"),
	}
	requests, total, err := h.subscriptionRequestService.List(r.Context(), f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list"})
		return
	}
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data": requests, "total": total, "page": page,
			"page_size": pageSize, "total_pages": totalPages,
		},
	})
}

func (h *SubscriptionRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		RequestedPlan         string `json:"requested_plan"`
		RequestedBillingCycle string `json:"requested_billing_cycle"`
		Reason                string `json:"reason"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.RequestedPlan == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "requested_plan is required"})
		return
	}
	if req.RequestedBillingCycle == "" {
		req.RequestedBillingCycle = "monthly"
	}

	sub, _ := h.subscriptionService.GetByAccountID(r.Context(), accountID)
	currentPlan := "free"
	if sub != nil {
		currentPlan = string(sub.PlanType)
	}

	sr := &models.SubscriptionRequest{
		AccountID:             accountID,
		RequestedPlan:         req.RequestedPlan,
		RequestedBillingCycle: req.RequestedBillingCycle,
		CurrentPlan:           currentPlan,
		Reason:                req.Reason,
	}
	if err := h.subscriptionRequestService.Create(r.Context(), sr); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true})
}

func (h *SubscriptionRequestHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := middleware.GetAccountID(r.Context())
	var req struct {
		Notes string `json:"notes"`
	}
	_ = decodeJSON(r, &req)

	sr, err := h.subscriptionRequestService.GetByID(r.Context(), id)
	if err != nil || sr == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "not found"})
		return
	}

	if err := h.subscriptionRequestService.Approve(r.Context(), id, adminID, req.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve"})
		return
	}

	// Snapshot the plan's current values into the subscription.
	// This ensures the member keeps the benefits they subscribed to,
	// even if admin later edits the plan in the plans table.
	plan, err := h.billingService.GetPlan(r.Context(), sr.RequestedPlan)
	if err != nil || plan == nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "plan not found"})
		return
	}

	sub, _ := h.subscriptionService.GetByAccountID(r.Context(), sr.AccountID)
	if sub != nil {
		// Snapshot: copy ALL plan values into the subscription record
		sub.PlanType = plan.ID
		sub.BillingCycle = models.BillingCycle(sr.RequestedBillingCycle)
		sub.Status = models.SubStatusActive
		sub.QuotaDaily = plan.DailyQuota
		sub.QuotaMonthly = plan.MonthlyQuota
		sub.OverageBufferPct = plan.OverageBufferPct
		sub.MaxQueueDepth = plan.MaxQueueDepth
		sub.DedicatedPool = plan.DedicatedPool
		sub.DefaultRoutingStrategy = plan.DefaultRoutingStrategy
		_ = h.subscriptionService.Update(r.Context(), sub)
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *SubscriptionRequestHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := middleware.GetAccountID(r.Context())
	var req struct {
		Notes string `json:"notes"`
	}
	_ = decodeJSON(r, &req)
	if err := h.subscriptionRequestService.Reject(r.Context(), id, adminID, req.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
