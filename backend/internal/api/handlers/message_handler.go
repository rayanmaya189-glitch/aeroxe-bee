package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/encryption"
	"github.com/aeroxe-bee/backend/internal/fraud"
	"github.com/aeroxe-bee/backend/internal/idempotency"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/telemetry"
	"github.com/aeroxe-bee/backend/internal/worker"
)

type MessageHandler struct {
	messageService  *services.MessageService
	deviceService   *services.DeviceService
	accountService  *services.AccountService
	idempotency     *idempotency.Store
	queue           *worker.Queue
	encryption      *encryption.Manager
	cfg             config.AppConfig
	metrics         *telemetry.Metrics
}

func NewMessageHandler(
	messageService *services.MessageService,
	deviceService *services.DeviceService,
	accountService *services.AccountService,
	idempotency *idempotency.Store,
	queue *worker.Queue,
	encryption *encryption.Manager,
	cfg config.AppConfig,
	metrics *telemetry.Metrics,
) *MessageHandler {
	return &MessageHandler{
		messageService: messageService,
		deviceService:  deviceService,
		accountService: accountService,
		idempotency:    idempotency,
		queue:          queue,
		encryption:     encryption,
		cfg:            cfg,
		metrics:        metrics,
	}
}

type SendSMSRequest struct {
	Recipient       string                  `json:"recipient"`
	Sender          string                  `json:"sender"`
	Message         string                  `json:"message"`
	MessageType     models.MessageType      `json:"message_type"`
	IdempotencyKey  string                  `json:"idempotency_key"`
	TemplateID      string                  `json:"template_id,omitempty"`
	DeviceID        string                  `json:"device_id,omitempty"`
	RoutingStrategy models.RoutingStrategy  `json:"routing_strategy,omitempty"`
}

func (h *MessageHandler) Send(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	accountID := middleware.GetAccountID(r.Context())
	apiKeyID := middleware.GetAPIKeyID(r.Context())

	var req SendSMSRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Recipient == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "recipient is required"})
		return
	}
	if req.Message == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message is required"})
		return
	}
	if len([]rune(req.Message)) > 160 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message exceeds 160 character SMS limit"})
		return
	}
	if req.IdempotencyKey == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "idempotency_key is required"})
		return
	}

	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
	} else {
		sanitized, valid := fraud.SanitizeSender(req.Sender)
		if !valid {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid sender name"})
			return
		}
		req.Sender = sanitized
	}
	if req.MessageType == "" {
		req.MessageType = models.MessageTypeTransactional
	}
	if req.RoutingStrategy == "" {
		req.RoutingStrategy = models.RoutingStrategyHighestReliability
		if req.MessageType == models.MessageTypeMarketing {
			req.RoutingStrategy = models.RoutingStrategyLowestCost
		}
	}

	// Validate device ownership and online status
	if req.DeviceID != "" {
		device, err := h.deviceService.GetByID(r.Context(), req.DeviceID)
		if err != nil || device == nil {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device not found"})
			return
		}
		if device.AccountID != accountID {
			writeJSON(w, http.StatusForbidden, APIResponse{Error: "device does not belong to this account"})
			return
		}
		if device.Status != models.DeviceStatusOnline {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device is offline. Only online devices can send SMS"})
			return
		}
	}

	existing, isDuplicate, err := h.idempotency.CheckAndSet(r.Context(), req.IdempotencyKey, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "idempotency check failed"})
		return
	}
	if isDuplicate && existing != nil {
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"message_id": existing.MessageID,
				"status":     "duplicate",
			},
		})
		return
	}

	quotaOk, err := h.accountService.CheckQuota(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "quota check failed"})
		return
	}
	if !quotaOk {
		writeJSON(w, http.StatusTooManyRequests, APIResponse{Error: "quota exceeded"})
		return
	}

	priorityLane := worker.LaneTransactional
	maxAge := 15 * time.Minute

	switch req.MessageType {
	case models.MessageTypeOTP:
		priorityLane = worker.LaneOTP
		maxAge = 90 * time.Second
	case models.MessageTypeMarketing:
		priorityLane = worker.LaneMarketing
	}

	msgID := uuidV4()
	now := time.Now()

	var encryptedMsg string
	if h.encryption != nil {
		em, err := h.encryption.Encrypt([]byte(req.Message))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "encryption failed"})
			return
		}
		encryptedMsg = em
	}

	msg := models.Message{
		ID:                  msgID,
		DeviceID:            stringPtr(req.DeviceID),
		APIKeyID:            apiKeyID,
		Direction:           "outbound",
		Recipient:           req.Recipient,
		Sender:              req.Sender,
		EncryptedMessage:    []byte(encryptedMsg),
		MessageType:         req.MessageType,
		PriorityLane:        models.PriorityLane(priorityLane),
		Status:              "pending",
		DeliveryStatus:      models.DeliveryStatusSent,
		ConfidenceScore:     0.0,
		CreatedAt:           now,
		PurgeAfter:          now.Add(h.cfg.MessageRetention),
		IdempotencyKey:      req.IdempotencyKey,
		RoutingStrategyUsed: req.RoutingStrategy,
	}

	if req.TemplateID != "" {
		msg.TemplateID = &req.TemplateID
	}

	if err := h.messageService.Create(r.Context(), &msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create message"})
		return
	}

	_ = h.accountService.IncrementUsage(r.Context(), accountID)

	queueMsg := worker.QueueMessage{
		ID:              msgID,
		AccountID:       accountID,
		APIKeyID:        apiKeyID,
		Recipient:       req.Recipient,
		Sender:          req.Sender,
		Message:         req.Message,
		MessageType:     req.MessageType,
		Priority:        worker.PriorityLane(priorityLane),
		IdempotencyKey:  req.IdempotencyKey,
		CreatedAt:       now,
		RoutingStrategy: req.RoutingStrategy,
		MaxAge:          maxAge,
	}

	_, err = h.queue.Enqueue(r.Context(), priorityLane, queueMsg)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to enqueue message"})
		return
	}

	h.metrics.ObserveMessageSent()

	writeJSON(w, http.StatusAccepted, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message_id":      msgID,
			"status":          "queued",
			"queue":           priorityLane,
			"idempotency_key": req.IdempotencyKey,
			"created_at":      now,
			"latency_ms":      time.Since(startTime).Milliseconds(),
		},
	})
}

func (h *MessageHandler) GetMessage(w http.ResponseWriter, r *http.Request) {
	msgID := r.PathValue("id")
	if msgID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message id required"})
		return
	}

	msg, err := h.messageService.GetByID(r.Context(), msgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if msg == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "message not found"})
		return
	}

	var decrypted string
	if h.encryption != nil && len(msg.EncryptedMessage) > 0 {
		dec, err := h.encryption.Decrypt(string(msg.EncryptedMessage))
		if err == nil {
			decrypted = string(dec)
		}
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":                msg.ID,
			"recipient":         msg.Recipient,
			"sender":            msg.Sender,
			"message":           decrypted,
			"message_type":      msg.MessageType,
			"status":            msg.Status,
			"delivery_status":   msg.DeliveryStatus,
			"confidence_score":  msg.ConfidenceScore,
			"error_reason":      msg.ErrorReason,
			"routing_strategy":  msg.RoutingStrategyUsed,
			"created_at":        msg.CreatedAt,
			"delivered_at":      msg.DeliveredAt,
		},
	})
}

func (h *MessageHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	pg := ParsePagination(r, 20, 100)
	statusFilter := r.URL.Query().Get("status")
	msgTypeFilter := r.URL.Query().Get("message_type")

	msgs, err := h.messageService.ListByAccountFiltered(r.Context(), accountID, pg.Offset, pg.PageSize, statusFilter, msgTypeFilter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list messages"})
		return
	}

	total, _ := h.messageService.CountByAccountFiltered(r.Context(), accountID, statusFilter, msgTypeFilter)

	result := make([]map[string]interface{}, 0, len(msgs))
	for _, m := range msgs {
		result = append(result, map[string]interface{}{
			"id":               m.ID,
			"recipient":        m.Recipient,
			"sender":           m.Sender,
			"message_type":     m.MessageType,
			"status":           m.Status,
			"delivery_status":  m.DeliveryStatus,
			"confidence_score": m.ConfidenceScore,
			"created_at":       m.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(result, int64(total))})
}

func (h *MessageHandler) GetConfidence(w http.ResponseWriter, r *http.Request) {
	msgID := r.PathValue("id")
	msg, err := h.messageService.GetByID(r.Context(), msgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "database error"})
		return
	}
	if msg == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "message not found"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"delivery_status":  msg.DeliveryStatus,
			"confidence_score": msg.ConfidenceScore,
			"message_id":       msg.ID,
			"routing_strategy": msg.RoutingStrategyUsed,
		},
	})
}

// BulkSendRequest allows sending the same message to multiple recipients.
type BulkSendRequest struct {
	Recipients      []string                `json:"recipients"`
	Sender          string                  `json:"sender"`
	Message         string                  `json:"message"`
	MessageType     models.MessageType      `json:"message_type"`
	TemplateID      string                  `json:"template_id,omitempty"`
	DeviceID        string                  `json:"device_id,omitempty"`
	RoutingStrategy models.RoutingStrategy  `json:"routing_strategy,omitempty"`
}

// ScheduleSendRequest allows scheduling a message for future delivery.
type ScheduleSendRequest struct {
	Recipient       string                  `json:"recipient"`
	Sender          string                  `json:"sender"`
	Message         string                  `json:"message"`
	MessageType     models.MessageType      `json:"message_type"`
	ScheduledAt     time.Time               `json:"scheduled_at"`
	TemplateID      string                  `json:"template_id,omitempty"`
	DeviceID        string                  `json:"device_id,omitempty"`
	RoutingStrategy models.RoutingStrategy  `json:"routing_strategy,omitempty"`
}

func (h *MessageHandler) BulkSend(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	apiKeyID := middleware.GetAPIKeyID(r.Context())

	var req BulkSendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if len(req.Recipients) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "recipients array is required"})
		return
	}
	if len(req.Recipients) > 1000 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "max 1000 recipients per bulk send"})
		return
	}
	if req.Message == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message is required"})
		return
	}
	if len([]rune(req.Message)) > 160 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message exceeds 160 character SMS limit"})
		return
	}

	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
	} else {
		sanitized, valid := fraud.SanitizeSender(req.Sender)
		if !valid {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid sender name"})
			return
		}
		req.Sender = sanitized
	}
	if req.MessageType == "" {
		req.MessageType = models.MessageTypeTransactional
	}
	if req.RoutingStrategy == "" {
		req.RoutingStrategy = models.RoutingStrategyHighestReliability
		if req.MessageType == models.MessageTypeMarketing {
			req.RoutingStrategy = models.RoutingStrategyLowestCost
		}
	}

	// Validate device ownership and online status
	if req.DeviceID != "" {
		device, err := h.deviceService.GetByID(r.Context(), req.DeviceID)
		if err != nil || device == nil {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device not found"})
			return
		}
		if device.AccountID != accountID {
			writeJSON(w, http.StatusForbidden, APIResponse{Error: "device does not belong to this account"})
			return
		}
		if device.Status != models.DeviceStatusOnline {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device is offline. Only online devices can send SMS"})
			return
		}
	}

	// Validate quota first (rough check based on count)
	quotaOk, err := h.accountService.CheckQuota(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "quota check failed"})
		return
	}
	if !quotaOk {
		writeJSON(w, http.StatusTooManyRequests, APIResponse{Error: "quota exceeded"})
		return
	}

	priorityLane := worker.LaneTransactional
	maxAge := 15 * time.Minute
	switch req.MessageType {
	case models.MessageTypeOTP:
		priorityLane = worker.LaneOTP
		maxAge = 90 * time.Second
	case models.MessageTypeMarketing:
		priorityLane = worker.LaneMarketing
	}

	now := time.Now()
	var encryptedMsg string
	if h.encryption != nil {
		em, err := h.encryption.Encrypt([]byte(req.Message))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "encryption failed"})
			return
		}
		encryptedMsg = em
	}

	type bulkResult struct {
		Recipient string `json:"recipient"`
		MessageID string `json:"message_id"`
		Status    string `json:"status"`
		Error     string `json:"error,omitempty"`
	}

	results := make([]bulkResult, 0, len(req.Recipients))
	for _, recipient := range req.Recipients {
		msgID := uuidV4()

		msg := models.Message{
			ID:                  msgID,
			DeviceID:            stringPtr(req.DeviceID),
			APIKeyID:            apiKeyID,
			Direction:           "outbound",
			Recipient:           recipient,
			Sender:              req.Sender,
			EncryptedMessage:    []byte(encryptedMsg),
			MessageType:         req.MessageType,
			PriorityLane:        models.PriorityLane(priorityLane),
			Status:              "pending",
			DeliveryStatus:      models.DeliveryStatusSent,
			ConfidenceScore:     0.0,
			CreatedAt:           now,
			PurgeAfter:          now.Add(h.cfg.MessageRetention),
			IdempotencyKey:      fmt.Sprintf("bulk-%s-%s", msgID, recipient),
			RoutingStrategyUsed: req.RoutingStrategy,
		}
		if req.TemplateID != "" {
			msg.TemplateID = &req.TemplateID
		}

		if err := h.messageService.Create(r.Context(), &msg); err != nil {
			results = append(results, bulkResult{
				Recipient: recipient,
				Status:    "failed",
				Error:     "create failed",
			})
			continue
		}

		_ = h.accountService.IncrementUsage(r.Context(), accountID)

		queueMsg := worker.QueueMessage{
			ID:              msgID,
			AccountID:       accountID,
			APIKeyID:        apiKeyID,
			Recipient:       recipient,
			Sender:          req.Sender,
			Message:         req.Message,
			MessageType:     req.MessageType,
			Priority:        priorityLane,
			IdempotencyKey:  msg.IdempotencyKey,
			CreatedAt:       now,
			RoutingStrategy: req.RoutingStrategy,
			MaxAge:          maxAge,
		}

		_, err := h.queue.Enqueue(r.Context(), priorityLane, queueMsg)
		if err != nil {
			results = append(results, bulkResult{
				Recipient: recipient,
				MessageID: msgID,
				Status:    "queued",
				Error:     "enqueue failed, stored for retry",
			})
			continue
		}

		results = append(results, bulkResult{
			Recipient: recipient,
			MessageID: msgID,
			Status:    "queued",
		})
		h.metrics.ObserveMessageSent()
	}

	writeJSON(w, http.StatusAccepted, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"total":     len(req.Recipients),
			"sent":      len(results),
			"results":   results,
			"created_at": now,
		},
	})
}

func (h *MessageHandler) ScheduleSend(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	apiKeyID := middleware.GetAPIKeyID(r.Context())

	var req ScheduleSendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Recipient == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "recipient is required"})
		return
	}
	if req.Message == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message is required"})
		return
	}
	if len([]rune(req.Message)) > 160 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message exceeds 160 character SMS limit"})
		return
	}
	if req.ScheduledAt.IsZero() || req.ScheduledAt.Before(time.Now()) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "scheduled_at must be in the future"})
		return
	}
	if req.ScheduledAt.After(time.Now().Add(365 * 24 * time.Hour)) {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "scheduled_at cannot be more than 1 year in the future"})
		return
	}

	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
	} else {
		sanitized, valid := fraud.SanitizeSender(req.Sender)
		if !valid {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid sender name"})
			return
		}
		req.Sender = sanitized
	}
	if req.MessageType == "" {
		req.MessageType = models.MessageTypeTransactional
	}
	if req.RoutingStrategy == "" {
		req.RoutingStrategy = models.RoutingStrategyHighestReliability
		if req.MessageType == models.MessageTypeMarketing {
			req.RoutingStrategy = models.RoutingStrategyLowestCost
		}
	}

	// Validate device ownership and online status
	if req.DeviceID != "" {
		device, err := h.deviceService.GetByID(r.Context(), req.DeviceID)
		if err != nil || device == nil {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device not found"})
			return
		}
		if device.AccountID != accountID {
			writeJSON(w, http.StatusForbidden, APIResponse{Error: "device does not belong to this account"})
			return
		}
		if device.Status != models.DeviceStatusOnline {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device is offline. Only online devices can send SMS"})
			return
		}
	}

	// Check quota before scheduling
	quotaOk, err := h.accountService.CheckQuota(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "quota check failed"})
		return
	}
	if !quotaOk {
		writeJSON(w, http.StatusTooManyRequests, APIResponse{Error: "quota exceeded"})
		return
	}

	now := time.Now()
	msgID := uuidV4()

	var encryptedMsg string
	if h.encryption != nil {
		em, err := h.encryption.Encrypt([]byte(req.Message))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "encryption failed"})
			return
		}
		encryptedMsg = em
	}

	msg := models.Message{
		ID:                  msgID,
		DeviceID:            stringPtr(req.DeviceID),
		APIKeyID:            apiKeyID,
		Direction:           "outbound",
		Recipient:           req.Recipient,
		Sender:              req.Sender,
		EncryptedMessage:    []byte(encryptedMsg),
		MessageType:         req.MessageType,
		PriorityLane:        models.PriorityLane(worker.LaneTransactional),
		Status:              "scheduled",
		DeliveryStatus:      models.DeliveryStatusSent,
		ConfidenceScore:     0.0,
		ScheduledAt:         &req.ScheduledAt,
		CreatedAt:           now,
		PurgeAfter:          req.ScheduledAt.Add(h.cfg.MessageRetention),
		IdempotencyKey:      fmt.Sprintf("sched-%s-%s", msgID, req.Recipient),
		RoutingStrategyUsed: req.RoutingStrategy,
	}
	if req.TemplateID != "" {
		msg.TemplateID = &req.TemplateID
	}

	if err := h.messageService.Create(r.Context(), &msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create scheduled message"})
		return
	}

	writeJSON(w, http.StatusAccepted, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message_id":   msgID,
			"status":       "scheduled",
			"scheduled_at": req.ScheduledAt,
			"created_at":   now,
		},
	})
}

// MemberSend allows members to send SMS via the member portal using JWT auth
// (auto-generates idempotency key and sets accountID from JWT context).
func (h *MessageHandler) MemberSend(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	accountID := middleware.GetAccountID(r.Context())

	var req SendSMSRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.Recipient == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "recipient is required"})
		return
	}
	if req.Message == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message is required"})
		return
	}
	if len([]rune(req.Message)) > 160 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "message exceeds 160 character SMS limit"})
		return
	}

	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
	} else {
		sanitized, valid := fraud.SanitizeSender(req.Sender)
		if !valid {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid sender name"})
			return
		}
		req.Sender = sanitized
	}
	if req.MessageType == "" {
		req.MessageType = models.MessageTypeTransactional
	}
	if req.RoutingStrategy == "" {
		req.RoutingStrategy = models.RoutingStrategyHighestReliability
		if req.MessageType == models.MessageTypeMarketing {
			req.RoutingStrategy = models.RoutingStrategyLowestCost
		}
	}

	// Validate device ownership and online status
	if req.DeviceID == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device_id is required"})
		return
	}
	device, err := h.deviceService.GetByID(r.Context(), req.DeviceID)
	if err != nil || device == nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device not found"})
		return
	}
	if device.AccountID != accountID {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "device does not belong to your account"})
		return
	}
	if device.Status != models.DeviceStatusOnline {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "device is offline. Only online devices can send SMS"})
		return
	}
	// Set sender from device name
	req.Sender = device.Name
	if req.Sender == "" {
		req.Sender = device.PhoneNumber
	}
	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
	} else {
		sanitized, valid := fraud.SanitizeSender(req.Sender)
		if !valid {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid sender name"})
			return
		}
		req.Sender = sanitized
	}

	// Auto-generate idempotency key and check for duplicates
	req.IdempotencyKey = "member-" + uuidV4()
	existing, isDuplicate, err := h.idempotency.CheckAndSet(r.Context(), req.IdempotencyKey, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "idempotency check failed"})
		return
	}
	if isDuplicate && existing != nil {
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"message_id": existing.MessageID,
				"status":     "duplicate",
			},
		})
		return
	}

	quotaOk, err := h.accountService.CheckQuota(r.Context(), accountID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "quota check failed"})
		return
	}
	if !quotaOk {
		writeJSON(w, http.StatusTooManyRequests, APIResponse{Error: "quota exceeded"})
		return
	}

	priorityLane := worker.LaneTransactional
	maxAge := 15 * time.Minute

	switch req.MessageType {
	case models.MessageTypeOTP:
		priorityLane = worker.LaneOTP
		maxAge = 90 * time.Second
	case models.MessageTypeMarketing:
		priorityLane = worker.LaneMarketing
	}

	msgID := uuidV4()
	now := time.Now()

	var encryptedMsg string
	if h.encryption != nil {
		em, err := h.encryption.Encrypt([]byte(req.Message))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "encryption failed"})
			return
		}
		encryptedMsg = em
	}

	msg := models.Message{
		ID:                  msgID,
		DeviceID:            &req.DeviceID,
		APIKeyID:            "", // member portal sends without API key
		Direction:           "outbound",
		Recipient:           req.Recipient,
		Sender:              req.Sender,
		EncryptedMessage:    []byte(encryptedMsg),
		MessageType:         req.MessageType,
		PriorityLane:        models.PriorityLane(priorityLane),
		Status:              "pending",
		DeliveryStatus:      models.DeliveryStatusSent,
		ConfidenceScore:     0.0,
		CreatedAt:           now,
		PurgeAfter:          now.Add(h.cfg.MessageRetention),
		IdempotencyKey:      req.IdempotencyKey,
		RoutingStrategyUsed: req.RoutingStrategy,
	}

	if req.TemplateID != "" {
		msg.TemplateID = &req.TemplateID
	}

	if err := h.messageService.Create(r.Context(), &msg); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create message"})
		return
	}

	_ = h.accountService.IncrementUsage(r.Context(), accountID)
	_ = h.deviceService.RecordSent(r.Context(), req.DeviceID)

	queueMsg := worker.QueueMessage{
		ID:              msgID,
		AccountID:       accountID,
		APIKeyID:        "",
		Recipient:       req.Recipient,
		Sender:          req.Sender,
		Message:         req.Message,
		MessageType:     req.MessageType,
		Priority:        worker.PriorityLane(priorityLane),
		IdempotencyKey:  req.IdempotencyKey,
		CreatedAt:       now,
		RoutingStrategy: req.RoutingStrategy,
		MaxAge:          maxAge,
	}

	_, err = h.queue.Enqueue(r.Context(), priorityLane, queueMsg)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to enqueue message"})
		return
	}

	h.metrics.ObserveMessageSent()

	writeJSON(w, http.StatusAccepted, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message_id":      msgID,
			"status":          "queued",
			"queue":           priorityLane,
			"created_at":      now,
			"latency_ms":      time.Since(startTime).Milliseconds(),
		},
	})
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func uuidV4() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
