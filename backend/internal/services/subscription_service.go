package services

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type SubscriptionService struct {
	db DatabaseQuerier
}

func NewSubscriptionService(db DatabaseQuerier) *SubscriptionService {
	return &SubscriptionService{db: db}
}

func (s *SubscriptionService) GetByAccountID(ctx context.Context, accountID string) (*models.Subscription, error) {
	sub := &models.Subscription{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, plan_type, billing_cycle, status, renewal_date, stripe_customer_id,
		        quota_daily, quota_monthly, overage_buffer_pct, max_queue_depth, max_templates, dedicated_pool,
		        default_routing_strategy, created_at, updated_at
		 FROM subscriptions WHERE account_id = $1`, accountID,
	).Scan(&sub.ID, &sub.AccountID, &sub.PlanType, &sub.BillingCycle, &sub.Status, &sub.RenewalDate,
		&sub.StripeCustomerID, &sub.QuotaDaily, &sub.QuotaMonthly, &sub.OverageBufferPct,
		&sub.MaxQueueDepth, &sub.MaxTemplates, &sub.DedicatedPool, &sub.DefaultRoutingStrategy, &sub.CreatedAt, &sub.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *SubscriptionService) Create(ctx context.Context, sub *models.Subscription) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO subscriptions (account_id, plan_type, billing_cycle, status, renewal_date,
		 stripe_customer_id, quota_daily, quota_monthly, overage_buffer_pct, max_queue_depth,
		 max_templates, dedicated_pool, default_routing_strategy, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
		sub.AccountID, sub.PlanType, sub.BillingCycle, sub.Status, sub.RenewalDate,
		sub.StripeCustomerID, sub.QuotaDaily, sub.QuotaMonthly, sub.OverageBufferPct,
		sub.MaxQueueDepth, sub.MaxTemplates, sub.DedicatedPool, sub.DefaultRoutingStrategy)
	return err
}

func (s *SubscriptionService) Update(ctx context.Context, sub *models.Subscription) error {
	_, err := s.db.Exec(ctx,
		`UPDATE subscriptions SET plan_type=$1, billing_cycle=$2, status=$3, renewal_date=$4,
		 quota_daily=$5, quota_monthly=$6, overage_buffer_pct=$7, max_queue_depth=$8,
		 max_templates=$9, dedicated_pool=$10, default_routing_strategy=$11, updated_at=NOW()
		 WHERE id=$12`,
		sub.PlanType, sub.BillingCycle, sub.Status, sub.RenewalDate,
		sub.QuotaDaily, sub.QuotaMonthly, sub.OverageBufferPct, sub.MaxQueueDepth,
		sub.MaxTemplates, sub.DedicatedPool, sub.DefaultRoutingStrategy, sub.ID)
	return err
}

func (s *SubscriptionService) GetDefaultRoutingStrategy(ctx context.Context, accountID string) (models.RoutingStrategy, error) {
	sub, err := s.GetByAccountID(ctx, accountID)
	if err != nil {
		return "", err
	}
	if sub == nil {
		return models.RoutingStrategyHighestReliability, nil
	}
	return sub.DefaultRoutingStrategy, nil
}

func (s *SubscriptionService) UpdateRoutingStrategy(ctx context.Context, accountID string, strategy models.RoutingStrategy) error {
	_, err := s.db.Exec(ctx,
		`UPDATE subscriptions SET default_routing_strategy=$1, updated_at=NOW()
		 WHERE account_id=$2`, strategy, accountID)
	return err
}

func (s *SubscriptionService) GetMaxQueueDepth(ctx context.Context, accountID string) (int, error) {
	sub, err := s.GetByAccountID(ctx, accountID)
	if err != nil {
		return 1000, err
	}
	if sub == nil {
		return 1000, nil
	}
	return sub.MaxQueueDepth, nil
}

func (s *SubscriptionService) GetMaxTemplates(ctx context.Context, accountID string) (int, error) {
	sub, err := s.GetByAccountID(ctx, accountID)
	if err != nil {
		return 10, err
	}
	if sub == nil {
		return 10, nil
	}
	return sub.MaxTemplates, nil
}
