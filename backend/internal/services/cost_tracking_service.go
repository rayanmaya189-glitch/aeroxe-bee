package services

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/aeroxe-bee/backend/internal/models"
)

type CostTrackingService struct {
	db DatabaseQuerier
}

func NewCostTrackingService(db DatabaseQuerier) *CostTrackingService {
	return &CostTrackingService{db: db}
}

func (s *CostTrackingService) RecordCost(ctx context.Context, cost *models.CostTracking) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO cost_tracking (device_id, account_id, cost_per_sms, currency, date, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		cost.DeviceID, cost.AccountID, cost.CostPerSMS, cost.Currency, time.Now().Format("2006-01-02"))
	return err
}

func (s *CostTrackingService) GetDeviceCostProfile(ctx context.Context, deviceID string) (*models.DeviceCostProfile, error) {
	profile := &models.DeviceCostProfile{}
	err := s.db.QueryRow(ctx,
		`SELECT id, device_id, sim_cost_per_sms, region_cost_multiplier, plan_context, created_at, updated_at
		 FROM device_cost_profiles WHERE device_id = $1`, deviceID,
	).Scan(&profile.ID, &profile.DeviceID, &profile.SIMCostPerSMS, &profile.RegionCostMultiplier,
		&profile.PlanContext, &profile.CreatedAt, &profile.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return profile, nil
}

func (s *CostTrackingService) SetDeviceCostProfile(ctx context.Context, profile *models.DeviceCostProfile) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO device_cost_profiles (device_id, sim_cost_per_sms, region_cost_multiplier, plan_context, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())
		 ON CONFLICT (device_id) DO UPDATE SET
		 sim_cost_per_sms = EXCLUDED.sim_cost_per_sms,
		 region_cost_multiplier = EXCLUDED.region_cost_multiplier,
		 plan_context = EXCLUDED.plan_context,
		 updated_at = NOW()`,
		profile.DeviceID, profile.SIMCostPerSMS, profile.RegionCostMultiplier, profile.PlanContext)
	return err
}

func (s *CostTrackingService) GetCostMap(ctx context.Context, deviceIDs []string) (map[string]float64, error) {
	costMap := make(map[string]float64)
	for _, id := range deviceIDs {
		profile, err := s.GetDeviceCostProfile(ctx, id)
		if err != nil {
			return nil, err
		}
		if profile != nil {
			costMap[id] = profile.SIMCostPerSMS * profile.RegionCostMultiplier
		} else {
			costMap[id] = 0.01
		}
	}
	return costMap, nil
}

func (s *CostTrackingService) GetAccountCosts(ctx context.Context, accountID, startDate, endDate string) ([]models.CostTracking, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, device_id, account_id, cost_per_sms, currency, date, created_at
		 FROM cost_tracking WHERE account_id = $1 AND date >= $2 AND date <= $3
		 ORDER BY date DESC`, accountID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var costs []models.CostTracking
	for rows.Next() {
		var c models.CostTracking
		if err := rows.Scan(&c.ID, &c.DeviceID, &c.AccountID, &c.CostPerSMS, &c.Currency, &c.Date, &c.CreatedAt); err != nil {
			return nil, err
		}
		costs = append(costs, c)
	}
	return costs, nil
}

func (s *CostTrackingService) GetTotalCost(ctx context.Context, accountID, startDate, endDate string) (float64, error) {
	var total float64
	err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(cost_per_sms), 0) FROM cost_tracking
		 WHERE account_id = $1 AND date >= $2 AND date <= $3`,
		accountID, startDate, endDate).Scan(&total)
	return total, err
}
