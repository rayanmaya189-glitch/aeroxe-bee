package handlers

import (
	"net/http"

	"github.com/textbee/backend/internal/mqtt"
)

type MQTTHealthHandler struct {
	client *mqtt.Client
}

func NewMQTTHealthHandler(client *mqtt.Client) *MQTTHealthHandler {
	return &MQTTHealthHandler{client: client}
}

func (h *MQTTHealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	connected := h.client != nil && h.client.IsConnected()

	status := "up"
	httpStatus := http.StatusOK
	if !connected {
		status = "down"
		httpStatus = http.StatusServiceUnavailable
	}

	writeJSON(w, httpStatus, APIResponse{
		Success: connected,
		Data: map[string]interface{}{
			"service": "mqtt",
			"status":  status,
		},
	})
}
