package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/textbee/backend/internal/models"
)

type DeviceService struct {
	db DatabaseQuerier
}

func NewDeviceService(db DatabaseQuerier) *DeviceService {
	return &DeviceService{db: db}
}

func (s *DeviceService) Create(ctx context.Context, device *models.Device) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO devices (id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
		 health_trend_slope, reliability_score, reputation_score, country_code, region, max_per_minute, max_per_hour,
		 circuit_breaker_state, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
		 ON CONFLICT (physical_device_id, sim_slot) DO UPDATE SET
		 status = EXCLUDED.status, updated_at = NOW()`,
		device.ID, device.PhysicalDeviceID, device.AccountID, device.SIMSlot, device.Carrier,
		device.Status, device.SIMHealthStatus, device.HealthTrendSlope, device.ReliabilityScore,
		device.ReputationScore, device.CountryCode, device.Region, device.MaxPerMinute,
		device.MaxPerHour, device.CircuitBreakerState)
	return err
}

func (s *DeviceService) GetByID(ctx context.Context, id string) (*models.Device, error) {
	device := &models.Device{}
	err := s.db.QueryRow(ctx,
		`SELECT id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
		        health_trend_slope, last_seen, last_ping_at, last_pong_at, messages_sent_count, last_used_at,
		        mqtt_credential_id, reliability_score, reputation_score, complaint_count, block_event_count,
		        fraud_flag_weight, name, success_rate_24h, uptime_ratio_24h, avg_latency_ms, country_code, region,
		        max_per_minute, max_per_hour, isolated_pool_id, circuit_breaker_state, created_at, updated_at
		 FROM devices WHERE id = $1`, id,
	).Scan(&device.ID, &device.PhysicalDeviceID, &device.AccountID, &device.SIMSlot, &device.Carrier,
		&device.Status, &device.SIMHealthStatus, &device.HealthTrendSlope, &device.LastSeen,
		&device.LastPingAt, &device.LastPongAt, &device.MessagesSentCount, &device.LastUsedAt,
		&device.MQTTCredentialID, &device.ReliabilityScore, &device.ReputationScore,
		&device.ComplaintCount, &device.BlockEventCount, &device.FraudFlagWeight,
		&device.Name,
		&device.SuccessRate24h, &device.UptimeRatio24h, &device.AvgLatencyMs,
		&device.CountryCode, &device.Region, &device.MaxPerMinute, &device.MaxPerHour,
		&device.IsolatedPoolID, &device.CircuitBreakerState, &device.CreatedAt, &device.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("get device: %w", err)
	}
	return device, nil
}

func (s *DeviceService) ListByAccount(ctx context.Context, accountID string) ([]models.Device, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
		        health_trend_slope, last_seen, last_ping_at, last_pong_at, messages_sent_count, last_used_at,
		        mqtt_credential_id, reliability_score, reputation_score, complaint_count, block_event_count,
		        fraud_flag_weight, name, success_rate_24h, uptime_ratio_24h, avg_latency_ms, country_code, region,
		        max_per_minute, max_per_hour, isolated_pool_id, circuit_breaker_state, created_at, updated_at
		 FROM devices WHERE account_id = $1 ORDER BY created_at DESC`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		if err := rows.Scan(&d.ID, &d.PhysicalDeviceID, &d.AccountID, &d.SIMSlot, &d.Carrier,
			&d.Status, &d.SIMHealthStatus, &d.HealthTrendSlope, &d.LastSeen,
			&d.LastPingAt, &d.LastPongAt, &d.MessagesSentCount, &d.LastUsedAt,
			&d.MQTTCredentialID, &d.ReliabilityScore, &d.ReputationScore,
			&d.ComplaintCount, &d.BlockEventCount, &d.FraudFlagWeight,
			&d.Name,
			&d.SuccessRate24h, &d.UptimeRatio24h, &d.AvgLatencyMs,
			&d.CountryCode, &d.Region, &d.MaxPerMinute, &d.MaxPerHour,
			&d.IsolatedPoolID, &d.CircuitBreakerState, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *DeviceService) ListAll(ctx context.Context) ([]models.Device, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
		        health_trend_slope, last_seen, last_ping_at, last_pong_at, messages_sent_count, last_used_at,
		        mqtt_credential_id, reliability_score, reputation_score, complaint_count, block_event_count,
		        fraud_flag_weight, name, success_rate_24h, uptime_ratio_24h, avg_latency_ms, country_code, region,
		        max_per_minute, max_per_hour, isolated_pool_id, circuit_breaker_state, created_at, updated_at
		 FROM devices ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		if err := rows.Scan(&d.ID, &d.PhysicalDeviceID, &d.AccountID, &d.SIMSlot, &d.Carrier,
			&d.Status, &d.SIMHealthStatus, &d.HealthTrendSlope, &d.LastSeen,
			&d.LastPingAt, &d.LastPongAt, &d.MessagesSentCount, &d.LastUsedAt,
			&d.MQTTCredentialID, &d.ReliabilityScore, &d.ReputationScore,
			&d.ComplaintCount, &d.BlockEventCount, &d.FraudFlagWeight,
			&d.Name,
			&d.SuccessRate24h, &d.UptimeRatio24h, &d.AvgLatencyMs,
			&d.CountryCode, &d.Region, &d.MaxPerMinute, &d.MaxPerHour,
			&d.IsolatedPoolID, &d.CircuitBreakerState, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *DeviceService) GetEligibleDevices(ctx context.Context, opts DeviceFilterOptions) ([]models.Device, error) {
	query := `SELECT id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
		health_trend_slope, last_seen, last_ping_at, last_pong_at, messages_sent_count, last_used_at,
		mqtt_credential_id, reliability_score, reputation_score, complaint_count, block_event_count,
		fraud_flag_weight, name, success_rate_24h, uptime_ratio_24h, avg_latency_ms, country_code, region,
		max_per_minute, max_per_hour, isolated_pool_id, circuit_breaker_state, created_at, updated_at
		FROM devices WHERE 1=1`

	var args []interface{}
	argIdx := 1

	if opts.AccountID != "" {
		query += fmt.Sprintf(" AND account_id = $%d", argIdx)
		args = append(args, opts.AccountID)
		argIdx++
	}
	if opts.Status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, opts.Status)
		argIdx++
	}
	if opts.ExcludeBlocked {
		query += " AND sim_health_status != 'BLOCKED'"
	}
	if opts.ExcludeDegraded {
		query += " AND sim_health_status != 'DEGRADED'"
	}
	if opts.Carrier != "" {
		query += fmt.Sprintf(" AND carrier = $%d", argIdx)
		args = append(args, opts.Carrier)
		argIdx++
	}
	if opts.CountryCode != "" {
		query += fmt.Sprintf(" AND country_code = $%d", argIdx)
		args = append(args, opts.CountryCode)
		argIdx++
	}
	if opts.CircuitBreakerClosed {
		query += " AND circuit_breaker_state != 'OPEN'"
	}

	query += " ORDER BY reliability_score DESC, reputation_score DESC"
	query += fmt.Sprintf(" LIMIT $%d", argIdx)
	args = append(args, opts.Limit)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query devices: %w", err)
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		if err := rows.Scan(&d.ID, &d.PhysicalDeviceID, &d.AccountID, &d.SIMSlot, &d.Carrier,
			&d.Status, &d.SIMHealthStatus, &d.HealthTrendSlope, &d.LastSeen,
			&d.LastPingAt, &d.LastPongAt, &d.MessagesSentCount, &d.LastUsedAt,
			&d.MQTTCredentialID, &d.ReliabilityScore, &d.ReputationScore,
			&d.ComplaintCount, &d.BlockEventCount, &d.FraudFlagWeight,
			&d.Name,
			&d.SuccessRate24h, &d.UptimeRatio24h, &d.AvgLatencyMs,
			&d.CountryCode, &d.Region, &d.MaxPerMinute, &d.MaxPerHour,
			&d.IsolatedPoolID, &d.CircuitBreakerState, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (s *DeviceService) UpdateStatus(ctx context.Context, id string, status models.DeviceStatus) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET status=$1, last_seen=$2, updated_at=NOW() WHERE id=$3`, status, now, id)
	return err
}

func (s *DeviceService) UpdateScores(ctx context.Context, id string, reliability, reputation float64) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET reliability_score=$1, reputation_score=$2, updated_at=NOW() WHERE id=$3`,
		reliability, reputation, id)
	return err
}

func (s *DeviceService) UpdateHealthStatus(ctx context.Context, id string, status models.SIMHealthStatus, trendSlope float64) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET sim_health_status=$1, health_trend_slope=$2, updated_at=NOW() WHERE id=$3`,
		status, trendSlope, id)
	return err
}

func (s *DeviceService) UpdatePong(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET last_pong_at=$1, status='ONLINE', updated_at=NOW() WHERE id=$2`, now, id)
	return err
}

func (s *DeviceService) RecordSent(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET messages_sent_count = messages_sent_count + 1, last_used_at=$1, updated_at=NOW() WHERE id=$2`,
		now, id)
	return err
}

func (s *DeviceService) UpdateName(ctx context.Context, id string, name string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET name=$1, updated_at=NOW() WHERE id=$2`, name, id)
	return err
}

func (s *DeviceService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`DELETE FROM devices WHERE id=$1`, id)
	return err
}

func (s *DeviceService) IncrementComplaint(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET complaint_count = complaint_count + 1, updated_at=NOW() WHERE id=$1`, id)
	return err
}

func (s *DeviceService) IncrementBlockEvent(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET block_event_count = block_event_count + 1, updated_at=NOW() WHERE id=$1`, id)
	return err
}

func (s *DeviceService) UpdateCircuitBreakerState(ctx context.Context, id string, state models.CircuitBreakerState) error {
	_, err := s.db.Exec(ctx,
		`UPDATE devices SET circuit_breaker_state=$1, updated_at=NOW() WHERE id=$2`, state, id)
	return err
}

type DeviceFilterOptions struct {
	AccountID          string
	Status             string
	ExcludeBlocked     bool
	ExcludeDegraded    bool
	Carrier            string
	CountryCode        string
	CircuitBreakerClosed bool
	Limit              int
}
