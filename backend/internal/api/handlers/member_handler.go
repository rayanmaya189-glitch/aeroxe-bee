package handlers

import (
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

// GetMessages returns paginated messages for the member's account
func (h *MemberHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	msgs, err := h.messageService.ListByAccount(r.Context(), accountID, offset, pageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get messages"})
		return
	}

	// Get total count
	total, err := h.messageService.CountByAccount(r.Context(), accountID)
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

// GetAnalytics returns analytics data for the member's account
func (h *MemberHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	// Get recent messages for analytics
	msgs, err := h.messageService.ListByAccount(r.Context(), accountID, 0, 1000)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get analytics"})
		return
	}

	// Group by date
	byDate := make(map[string]map[string]int64)
	for _, m := range msgs {
		date := m.CreatedAt.Format("2006-01-02")
		if _, ok := byDate[date]; !ok {
			byDate[date] = map[string]int64{
				"total":      0,
				"delivered":  0,
				"failed":     0,
				"otp":        0,
				"transactional": 0,
				"marketing":  0,
			}
		}
		byDate[date]["total"]++
		if m.DeliveryStatus == models.DeliveryStatusCarrierAccepted || m.DeliveryStatus == models.DeliveryStatusProbableDelivered {
			byDate[date]["delivered"]++
		}
		if m.DeliveryStatus == models.DeliveryStatusFailed {
			byDate[date]["failed"]++
		}
		switch m.MessageType {
		case models.MessageTypeOTP:
			byDate[date]["otp"]++
		case models.MessageTypeTransactional:
			byDate[date]["transactional"]++
		case models.MessageTypeMarketing:
			byDate[date]["marketing"]++
		}
	}

	// Convert to array
	var chartData []map[string]interface{}
	for date, counts := range byDate {
		chartData = append(chartData, map[string]interface{}{
			"date":          date,
			"total":         counts["total"],
			"delivered":     counts["delivered"],
			"failed":        counts["failed"],
			"otp":           counts["otp"],
			"transactional": counts["transactional"],
			"marketing":     counts["marketing"],
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
