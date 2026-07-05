package handlers

import (
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/circuitbreaker"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/telemetry"
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
	pg := ParsePagination(r, 20, 100)
	// TODO: pass date range to service layer for date_from/date_to filtering
	_ = ParseDateRange(r)

	accounts, err := h.adminService.ListAccounts(r.Context(), pg.Offset, pg.PageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}

	totalAccounts, err := h.adminService.GetTotalAccountCount(r.Context())
	if err != nil {
		totalAccounts = int64(len(accounts))
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    pg.ToResponse(accounts, totalAccounts),
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
	pg := ParsePagination(r, 50, 200)
	dr := ParseDateRange(r)
	var dateFrom, dateTo string
	if dr.DateFrom != nil {
		dateFrom = dr.DateFrom.Format("2006-01-02")
	}
	if dr.DateTo != nil {
		dateTo = dr.DateTo.Format("2006-01-02")
	}

	templates, total, err := h.adminService.ListAllTemplates(r.Context(), status, dateFrom, dateTo, pg.Offset, pg.PageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(templates, total)})
}

func (h *AdminHandler) ListAllWebhooks(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 50, 200)
	dr := ParseDateRange(r)
	var dateFrom, dateTo string
	if dr.DateFrom != nil {
		dateFrom = dr.DateFrom.Format("2006-01-02")
	}
	if dr.DateTo != nil {
		dateTo = dr.DateTo.Format("2006-01-02")
	}

	webhooks, total, err := h.adminService.ListAllWebhooks(r.Context(), dateFrom, dateTo, pg.Offset, pg.PageSize)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list webhooks"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(webhooks, total)})
}

func (h *AdminHandler) GetDeadLetters(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)
	dr := ParseDateRange(r)
	var dateFrom, dateTo string
	if dr.DateFrom != nil {
		dateFrom = dr.DateFrom.Format("2006-01-02")
	}
	if dr.DateTo != nil {
		dateTo = dr.DateTo.Format("2006-01-02")
	}

	letters, total, err := h.adminService.GetDeadLetters(r.Context(), pg.Offset, pg.PageSize, dateFrom, dateTo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get dead letters"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(letters, total)})
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
