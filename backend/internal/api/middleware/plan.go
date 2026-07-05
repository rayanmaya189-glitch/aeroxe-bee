package middleware

import (
	"log"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/services"
)

// PlanMiddleware enforces subscription, account status, and quota checks.
// It must be placed AFTER JWTAuth or APIKeyAuth in the middleware chain,
// since it reads the account ID from the request context.
type PlanMiddleware struct {
	accountService *services.AccountService
}

// NewPlanMiddleware creates a new PlanMiddleware that enforces plan/subscription
// checks on API endpoints. It blocks requests from suspended accounts, canceled
// subscriptions, and accounts that have exceeded their quota.
func NewPlanMiddleware(accountService *services.AccountService) *PlanMiddleware {
	return &PlanMiddleware{accountService: accountService}
}

// RequireActiveAccount checks that the account status is "active".
// Returns 403 Forbidden if the account is suspended or disabled.
// This must be applied after JWTAuth/APIKeyAuth.
func (m *PlanMiddleware) RequireActiveAccount(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accountID := GetAccountID(r.Context())
		if accountID == "" {
			next.ServeHTTP(w, r)
			return
		}

		account, err := m.accountService.GetByID(r.Context(), accountID)
		if err != nil {
			log.Printf("[PLAN MW] failed to get account %s: %v", accountID, err)
			// Fail open — let the request through if DB is unreachable
			next.ServeHTTP(w, r)
			return
		}
		if account == nil {
			http.Error(w, `{"error":"account not found"}`, http.StatusForbidden)
			return
		}

		switch account.Status {
		case "suspended":
			http.Error(w, `{"error":"account suspended"}`, http.StatusForbidden)
			return
		case "disabled":
			http.Error(w, `{"error":"account disabled"}`, http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireActiveSubscription checks that the account has an active subscription.
// Returns 403 Forbidden if the subscription is canceled or past_due.
// Free-plan accounts with no subscription row are treated as having a free
// subscription (they are allowed through).
func (m *PlanMiddleware) RequireActiveSubscription(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accountID := GetAccountID(r.Context())
		if accountID == "" {
			next.ServeHTTP(w, r)
			return
		}

		sub, err := m.accountService.GetOrCreateSubscription(r.Context(), accountID)
		if err != nil {
			log.Printf("[PLAN MW] failed to get subscription for %s: %v", accountID, err)
			next.ServeHTTP(w, r)
			return
		}
		if sub == nil {
			// No subscription row — allow (free account)
			next.ServeHTTP(w, r)
			return
		}

		switch sub.Status {
		case "canceled":
			http.Error(w, `{"error":"subscription canceled"}`, http.StatusForbidden)
			return
		case "past_due":
			http.Error(w, `{"error":"subscription past due"}`, http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// EnforceQuota checks that the account has not exceeded its daily message quota.
// Returns 429 Too Many Requests if the quota is exceeded.
// Used on message-sending and OTP endpoints.
func (m *PlanMiddleware) EnforceQuota(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accountID := GetAccountID(r.Context())
		if accountID == "" {
			next.ServeHTTP(w, r)
			return
		}

		ok, err := m.accountService.CheckQuota(r.Context(), accountID)
		if err != nil {
			log.Printf("[PLAN MW] quota check failed for %s: %v", accountID, err)
			next.ServeHTTP(w, r)
			return
		}
		if !ok {
			http.Error(w, `{"error":"daily message quota exceeded"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// MemberPlanCheck is a composite middleware that applies the standard set of
// plan-level checks for member portal endpoints:
//   - Account must exist and be active (not suspended/disabled)
//   - Subscription must be active (not canceled/past_due)
//
// Use this as a convenience wrapper around RequireActiveAccount + RequireActiveSubscription.
func (m *PlanMiddleware) MemberPlanCheck(next http.Handler) http.Handler {
	return m.RequireActiveAccount(m.RequireActiveSubscription(next))
}
