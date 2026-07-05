package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/fraud"
	"github.com/aeroxe-bee/backend/internal/models"
)

type FraudHandler struct {
	detector *fraud.Detector
}

func NewFraudHandler(detector *fraud.Detector) *FraudHandler {
	return &FraudHandler{detector: detector}
}

func (h *FraudHandler) ListFlags(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)
	flags := h.detector.GetPendingFlags(r.Context())
	if flags == nil {
		flags = []models.FraudFlag{}
	}
	total := int64(len(flags))
	start := pg.Offset
	if start > len(flags) {
		start = len(flags)
	}
	end := start + pg.PageSize
	if end > len(flags) {
		end = len(flags)
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(flags[start:end], total)})
}

func (h *FraudHandler) ReviewFlag(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.detector.MarkReviewed(r.Context(), id); err != nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "flag not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

func (h *FraudHandler) ListAbuseFlags(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)
	flags := h.detector.GetPendingFlags(r.Context())
	if flags == nil {
		flags = []models.FraudFlag{}
	}
	total := int64(len(flags))
	start := pg.Offset
	if start > len(flags) {
		start = len(flags)
	}
	end := start + pg.PageSize
	if end > len(flags) {
		end = len(flags)
	}
	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    pg.ToResponse(flags[start:end], total),
	})
}

func (h *FraudHandler) Check(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AccountID string `json:"account_id"`
		Recipient string `json:"recipient"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request"})
		return
	}

	result := h.detector.Analyze(r.Context(), fraud.DetectionInput{
		AccountID: req.AccountID,
		Recipient: req.Recipient,
	})

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"flagged": result.Flagged,
			"reason":  result.Reason,
			"weight":  result.Weight,
			"checked_at": time.Now(),
		},
	})
}

func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}
