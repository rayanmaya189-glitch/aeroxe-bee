package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aeroxe-bee/backend/internal/fraud"
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
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(flags, pg), int64(len(flags)))})
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
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(flags, pg), int64(len(flags)))})
}

// BulkReviewSmishingFlags marks multiple smishing flags as reviewed.
func (h *FraudHandler) BulkReviewSmishingFlags(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "ids array is required"})
		return
	}

	count := h.detector.BulkReview(r.Context(), req.IDs)
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int{"reviewed": count}})
}

// SmishingFlagsCount returns the count of unreviewed content-based fraud flags.
func (h *FraudHandler) SmishingFlagsCount(w http.ResponseWriter, r *http.Request) {
	count := h.detector.GetSmishingFlagsPendingCount(r.Context())
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]int{"count": count}})
}

// ListSmishingFlags returns only content-based fraud flags (smishing, phishing, scam, suspicious sender/recipient).
func (h *FraudHandler) ListSmishingFlags(w http.ResponseWriter, r *http.Request) {
	pg := ParsePagination(r, 20, 100)
	flags := h.detector.GetAllFlags(r.Context(), true)
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: pg.ToResponse(SlicePage(flags, pg), int64(len(flags)))})
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
