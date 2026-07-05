package handlers

import (
	"net/http"

	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

// PublicBillingHandler serves unauthenticated public pricing endpoints.
type PublicBillingHandler struct {
	billingService       *services.BillingService
	paymentConfigService *services.PaymentConfigService
}

func NewPublicBillingHandler(billingService *services.BillingService, paymentConfigService *services.PaymentConfigService) *PublicBillingHandler {
	return &PublicBillingHandler{billingService: billingService, paymentConfigService: paymentConfigService}
}

// ListPublicPlans returns only plans with visibility=public. No auth required.
func (h *PublicBillingHandler) ListPublicPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.billingService.ListPlansForAdmin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list plans"})
		return
	}
	var public []models.Plan
	for _, p := range plans {
		if p.Visibility == models.PlanVisibilityPublic || p.Visibility == "" {
			public = append(public, p)
		}
	}
	if public == nil {
		public = []models.Plan{}
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]interface{}{"data": public, "total": len(public), "page": 1, "page_size": len(public), "total_pages": 1}})
}

// ListPublicPaymentMethods returns enabled payment configs for the public pricing page.
func (h *PublicBillingHandler) ListPublicPaymentMethods(w http.ResponseWriter, r *http.Request) {
	configs, err := h.paymentConfigService.ListEnabled(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list payment methods"})
		return
	}

	type publicMethod struct {
		Method string `json:"method"`
		Label  string `json:"label"`
	}

	var methods []publicMethod
	for _, c := range configs {
		methods = append(methods, publicMethod{Method: c.Method, Label: c.Label})
	}
	if methods == nil {
		methods = []publicMethod{}
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: methods})
}
