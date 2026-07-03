package handlers

import (
	"net/http"

	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

// PublicBillingHandler serves unauthenticated public pricing endpoints.
type PublicBillingHandler struct {
	billingService *services.BillingService
}

func NewPublicBillingHandler(billingService *services.BillingService) *PublicBillingHandler {
	return &PublicBillingHandler{billingService: billingService}
}

// ListPublicPlans returns only plans with visibility=public. No auth required.
func (h *PublicBillingHandler) ListPublicPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.billingService.ListPlansForAdmin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list plans"})
		return
	}

	// Filter to public plans only
	var public []models.Plan
	for _, p := range plans {
		if p.Visibility == models.PlanVisibilityPublic || p.Visibility == "" {
			public = append(public, p)
		}
	}
	if public == nil {
		public = []models.Plan{}
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: public})
}
