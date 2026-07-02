package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/textbee/backend/internal/database"
	"github.com/textbee/backend/internal/telemetry"
)

type HealthHandler struct {
	pg      *database.PostgresDB
	rdb     *database.RedisDB
	metrics *telemetry.Metrics
}

func NewHealthHandler(pg *database.PostgresDB, rdb *database.RedisDB, metrics *telemetry.Metrics) *HealthHandler {
	return &HealthHandler{pg: pg, rdb: rdb, metrics: metrics}
}

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	status := "healthy"
	pgOK := true
	redisOK := true

	if err := h.pg.HealthCheck(ctx); err != nil {
		pgOK = false
		status = "degraded"
	}

	if err := h.rdb.HealthCheck(ctx); err != nil {
		redisOK = false
		status = "degraded"
	}

	httpStatus := http.StatusOK
	if status == "degraded" {
		httpStatus = http.StatusServiceUnavailable
	}

	writeJSON(w, httpStatus, APIResponse{
		Success: status == "healthy",
		Data: map[string]interface{}{
			"status":    status,
			"timestamp": time.Now().UTC(),
			"checks": map[string]string{
				"postgres": checkStatus(pgOK),
				"redis":    checkStatus(redisOK),
			},
		},
	})
}

func checkStatus(ok bool) string {
	if ok {
		return "up"
	}
	return "down"
}
