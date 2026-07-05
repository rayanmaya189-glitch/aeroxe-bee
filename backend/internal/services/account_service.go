package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type AccountService struct {
	db DatabaseQuerier
}

func NewAccountService(db DatabaseQuerier) *AccountService {
	return &AccountService{db: db}
}

func (s *AccountService) Create(ctx context.Context, name, email, passwordHash string) (*models.Account, error) {
	account := &models.Account{}
	err := s.db.QueryRow(ctx,
		`INSERT INTO accounts (name, email, password_hash, plan_id, retention_days, verified, status, risk_score)
		 VALUES ($1, $2, $3, 'free', 90, false, 'active', 0.0)
		 RETURNING id, name, email, password_hash, plan_id, retention_days, created_at, verified, status, risk_score`,
		name, email, passwordHash,
	).Scan(&account.ID, &account.Name, &account.Email, &account.PasswordHash,
		&account.PlanID, &account.RetentionDays, &account.CreatedAt,
		&account.Verified, &account.Status, &account.RiskScore)
	if err != nil {
		return nil, fmt.Errorf("create account: %w", err)
	}
	return account, nil
}

func (s *AccountService) GetByID(ctx context.Context, id string) (*models.Account, error) {
	account := &models.Account{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, email, password_hash, plan_id, retention_days, created_at, verified, status, risk_score
		 FROM accounts WHERE id = $1`, id,
	).Scan(&account.ID, &account.Name, &account.Email, &account.PasswordHash,
		&account.PlanID, &account.RetentionDays, &account.CreatedAt,
		&account.Verified, &account.Status, &account.RiskScore)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get account: %w", err)
	}
	return account, nil
}

func (s *AccountService) GetByEmail(ctx context.Context, email string) (*models.Account, error) {
	account := &models.Account{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, email, password_hash, plan_id, retention_days, created_at, verified, status, risk_score
		 FROM accounts WHERE email = $1`, email,
	).Scan(&account.ID, &account.Name, &account.Email, &account.PasswordHash,
		&account.PlanID, &account.RetentionDays, &account.CreatedAt,
		&account.Verified, &account.Status, &account.RiskScore)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get account by email: %w", err)
	}
	return account, nil
}

func (s *AccountService) Update(ctx context.Context, account *models.Account) error {
	_, err := s.db.Exec(ctx,
		`UPDATE accounts SET name=$1, plan_id=$2, retention_days=$3, verified=$4, status=$5, risk_score=$6
		 WHERE id=$7`,
		account.Name, account.PlanID, account.RetentionDays, account.Verified, account.Status, account.RiskScore, account.ID)
	return err
}

func (s *AccountService) UpdateRiskScore(ctx context.Context, id string, score float64) error {
	_, err := s.db.Exec(ctx, `UPDATE accounts SET risk_score=$1 WHERE id=$2`, score, id)
	return err
}

func (s *AccountService) List(ctx context.Context, offset, limit int) ([]models.Account, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, name, email, password_hash, plan_id, retention_days, created_at, verified, status, risk_score
		 FROM accounts ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []models.Account
	for rows.Next() {
		var a models.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.Email, &a.PasswordHash, &a.PlanID, &a.RetentionDays,
			&a.CreatedAt, &a.Verified, &a.Status, &a.RiskScore); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, nil
}

func (s *AccountService) Suspend(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `UPDATE accounts SET status='suspended' WHERE id=$1`, id)
	return err
}

func (s *AccountService) Activate(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `UPDATE accounts SET status='active' WHERE id=$1`, id)
	return err
}

func (s *AccountService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM accounts WHERE id=$1`, id)
	return err
}

// CreateFreeSubscription creates a free plan subscription for a new account
func (s *AccountService) CreateFreeSubscription(ctx context.Context, accountID string) error {
	renewalDate := time.Now().AddDate(0, 1, 0)
	_, err := s.db.Exec(ctx,
		`INSERT INTO subscriptions (account_id, plan_type, billing_cycle, status, renewal_date, quota_daily, quota_monthly, overage_buffer_pct, max_queue_depth, dedicated_pool, default_routing_strategy)
		 SELECT $1, id, 'monthly', 'active', $2, daily_quota, monthly_quota, overage_buffer_pct, max_queue_depth, dedicated_pool, default_routing_strategy
		 FROM plans WHERE id = 'free'
		 ON CONFLICT DO NOTHING`,
		accountID, renewalDate)
	return err
}

func (s *AccountService) GetOrCreateSubscription(ctx context.Context, accountID string) (*models.Subscription, error) {
	sub := &models.Subscription{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, plan_type, billing_cycle, status, renewal_date, stripe_customer_id,
		        quota_daily, quota_monthly, overage_buffer_pct, max_queue_depth, dedicated_pool,
		        default_routing_strategy, created_at, updated_at
		 FROM subscriptions WHERE account_id = $1`, accountID,
	).Scan(&sub.ID, &sub.AccountID, &sub.PlanType, &sub.BillingCycle, &sub.Status, &sub.RenewalDate,
		&sub.StripeCustomerID, &sub.QuotaDaily, &sub.QuotaMonthly, &sub.OverageBufferPct,
		&sub.MaxQueueDepth, &sub.DedicatedPool, &sub.DefaultRoutingStrategy, &sub.CreatedAt, &sub.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *AccountService) CheckQuota(ctx context.Context, accountID string) (bool, error) {
	return s.CheckQuotaWithSub(ctx, accountID, nil)
}

// CheckQuotaWithSub checks the daily message quota, reusing a pre-fetched
// subscription to avoid a redundant DB query. Pass nil for sub if the
// subscription has not been fetched yet (falls back to fetching).
func (s *AccountService) CheckQuotaWithSub(ctx context.Context, accountID string, sub *models.Subscription) (bool, error) {
	var usage models.UsageCounter
	today := time.Now().Format("2006-01-02")
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, date, count FROM usage_counters WHERE account_id=$1 AND date=$2`,
		accountID, today,
	).Scan(&usage.ID, &usage.AccountID, &usage.Date, &usage.Count)
	if err == pgx.ErrNoRows {
		return true, nil
	} else if err != nil {
		return false, err
	}

	// Reuse subscription from context if available, otherwise fetch
	if sub == nil {
		var fetchErr error
		sub, fetchErr = s.GetOrCreateSubscription(ctx, accountID)
		if fetchErr != nil || sub == nil {
			return true, nil
		}
	}

	withBuffer := int64(float64(sub.QuotaDaily) * (1 + sub.OverageBufferPct/100))
	return usage.Count < withBuffer, nil
}

func (s *AccountService) IncrementUsage(ctx context.Context, accountID string) error {
	today := time.Now().Format("2006-01-02")
	_, err := s.db.Exec(ctx,
		`INSERT INTO usage_counters (account_id, date, count) VALUES ($1, $2, 1)
		 ON CONFLICT (account_id, date) DO UPDATE SET count = usage_counters.count + 1`,
		accountID, today)
	return err
}
