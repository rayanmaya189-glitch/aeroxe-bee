package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BIHandler struct {
	db *pgxpool.Pool
}

func NewBIHandler(db *pgxpool.Pool) *BIHandler {
	return &BIHandler{db: db}
}

type BIResponse struct {
	TotalAccounts     int64   `json:"total_accounts"`
	ActiveAccounts    int64   `json:"active_accounts"`
	TotalDevices      int64   `json:"total_devices"`
	OnlineDevices     int64   `json:"online_devices"`
	TotalMessages     int64   `json:"total_messages"`
	TotalDelivered    int64   `json:"total_delivered"`
	TotalFailed       int64   `json:"total_failed"`
	TotalRevenue      float64 `json:"total_revenue"`
	AccountGrowth     []DateCount      `json:"account_growth"`
	TopAccounts       []AccountVolume  `json:"top_accounts"`
	DeviceFleet       []FleetStatus    `json:"device_fleet"`
	RoutingBreakdown  []StrategyCount  `json:"routing_breakdown"`
	TypeBreakdown     []TypeCount      `json:"type_breakdown"`
	HourlyDistribution []HourCount     `json:"hourly_distribution"`
	DeliveryTrend     []DateCount      `json:"delivery_trend"`
	RevenueByPlan     []PlanRevenue    `json:"revenue_by_plan"`
}

type DateCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type AccountVolume struct {
	AccountID   string `json:"account_id"`
	AccountName string `json:"account_name"`
	TotalSent   int64  `json:"total_sent"`
	Delivered   int64  `json:"delivered"`
	Failed      int64  `json:"failed"`
}

type FleetStatus struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type StrategyCount struct {
	Strategy string `json:"strategy"`
	Count    int64  `json:"count"`
}

type TypeCount struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
}

type HourCount struct {
	Hour  int   `json:"hour"`
	Count int64 `json:"count"`
}

type PlanRevenue struct {
	PlanID   string  `json:"plan_id"`
	PlanName string  `json:"plan_name"`
	Count    int64   `json:"count"`
	Revenue  float64 `json:"revenue"`
}

func (h *BIHandler) GetBIDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	resp := BIResponse{}

	// Overview stats
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM accounts`).Scan(&resp.TotalAccounts)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM accounts WHERE status = 'active'`).Scan(&resp.ActiveAccounts)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM devices`).Scan(&resp.TotalDevices)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM devices WHERE status = 'ONLINE'`).Scan(&resp.OnlineDevices)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FROM messages`).Scan(&resp.TotalMessages)
	h.db.QueryRow(ctx, `SELECT COUNT(*) FILTER (WHERE delivery_status IN ('CARRIER_ACCEPTED','PROBABLE_DELIVERED')), COUNT(*) FILTER (WHERE delivery_status = 'FAILED') FROM messages`).Scan(&resp.TotalDelivered, &resp.TotalFailed)
	h.db.QueryRow(ctx, `SELECT COALESCE(SUM(p.monthly_price), 0) FROM subscriptions s JOIN plans p ON s.plan_type = p.id WHERE s.status = 'active'`).Scan(&resp.TotalRevenue)

	// Account growth (last 30 days)
	if rows, err := h.db.Query(ctx, `SELECT date_trunc('day', created_at)::date as day, COUNT(*) FROM accounts WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var d DateCount
			rows.Scan(&d.Date, &d.Count)
			resp.AccountGrowth = append(resp.AccountGrowth, d)
		}
	}

	// Top accounts by message volume
	if rows, err := h.db.Query(ctx, `SELECT m.api_key_id, COALESCE(a.name,'Unknown') as name, COUNT(*) as total, COUNT(*) FILTER (WHERE m.delivery_status IN ('CARRIER_ACCEPTED','PROBABLE_DELIVERED')) as delivered, COUNT(*) FILTER (WHERE m.delivery_status = 'FAILED') as failed FROM messages m LEFT JOIN api_keys ak ON m.api_key_id = ak.id LEFT JOIN accounts a ON ak.account_id = a.id GROUP BY m.api_key_id, a.name ORDER BY total DESC LIMIT 10`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var av AccountVolume
			rows.Scan(&av.AccountID, &av.AccountName, &av.TotalSent, &av.Delivered, &av.Failed)
			resp.TopAccounts = append(resp.TopAccounts, av)
		}
	}

	// Device fleet status
	if rows, err := h.db.Query(ctx, `SELECT status, COUNT(*) FROM devices GROUP BY status`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var fs FleetStatus
			rows.Scan(&fs.Status, &fs.Count)
			resp.DeviceFleet = append(resp.DeviceFleet, fs)
		}
	}

	// Routing strategy breakdown
	if rows, err := h.db.Query(ctx, `SELECT routing_strategy_used, COUNT(*) FROM messages GROUP BY routing_strategy_used ORDER BY COUNT(*) DESC`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var sc StrategyCount
			rows.Scan(&sc.Strategy, &sc.Count)
			resp.RoutingBreakdown = append(resp.RoutingBreakdown, sc)
		}
	}

	// Message type breakdown (last 30 days)
	if rows, err := h.db.Query(ctx, `SELECT message_type, COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY message_type ORDER BY COUNT(*) DESC`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var tc TypeCount
			rows.Scan(&tc.Type, &tc.Count)
			resp.TypeBreakdown = append(resp.TypeBreakdown, tc)
		}
	}

	// Hourly distribution (last 7 days)
	if rows, err := h.db.Query(ctx, `SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY hour ORDER BY hour`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var hc HourCount
			rows.Scan(&hc.Hour, &hc.Count)
			resp.HourlyDistribution = append(resp.HourlyDistribution, hc)
		}
	}

	// Delivery trend (last 30 days)
	if rows, err := h.db.Query(ctx, `SELECT date_trunc('day', created_at)::date as day, COUNT(*) FILTER (WHERE delivery_status IN ('CARRIER_ACCEPTED','PROBABLE_DELIVERED')) as delivered FROM messages WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var d DateCount
			rows.Scan(&d.Date, &d.Count)
			resp.DeliveryTrend = append(resp.DeliveryTrend, d)
		}
	}

	// Revenue by plan
	if rows, err := h.db.Query(ctx, `SELECT p.id, p.name, COUNT(s.id) as subscribers, p.monthly_price * COUNT(s.id) as revenue FROM plans p LEFT JOIN subscriptions s ON s.plan_type = p.id AND s.status = 'active' GROUP BY p.id, p.name, p.monthly_price ORDER BY revenue DESC`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var pr PlanRevenue
			rows.Scan(&pr.PlanID, &pr.PlanName, &pr.Count, &pr.Revenue)
			resp.RevenueByPlan = append(resp.RevenueByPlan, pr)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: resp})
}
