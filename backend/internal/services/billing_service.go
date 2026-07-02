package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type BillingService struct {
	db DatabaseQuerier
}

func NewBillingService(db DatabaseQuerier) *BillingService {
	return &BillingService{db: db}
}

func (s *BillingService) GetUsage(ctx context.Context, accountID string, date string) (*models.UsageCounter, error) {
	usage := &models.UsageCounter{}
	err := s.db.QueryRow(ctx,
		`SELECT id, account_id, date, count, created_at, updated_at
		 FROM usage_counters WHERE account_id = $1 AND date = $2`,
		accountID, date,
	).Scan(&usage.ID, &usage.AccountID, &usage.Date, &usage.Count, &usage.CreatedAt, &usage.UpdatedAt)
	if err == pgx.ErrNoRows {
		return &models.UsageCounter{AccountID: accountID, Date: date, Count: 0}, nil
	} else if err != nil {
		return nil, err
	}
	return usage, nil
}

func (s *BillingService) GetMonthlyUsage(ctx context.Context, accountID string, year, month int) (int64, error) {
	startDate := fmt.Sprintf("%04d-%02d-01", year, month)
	var endDate string
	t := time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC)
	endDate = t.Format("2006-01-02")

	var total int64
	err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(count), 0) FROM usage_counters
		 WHERE account_id = $1 AND date >= $2 AND date <= $3`,
		accountID, startDate, endDate).Scan(&total)
	return total, err
}

func (s *BillingService) CheckOverUsage(ctx context.Context, accountID string) (bool, error) {
	sub, err := NewSubscriptionService(s.db).GetByAccountID(ctx, accountID)
	if err != nil || sub == nil {
		return false, err
	}

	now := time.Now()
	monthly, err := s.GetMonthlyUsage(ctx, accountID, now.Year(), int(now.Month()))
	if err != nil {
		return false, err
	}

	maxWithBuffer := int64(float64(sub.QuotaMonthly) * (1 + sub.OverageBufferPct/100))
	return monthly >= maxWithBuffer, nil
}

func (s *BillingService) GetInvoiceData(ctx context.Context, accountID string, year, month int) (map[string]interface{}, error) {
	monthly, err := s.GetMonthlyUsage(ctx, accountID, year, month)
	if err != nil {
		return nil, err
	}

	sub, err := NewSubscriptionService(s.db).GetByAccountID(ctx, accountID)
	if err != nil {
		return nil, err
	}

	data := map[string]interface{}{
		"account_id":   accountID,
		"year":         year,
		"month":        month,
		"total_sms":    monthly,
		"plan_price":   0.0,
		"overage_cost": 0.0,
		"total":        0.0,
	}

	if sub != nil {
		plan, err := s.GetPlan(ctx, string(sub.PlanType))
		if err == nil && plan != nil {
			usage := monthly
			quota := sub.QuotaMonthly
			overage := usage - quota
			if overage > 0 {
				overageCost := float64(overage) * plan.PricePerSMS
				data["overage_cost"] = overageCost
				data["total"] = plan.MonthlyPrice + overageCost
			} else {
				data["total"] = plan.MonthlyPrice
			}
			data["plan_price"] = plan.MonthlyPrice
		}
	}

	return data, nil
}

func (s *BillingService) GetPlan(ctx context.Context, planID string) (*models.Plan, error) {
	plan := &models.Plan{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, daily_quota, monthly_quota, overage_buffer_pct, max_queue_depth,
		        dedicated_pool, default_routing_strategy, price_per_sms, monthly_price
		 FROM plans WHERE id = $1`, planID,
	).Scan(&plan.ID, &plan.Name, &plan.DailyQuota, &plan.MonthlyQuota, &plan.OverageBufferPct,
		&plan.MaxQueueDepth, &plan.DedicatedPool, &plan.DefaultRoutingStrategy,
		&plan.PricePerSMS, &plan.MonthlyPrice)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return plan, nil
}

func (s *BillingService) ListPlans(ctx context.Context) ([]models.Plan, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, name, daily_quota, monthly_quota, overage_buffer_pct, max_queue_depth,
		        dedicated_pool, default_routing_strategy, price_per_sms, monthly_price
		 FROM plans ORDER BY monthly_price ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.DailyQuota, &p.MonthlyQuota, &p.OverageBufferPct,
			&p.MaxQueueDepth, &p.DedicatedPool, &p.DefaultRoutingStrategy,
			&p.PricePerSMS, &p.MonthlyPrice); err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}
