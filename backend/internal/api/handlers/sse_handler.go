package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/textbee/backend/internal/services"
)

// SSEHandler provides Server-Sent Events for real-time updates.
type SSEHandler struct {
	svc         *services.ServiceRegistry
	connections map[string]chan SSEEvent
	mu          sync.RWMutex
}

type SSEEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

type DeviceStatusUpdate struct {
	DeviceID string `json:"device_id"`
	Status   string `json:"status"`
	LastSeen string `json:"last_seen,omitempty"`
}

type MessageStatusUpdate struct {
	MessageID      string `json:"message_id"`
	DeviceID       string `json:"device_id"`
	Status         string `json:"status"`
	DeliveryStatus string `json:"delivery_status"`
	ConfidenceScore float64 `json:"confidence_score"`
}

func NewSSEHandler(svc *services.ServiceRegistry) *SSEHandler {
	return &SSEHandler{
		svc:         svc,
		connections: make(map[string]chan SSEEvent),
	}
}

// Subscribe creates a new SSE connection for an account.
func (h *SSEHandler) Subscribe(w http.ResponseWriter, r *http.Request, accountID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create a channel for this connection
	ch := make(chan SSEEvent, 64)

	// Register the connection
	connID := fmt.Sprintf("%s-%d", accountID, time.Now().UnixNano())
	h.mu.Lock()
	h.connections[connID] = ch
	h.mu.Unlock()

	// Clean up on disconnect
	defer func() {
		h.mu.Lock()
		delete(h.connections, connID)
		h.mu.Unlock()
		close(ch)
	}()

	// Send initial keepalive
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	ctx := r.Context()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Send keepalive
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		case event, ok := <-ch:
			if !ok {
				return
			}
			data, err := json.Marshal(event.Data)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Event, string(data))
			flusher.Flush()
		}
	}
}

// BroadcastDeviceStatus sends a device status update to all connected clients.
func (h *SSEHandler) BroadcastDeviceStatus(deviceID, status string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	event := SSEEvent{
		Event: "device.status",
		Data: DeviceStatusUpdate{
			DeviceID: deviceID,
			Status:   status,
			LastSeen: time.Now().UTC().Format(time.RFC3339),
		},
	}

	for _, ch := range h.connections {
		select {
		case ch <- event:
		default:
			// Skip slow consumers
		}
	}
}

// BroadcastMessageStatus sends a message status update to all connected clients.
func (h *SSEHandler) BroadcastMessageStatus(msgID, deviceID, status, deliveryStatus string, confidence float64) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	event := SSEEvent{
		Event: "message.status",
		Data: MessageStatusUpdate{
			MessageID:       msgID,
			DeviceID:        deviceID,
			Status:          status,
			DeliveryStatus:  deliveryStatus,
			ConfidenceScore: confidence,
		},
	}

	for _, ch := range h.connections {
		select {
		case ch <- event:
		default:
			// Skip slow consumers
		}
	}
}

