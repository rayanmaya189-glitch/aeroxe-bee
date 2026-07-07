package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/services"
)

type AccountHandler struct {
	accountService    *services.AccountService
	apiKeyService     *services.APIKeyService
	subscriptionService *services.SubscriptionService
	billingService    *services.BillingService
}

func NewAccountHandler(
	accountService *services.AccountService,
	apiKeyService *services.APIKeyService,
	subscriptionService *services.SubscriptionService,
	billingService *services.BillingService,
) *AccountHandler {
	return &AccountHandler{
		accountService:    accountService,
		apiKeyService:     apiKeyService,
		subscriptionService: subscriptionService,
		billingService:    billingService,
	}
}

func (h *AccountHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       account.ID,
			"name":     account.Name,
			"email":    account.Email,
			"plan":     account.PlanID,
			"status":   account.Status,
			"verified": account.Verified,
			"created_at": account.CreatedAt,
		},
	})
}

func (h *AccountHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}
	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}
	if req.Name != "" {
		account.Name = req.Name
	}
	if err := h.accountService.Update(r.Context(), account); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update profile"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":   account.ID,
			"name": account.Name,
		},
	})
}

func (h *AccountHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)

	keys, err := h.apiKeyService.List(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(keys, pg), int64(len(keys)))})
}

type CreateAPIKeyRequest struct {
	Label      string   `json:"label"`
	Scopes     []string `json:"scopes"`
	ExpiresIn  string   `json:"expires_in,omitempty"`
}

func (h *AccountHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	var req CreateAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	var expiresAt *time.Time
	if req.ExpiresIn != "" {
		d, err := time.ParseDuration(req.ExpiresIn)
		if err == nil {
			t := time.Now().Add(d)
			expiresAt = &t
		}
	}

	rawKey, keyObj, err := h.apiKeyService.Generate(r.Context(), accountID, req.Label, req.Scopes, expiresAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate key"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":         keyObj.ID,
			"label":      keyObj.Label,
			"api_key":    rawKey,
			"scopes":     keyObj.Scopes,
			"expires_at": keyObj.ExpiresAt,
			"created_at": keyObj.CreatedAt,
		},
	})
}

func (h *AccountHandler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	keyID := r.PathValue("id")
	if err := h.apiKeyService.Revoke(r.Context(), keyID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to revoke key"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AccountHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	sub, err := h.subscriptionService.GetByAccountID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if sub == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "no subscription found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"plan_type":        sub.PlanType,
			"billing_cycle":    sub.BillingCycle,
			"status":           sub.Status,
			"quota_daily":      sub.QuotaDaily,
			"quota_monthly":    sub.QuotaMonthly,
			"max_queue_depth":  sub.MaxQueueDepth,
			"renewal_date":     sub.RenewalDate,
		},
	})
}

func (h *AccountHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	usage, err := h.billingService.GetUsage(r.Context(), accountID, time.Now().Format("2006-01-02"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get usage"})
		return
	}
	monthly, err := h.billingService.GetMonthlyUsage(r.Context(), accountID, time.Now().Year(), int(time.Now().Month()))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get monthly usage"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"daily":   usage.Count,
			"monthly": monthly,
		},
	})
}
