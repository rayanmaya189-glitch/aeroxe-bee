package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

// MemberHandler handles member portal API endpoints
type MemberHandler struct {
	accountService       *services.AccountService
	deviceService        *services.DeviceService
	messageService       *services.MessageService
	billingService       *services.BillingService
	subscriptionService  *services.SubscriptionService
	templateService      *services.TemplateService
	webhookService       *services.WebhookService
	preferencesService   *services.UserPreferencesService
	kycService           *services.KycService
}

func NewMemberHandler(
	accountService *services.AccountService,
	deviceService *services.DeviceService,
	messageService *services.MessageService,
	billingService *services.BillingService,
	subscriptionService *services.SubscriptionService,
	templateService *services.TemplateService,
	webhookService *services.WebhookService,
	preferencesService *services.UserPreferencesService,
	kycService *services.KycService,
) *MemberHandler {
	return &MemberHandler{
		accountService:       accountService,
		deviceService:        deviceService,
		messageService:       messageService,
		billingService:       billingService,
		subscriptionService:  subscriptionService,
		templateService:      templateService,
		webhookService:       webhookService,
		preferencesService:   preferencesService,
		kycService:           kycService,
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

	// Use SQL aggregate query instead of fetching all messages
	var totalSent, totalDelivered, totalFailed int64
	err = h.messageService.DB().QueryRow(r.Context(),
		`SELECT
		    COUNT(*) as total_sent,
		    COUNT(*) FILTER (WHERE delivery_status IN ('CARRIER_ACCEPTED','PROBABLE_DELIVERED')) as total_delivered,
		    COUNT(*) FILTER (WHERE delivery_status = 'FAILED') as total_failed
		 FROM messages m
		 JOIN api_keys ak ON m.api_key_id = ak.id
		 WHERE ak.account_id = $1`, accountID,
	).Scan(&totalSent, &totalDelivered, &totalFailed)
	if err != nil {
		// Fallback: if query fails (e.g. no api_keys yet), return zeros
		totalSent, totalDelivered, totalFailed = 0, 0, 0
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
// Joins with physical_devices to include name, model, and os_version
func (h *MemberHandler) GetDevices(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	devices, err := h.deviceService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get devices"})
		return
	}

	// Build response with enriched device info
	type DeviceResponse struct {
		ID              string  `json:"id"`
		Name            string  `json:"name"`
		Model           string  `json:"model"`
		OSVersion       string  `json:"os_version"`
		Status          string  `json:"status"`
		LastSeen        *string `json:"last_seen"`
		SIMSlot         int     `json:"sim_slot"`
		Carrier         string  `json:"carrier"`
		SignalStrength  int     `json:"signal_strength"`
	}

	result := make([]DeviceResponse, 0, len(devices))
	for _, d := range devices {
		name := d.Name
		if name == "" {
			name = d.PhysicalDeviceID
		}
		var lastSeen *string
		if d.LastSeen != nil {
			s := d.LastSeen.Format(time.RFC3339)
			lastSeen = &s
		}
		result = append(result, DeviceResponse{
			ID:             d.ID,
			Name:           name,
			Model:          "Android",
			OSVersion:      "",
			Status:         string(d.Status),
			LastSeen:       lastSeen,
			SIMSlot:        d.SIMSlot,
			Carrier:        d.Carrier,
			SignalStrength: 0,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}

// UpdateDevice updates a device's name/alias for the member's account
func (h *MemberHandler) UpdateDevice(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	deviceID := r.PathValue("id")

	device, err := h.deviceService.GetByID(r.Context(), deviceID)
	if err != nil || device == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "device not found"})
		return
	}
	if device.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "name is required"})
		return
	}

	if err := h.deviceService.UpdateName(r.Context(), deviceID, req.Name); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update device"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// DeleteDevice disconnects (deletes) a device from the member's account
func (h *MemberHandler) DeleteDevice(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	deviceID := r.PathValue("id")

	device, err := h.deviceService.GetByID(r.Context(), deviceID)
	if err != nil || device == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "device not found"})
		return
	}
	if device.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	// Mark device offline before deletion
	_ = h.deviceService.UpdateStatus(r.Context(), deviceID, models.DeviceStatusOffline)

	if err := h.deviceService.Delete(r.Context(), deviceID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to disconnect device"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{
		"status":  "disconnected",
		"message": "Device has been disconnected",
	}})
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

// ─── Member Template CRUD ────────────────────────────────────────────────

func (h *MemberHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		Name      string   `json:"name"`
		Body      string   `json:"body"`
		Variables []string `json:"variables"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	tpl := &models.Template{
		AccountID:      accountID,
		Name:           req.Name,
		Body:           req.Body,
		Variables:      req.Variables,
		ApprovalStatus: models.TemplatePending,
	}

	if err := h.templateService.Create(r.Context(), tpl); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create template"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: tpl})
}

func (h *MemberHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)

	templates, err := h.templateService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list templates"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(templates, pg), int64(len(templates)))})
}

func (h *MemberHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	tpl, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || tpl == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	if tpl.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: tpl})
}

func (h *MemberHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	existing, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	var req struct {
		Name      string   `json:"name"`
		Body      string   `json:"body"`
		Variables []string `json:"variables"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	tpl := &models.Template{
		ID:             id,
		AccountID:      accountID,
		Name:           req.Name,
		Body:           req.Body,
		Variables:      req.Variables,
		ApprovalStatus: models.TemplatePending, // reset to pending on edit
	}

	if err := h.templateService.Update(r.Context(), tpl); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update template"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: tpl})
}

func (h *MemberHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	existing, err := h.templateService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "template not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	if err := h.templateService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete template"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// ─── Member Webhook CRUD ────────────────────────────────────────────────

func (h *MemberHandler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.URL == "" || len(req.Events) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "url and events are required"})
		return
	}

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate secret"})
		return
	}

	webhook := &models.Webhook{
		AccountID: accountID,
		URL:       req.URL,
		Events:    req.Events,
		Secret:    hex.EncodeToString(secret),
		Active:    true,
	}

	if err := h.webhookService.Create(r.Context(), webhook); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create webhook"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":     webhook.ID,
			"url":    webhook.URL,
			"events": webhook.Events,
			"active": webhook.Active,
			"secret": webhook.Secret,
		},
	})
}

func (h *MemberHandler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)

	webhooks, err := h.webhookService.ListByAccount(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list webhooks"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(webhooks, pg), int64(len(webhooks)))})
}

func (h *MemberHandler) GetWebhook(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	webhook, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || webhook == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}
	if webhook.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: webhook})
}

func (h *MemberHandler) UpdateWebhook(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	existing, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	var req struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
		Active bool     `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	existing.URL = req.URL
	existing.Events = req.Events
	existing.Active = req.Active

	if err := h.webhookService.Update(r.Context(), existing); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update webhook"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *MemberHandler) DeleteWebhook(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	existing, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	if err := h.webhookService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete webhook"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// ─── Member Preferences & KYC ───────────────────────────────────────

func (h *MemberHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	prefs, err := h.preferencesService.GetByAccountID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to load preferences"})
		return
	}
	if prefs == nil {
		// Return defaults if no preferences exist yet
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"email_notifications":   true,
				"sms_notifications":     true,
				"webhook_notifications": true,
				"billing_alerts":        true,
				"security_alerts":       true,
				"two_fa_enabled":        false,
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"email_notifications":   prefs.EmailNotifications,
			"sms_notifications":     prefs.SmsNotifications,
			"webhook_notifications": prefs.WebhookNotifications,
			"billing_alerts":        prefs.BillingAlerts,
			"security_alerts":       prefs.SecurityAlerts,
			"two_fa_enabled":        prefs.TwoFAEnabled,
		},
	})
}

func (h *MemberHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		EmailNotifications   bool `json:"email_notifications"`
		SmsNotifications     bool `json:"sms_notifications"`
		WebhookNotifications bool `json:"webhook_notifications"`
		BillingAlerts        bool `json:"billing_alerts"`
		SecurityAlerts       bool `json:"security_alerts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	prefs := &models.UserPreferences{
		AccountID:           &accountID,
		EmailNotifications:  req.EmailNotifications,
		SmsNotifications:    req.SmsNotifications,
		WebhookNotifications: req.WebhookNotifications,
		BillingAlerts:       req.BillingAlerts,
		SecurityAlerts:      req.SecurityAlerts,
	}
	if err := h.preferencesService.Upsert(r.Context(), prefs); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update preferences"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *MemberHandler) SubmitKYC(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		FullName       string `json:"full_name"`
		DocumentType   string `json:"document_type"`
		DocumentNumber string `json:"document_number"`
		DocumentURL    string `json:"document_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}
	if req.FullName == "" || req.DocumentType == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "full_name and document_type are required"})
		return
	}

	record := &models.KycRecord{
		AccountID:      accountID,
		FullName:       req.FullName,
		DocumentType:   req.DocumentType,
		DocumentNumber: req.DocumentNumber,
		DocumentURL:    req.DocumentURL,
	}
	if err := h.kycService.Create(r.Context(), record); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit KYC"})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: map[string]string{"status": "pending"}})
}

func (h *MemberHandler) GetKYC(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	record, err := h.kycService.GetByAccountID(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to load KYC status"})
		return
	}
	if record == nil {
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"status": "not_submitted",
			},
		})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"status":        record.Status,
			"full_name":     record.FullName,
			"document_type": record.DocumentType,
			"created_at":    record.CreatedAt,
		},
	})
}

func (h *MemberHandler) RotateWebhookSecret(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	id := r.PathValue("id")

	existing, err := h.webhookService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "webhook not found"})
		return
	}
	if existing.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "access denied"})
		return
	}

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to generate secret"})
		return
	}
	newSecret := hex.EncodeToString(secret)

	if err := h.webhookService.RotateSecret(r.Context(), id, newSecret); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to rotate secret"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]string{"secret": newSecret},
	})
}
