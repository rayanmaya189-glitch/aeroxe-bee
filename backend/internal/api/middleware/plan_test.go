package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

// --- Mock DatabaseQuerier ---

type mockRow struct {
	values []interface{}
	err    error
}

func (r *mockRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	for i, v := range r.values {
		if i < len(dest) {
			b, _ := json.Marshal(v)
			_ = json.Unmarshal(b, dest[i])
		}
	}
	return nil
}

type mockRows struct {
	data   [][]interface{}
	pos    int
	closed bool
}

func (r *mockRows) Close()                          { r.closed = true }
func (r *mockRows) Err() error                      { return nil }
func (r *mockRows) CommandTag() pgconn.CommandTag   { return pgconn.CommandTag{} }
func (r *mockRows) Next() bool                      { return r.pos < len(r.data) }
func (r *mockRows) Values() ([]interface{}, error)   { return nil, nil }
func (r *mockRows) FieldDescriptions() []pgconn.FieldDescription { return nil }
func (r *mockRows) Conn() *pgx.Conn                                  { return nil }
func (r *mockRows) RawValues() [][]byte                                { return nil }

func (r *mockRows) Scan(dest ...interface{}) error {
	if r.pos >= len(r.data) {
		return pgx.ErrNoRows
	}
	row := r.data[r.pos]
	r.pos++
	for i, v := range row {
		if i < len(dest) {
			b, _ := json.Marshal(v)
			_ = json.Unmarshal(b, dest[i])
		}
	}
	return nil
}

type mockQuerier struct {
	accountRow *mockRow
	subRow     *mockRow
	usageRow   *mockRow
	execErr    error
	lastQuery  string
}

func (m *mockQuerier) QueryRow(_ context.Context, sql string, _ ...any) pgx.Row {
	m.lastQuery = sql
	if strings.Contains(sql, "FROM accounts") {
		return m.accountRow
	}
	if strings.Contains(sql, "FROM subscriptions") {
		return m.subRow
	}
	if strings.Contains(sql, "FROM usage_counters") {
		return m.usageRow
	}
	return &mockRow{err: pgx.ErrNoRows}
}

func (m *mockQuerier) Query(_ context.Context, sql string, _ ...any) (pgx.Rows, error) {
	m.lastQuery = sql
	return &mockRows{data: [][]interface{}{}}, nil
}

func (m *mockQuerier) Exec(_ context.Context, _ string, _ ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, m.execErr
}

var errDBClosed = fmt.Errorf("db connection closed")

// --- Helpers ---

func newAccountRow(status string) *mockRow {
	return &mockRow{
		values: []interface{}{
			"acct-123",          // id
			"Test Account",      // name
			"test@example.com",  // email
			"hash",              // password_hash
			models.PlanTypeFree, // plan_id
			90,                  // retention_days
			time.Now(),          // created_at
			true,                // verified
			status,              // status
			0.0,                 // risk_score
		},
	}
}

func newSubscriptionRow(status string) *mockRow {
	return &mockRow{
		values: []interface{}{
			"sub-123",                             // id
			"acct-123",                            // account_id
			models.PlanTypeFree,                   // plan_type
			string(models.BillingCycleMonthly),    // billing_cycle
			status,                                // status
			time.Now().AddDate(0, 1, 0),           // renewal_date
			nil,                                   // stripe_customer_id
			int64(100),                            // quota_daily
			int64(3000),                           // quota_monthly
			10.0,                                  // overage_buffer_pct
			100,                                   // max_queue_depth
			false,                                 // dedicated_pool
			string(models.RoutingStrategyFastest), // default_routing_strategy
			time.Now(),                            // created_at
			time.Now(),                            // updated_at
		},
	}
}

func newUsageRow(count int64) *mockRow {
	return &mockRow{
		values: []interface{}{
			"usage-123",                          // id
			"acct-123",                           // account_id
			time.Now().Format("2006-01-02"),       // date
			count,                                // count
		},
	}
}

func contextWithAccountID(accountID string) context.Context {
	return context.WithValue(context.Background(), ContextAccountID, accountID)
}

func okHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}
}

func executeMiddleware(t *testing.T, mw func(http.Handler) http.Handler, ctx context.Context) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(ctx, "GET", "/test", nil)
	rec := httptest.NewRecorder()
	mw(okHandler()).ServeHTTP(rec, req)
	return rec
}

// --- Tests: RequireActiveAccount ---

func TestRequireActiveAccount_AllowsActiveAccount(t *testing.T) {
	db := &mockQuerier{accountRow: newAccountRow("active")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRequireActiveAccount_BlocksSuspendedAccount(t *testing.T) {
	db := &mockQuerier{accountRow: newAccountRow("suspended")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
	var body map[string]string
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["error"] != "account suspended" {
		t.Errorf("expected 'account suspended', got %q", body["error"])
	}
}

func TestRequireActiveAccount_BlocksDisabledAccount(t *testing.T) {
	db := &mockQuerier{accountRow: newAccountRow("disabled")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestRequireActiveAccount_BlocksAccountNotFound(t *testing.T) {
	db := &mockQuerier{accountRow: &mockRow{err: pgx.ErrNoRows}}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for nil account, got %d", rec.Code)
	}
}

func TestRequireActiveAccount_FailOpenOnDBError(t *testing.T) {
	db := &mockQuerier{accountRow: &mockRow{err: errDBClosed}}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected fail-open (200), got %d", rec.Code)
	}
}

func TestRequireActiveAccount_SkipsWhenNoAccountID(t *testing.T) {
	db := &mockQuerier{}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveAccount, context.Background())
	if rec.Code != http.StatusOK {
		t.Errorf("expected pass-through (200), got %d", rec.Code)
	}
}

// --- Tests: RequireActiveSubscription ---

func TestRequireActiveSubscription_AllowsActiveSub(t *testing.T) {
	db := &mockQuerier{subRow: newSubscriptionRow("active")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestRequireActiveSubscription_BlocksCanceledSub(t *testing.T) {
	db := &mockQuerier{subRow: newSubscriptionRow("canceled")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
	var body map[string]string
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["error"] != "subscription canceled" {
		t.Errorf("expected 'subscription canceled', got %q", body["error"])
	}
}

func TestRequireActiveSubscription_BlocksPastDueSub(t *testing.T) {
	db := &mockQuerier{subRow: newSubscriptionRow("past_due")}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
	var body map[string]string
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body["error"] != "subscription past due" {
		t.Errorf("expected 'subscription past due', got %q", body["error"])
	}
}

func TestRequireActiveSubscription_AllowsFreeAccountNoSub(t *testing.T) {
	db := &mockQuerier{subRow: &mockRow{err: pgx.ErrNoRows}}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 for free account, got %d", rec.Code)
	}
}

func TestRequireActiveSubscription_FailOpenOnDBError(t *testing.T) {
	db := &mockQuerier{subRow: &mockRow{err: errDBClosed}}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected fail-open (200), got %d", rec.Code)
	}
}

func TestRequireActiveSubscription_SkipsWhenNoAccountID(t *testing.T) {
	db := &mockQuerier{}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.RequireActiveSubscription, context.Background())
	if rec.Code != http.StatusOK {
		t.Errorf("expected pass-through (200), got %d", rec.Code)
	}
}

// --- Tests: EnforceQuota ---

func TestEnforceQuota_AllowsWithinQuota(t *testing.T) {
	db := &mockQuerier{
		usageRow: newUsageRow(50),
		subRow:   newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.EnforceQuota, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestEnforceQuota_BlocksExceededQuota(t *testing.T) {
	db := &mockQuerier{
		usageRow: newUsageRow(200), // Exceeds 100 daily quota
		subRow:   newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.EnforceQuota, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", rec.Code)
	}
}

func TestEnforceQuota_AllowsWhenNoUsageRow(t *testing.T) {
	db := &mockQuerier{
		usageRow: &mockRow{err: pgx.ErrNoRows},
		subRow:   newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.EnforceQuota, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestEnforceQuota_FailOpenOnDBError(t *testing.T) {
	db := &mockQuerier{
		usageRow: &mockRow{err: errDBClosed},
		subRow:   newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.EnforceQuota, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected fail-open (200), got %d", rec.Code)
	}
}

// --- Tests: MemberPlanCheck (composite) ---

func TestMemberPlanCheck_AllowsActiveAccountAndSub(t *testing.T) {
	db := &mockQuerier{
		accountRow: newAccountRow("active"),
		subRow:     newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.MemberPlanCheck, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestMemberPlanCheck_BlocksSuspendedAccount(t *testing.T) {
	db := &mockQuerier{
		accountRow: newAccountRow("suspended"),
		subRow:     newSubscriptionRow("active"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.MemberPlanCheck, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for suspended account, got %d", rec.Code)
	}
}

func TestMemberPlanCheck_BlocksCanceledSubscription(t *testing.T) {
	db := &mockQuerier{
		accountRow: newAccountRow("active"),
		subRow:     newSubscriptionRow("canceled"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.MemberPlanCheck, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for canceled sub, got %d", rec.Code)
	}
}

func TestMemberPlanCheck_BlocksPastDueSubscription(t *testing.T) {
	db := &mockQuerier{
		accountRow: newAccountRow("active"),
		subRow:     newSubscriptionRow("past_due"),
	}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.MemberPlanCheck, contextWithAccountID("acct-123"))
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for past_due sub, got %d", rec.Code)
	}
}

func TestMemberPlanCheck_SkipsWhenNoAccountID(t *testing.T) {
	db := &mockQuerier{}
	svc := services.NewAccountService(db)
	mw := NewPlanMiddleware(svc)

	rec := executeMiddleware(t, mw.MemberPlanCheck, context.Background())
	if rec.Code != http.StatusOK {
		t.Errorf("expected pass-through (200), got %d", rec.Code)
	}
}
