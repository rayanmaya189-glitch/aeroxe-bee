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
	if req.IdempotencyKey == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "idempotency_key is required"})
		return
	}

	if req.Sender == "" {
		req.Sender = "AeroXe Bee"
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

	msgs, err := h.messageService.ListByAccount(r.Context(), accountID, 0, 50)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list messages"})
		return
	}

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

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
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

func uuidV4() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
