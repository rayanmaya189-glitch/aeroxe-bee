package handlers

import (
	"net/http"
	"time"

	"github.com/textbee/backend/internal/circuitbreaker"
	"github.com/textbee/backend/internal/models"
	"github.com/textbee/backend/internal/services"
	"github.com/textbee/backend/internal/telemetry"
)

type AdminHandler struct {
	adminService *services.AdminService
	cbManager    *circuitbreaker.StateManager
	metrics      *telemetry.Metrics
}

func NewAdminHandler(adminService *services.AdminService, cbManager *circuitbreaker.StateManager, metrics *telemetry.Metrics) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
		cbManager:    cbManager,
		metrics:      metrics,
	}
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.adminService.GetPlatformStats(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get stats: " + err.Error()})
		return
	}

	depths, _ := h.adminService.GetQueueDepths(r.Context())
	if depths == nil {
		depths = make(map[string]int64)
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"total_accounts":  stats.TotalAccounts,
			"active_devices":  stats.ActiveDevices,
			"total_sent":      stats.TotalSent,
			"total_delivered": stats.TotalDelivered,
			"total_failed":    stats.TotalFailed,
			"avg_confidence":  stats.AvgConfidence,
			"active_circuits": stats.ActiveCircuits,
			"pending_fraud":   stats.PendingFraud,
			"queue_depth":     depths,
			"timestamp":       time.Now(),
		},
	})
}

func (h *AdminHandler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	accounts, err := h.adminService.ListAccounts(r.Context(), offset, pageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}

	// Get total count
	totalAccounts, err := h.adminService.GetTotalAccountCount(r.Context())
	if err != nil {
		totalAccounts = int64(len(accounts))
	}

	totalPages := int(totalAccounts) / pageSize
	if int(totalAccounts)%pageSize > 0 {
		totalPages++
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data":        accounts,
			"total":       totalAccounts,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

func (h *AdminHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	account, err := h.adminService.GetAccount(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if account == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "account not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: account})
}

func (h *AdminHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.DeleteAccount(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete account"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AdminHandler) SuspendAccount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.SuspendAccount(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to suspend"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AdminHandler) ActivateAccount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.ActivateAccount(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to activate"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AdminHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start")
	endDate := r.URL.Query().Get("end")

	if startDate == "" {
		startDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02")
	}

	analytics, err := h.adminService.GetAnalytics(r.Context(), startDate, endDate)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get analytics"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: analytics})
}

func (h *AdminHandler) GetDailyCharts(w http.ResponseWriter, r *http.Request) {
	// Get analytics for last 30 days
	startDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	endDate := time.Now().Format("2006-01-02")

	analytics, err := h.adminService.GetAnalytics(r.Context(), startDate, endDate)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get chart data"})
		return
	}

	// Transform into chart-friendly format
	messages := make([]map[string]interface{}, 0, len(analytics))
	users := make([]map[string]interface{}, 0, len(analytics))
	revenue := make([]map[string]interface{}, 0, len(analytics))

	for _, a := range analytics {
		messages = append(messages, map[string]interface{}{
			"date":  a.Date,
			"value": a.TotalSent,
		})
		users = append(users, map[string]interface{}{
			"date":  a.Date,
			"value": a.TotalDelivered,
		})
		revenue = append(revenue, map[string]interface{}{
			"date":  a.Date,
			"value": float64(a.TotalSent) * 0.005,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"messages": messages,
			"users":    users,
			"revenue":  revenue,
		},
	})
}

func (h *AdminHandler) GetCircuitBreakers(w http.ResponseWriter, r *http.Request) {
	events := h.cbManager.GetAllStates(r.Context())
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: events})
}

func (h *AdminHandler) ResetCircuitBreaker(w http.ResponseWriter, r *http.Request) {
	scope := r.PathValue("scope")
	scopeValue := r.PathValue("id")

	var cbScope models.CircuitBreakerScope
	switch scope {
	case "device":
		cbScope = models.CBScopeDevice
	case "account":
		cbScope = models.CBScopeAccount
	case "carrier":
		cbScope = models.CBScopeCarrier
	default:
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid scope"})
		return
	}

	if err := h.cbManager.Reset(r.Context(), cbScope, scopeValue); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reset"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AdminHandler) ListAllTemplates(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")

	templates, err := h.adminService.ListAllTemplates(r.Context(), status, dateFrom, dateTo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: templates})
}

func (h *AdminHandler) ListAllWebhooks(w http.ResponseWriter, r *http.Request) {
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")

	webhooks, err := h.adminService.ListAllWebhooks(r.Context(), dateFrom, dateTo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list webhooks"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: webhooks})
}

func (h *AdminHandler) GetDeadLetters(w http.ResponseWriter, r *http.Request) {
	page := parseIntOrDefault(r.URL.Query().Get("page"), 1)
	pageSize := parseIntOrDefault(r.URL.Query().Get("pageSize"), 20)
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")

	letters, total, err := h.adminService.GetDeadLetters(r.Context(), offset, pageSize, dateFrom, dateTo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get dead letters"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"data":        letters,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

func (h *AdminHandler) RetryDeadLetter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.RetryDeadLetter(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to retry: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]string{"dead_letter_id": id, "status": "requeued"},
	})
}

func (h *AdminHandler) GetPendingTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.adminService.GetPendingTemplateApprovals(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: templates})
}

func (h *AdminHandler) ApproveTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.ApproveTemplate(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *AdminHandler) RejectTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.adminService.RejectTemplate(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
