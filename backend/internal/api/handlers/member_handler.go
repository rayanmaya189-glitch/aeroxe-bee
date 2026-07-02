package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
)

// MemberHandler handles member portal API endpoints
type MemberHandler struct {
	accountService    *services.AccountService
	deviceService     *services.DeviceService
	messageService    *services.MessageService
	billingService    *services.BillingService
	subscriptionService *services.SubscriptionService
}

func NewMemberHandler(
	accountService *services.AccountService,
	deviceService *services.DeviceService,
	messageService *services.MessageService,
	billingService *services.BillingService,
	subscriptionService *services.SubscriptionService,
) *MemberHandler {
	return &MemberHandler{
		accountService:    accountService,
		deviceService:     deviceService,
		messageService:    messageService,
		billingService:    billingService,
		subscriptionService: subscriptionService,
	}
}

// GetDashboard returns consolidated member dashboard data
func (h *MemberHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	account, err := h.accountService.GetByID(r.Context(), accountID)
	if err != nil || account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}

	// Get devices count
	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get devices"})
		return
	}

	onlineCount := 0
	for _, d := range devices {
		if d.Status == models.DeviceStatusOnline {
			onlineCount++
		}
	}

	// Get usage
	usage, err := h.billingService.GetUsage(r.Context(), accountID, time.Now().Format("2006-01-02"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get usage"})
		return
	}

	monthlyUsage, err := h.billingService.GetMonthlyUsage(r.Context(), accountID, time.Now().Year(), int(time.Now().Month()))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get monthly usage"})
		return
	}

	// Get subscription
	sub, _ := h.subscriptionService.GetByAccountID(r.Context(), accountID)

	// Get messages count by status
	msgs, err := h.messageService.ListByAccount(r.Context(), accountID, 0, 1000)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get messages"})
		return
	}

	totalSent := 0
	totalDelivered := 0
	totalFailed := 0
	for _, m := range msgs {
		totalSent++
		if m.DeliveryStatus == models.DeliveryStatusCarrierAccepted || m.DeliveryStatus == models.DeliveryStatusProbableDelivered {
			totalDelivered++
		}
		if m.DeliveryStatus == models.DeliveryStatusFailed {
			totalFailed++
		}
	}

	deliveryRate := 0.0
	if totalSent > 0 {
		deliveryRate = float64(totalDelivered) / float64(totalSent) * 100
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"account": map[string]interface{}{
				"id":     account.ID,
				"name":   account.Name,
				"email":  account.Email,
				"plan":   account.PlanID,
				"status": account.Status,
			},
			"devices": map[string]interface{}{
				"total":  len(devices),
				"online": onlineCount,
			},
			"messages": map[string]interface{}{
				"total_sent":     totalSent,
				"total_delivered": totalDelivered,
				"total_failed":   totalFailed,
				"delivery_rate":  deliveryRate,
			},
			"usage": map[string]interface{}{
				"daily":   usage.Count,
				"monthly": monthlyUsage,
			},
			"subscription": sub,
		},
	})
}

// GetDevices returns all devices for the member's account
func (h *MemberHandler) GetDevices(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get devices"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: devices})
}

// GetMessages returns paginated messages for the member's account with optional filters
func (h *MemberHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	statusFilter := r.URL.Query().Get("status")
	typeFilter := r.URL.Query().Get("type")

	msgs, err := h.messageService.ListByAccountFiltered(r.Context(), accountID, offset, pageSize, statusFilter, typeFilter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get messages"})
		return
	}

	total, err := h.messageService.CountByAccountFiltered(r.Context(), accountID, statusFilter, typeFilter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to count messages"})
		return
	}

	totalPages := total / pageSize
	if total%pageSize > 0 {
		totalPages++
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data":        msgs,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

// GetAnalytics returns server-side aggregated analytics for the member's account
func (h *MemberHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	// Aggregate directly from the messages table for accuracy
	rows, err := h.messageService.DB().Query(r.Context(),
		`SELECT DATE(created_at) as date,
		       COUNT(*) as total,
		       COUNT(*) FILTER (WHERE delivery_status IN ('CARRIER_ACCEPTED','PROBABLE_DELIVERED')) as delivered,
		       COUNT(*) FILTER (WHERE delivery_status = 'FAILED') as failed,
		       COUNT(*) FILTER (WHERE message_type = 'otp') as otp,
		       COUNT(*) FILTER (WHERE message_type = 'transactional') as transactional,
		       COUNT(*) FILTER (WHERE message_type = 'marketing') as marketing
		 FROM messages
		 WHERE api_key_id IN (SELECT id FROM api_keys WHERE account_id = $1)
		   AND created_at >= NOW() - INTERVAL '30 days'
		 GROUP BY DATE(created_at)
		 ORDER BY date DESC`, accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: fmt.Sprintf("failed to get analytics: %s", err.Error())})
		return
	}
	defer rows.Close()

	var chartData []map[string]interface{}
	for rows.Next() {
		var date string
		var total, delivered, failed, otp, transactional, marketing int64
		if err := rows.Scan(&date, &total, &delivered, &failed, &otp, &transactional, &marketing); err != nil {
			continue
		}
		chartData = append(chartData, map[string]interface{}{
			"date":          date,
			"total":         total,
			"delivered":     delivered,
			"failed":        failed,
			"otp":           otp,
			"transactional": transactional,
			"marketing":     marketing,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    chartData,
	})
}

// GetStats returns real-time stats for the member
func (h *MemberHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	// Get today's usage
	usage, err := h.billingService.GetUsage(r.Context(), accountID, time.Now().Format("2006-01-02"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get usage"})
		return
	}

	// Get devices
	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get devices"})
		return
	}

	onlineCount := 0
	for _, d := range devices {
		if d.Status == models.DeviceStatusOnline {
			onlineCount++
		}
	}

	// Get subscription
	sub, _ := h.subscriptionService.GetByAccountID(r.Context(), accountID)

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"daily_usage":  usage.Count,
			"devices":      len(devices),
			"online":       onlineCount,
			"plan":         sub,
		},
	})
}
