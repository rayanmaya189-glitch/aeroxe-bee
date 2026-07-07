package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aeroxe-bee/backend/internal/ai"
	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/services"
)

type AIHandler struct {
	configService *services.AIConfigService
}

func NewAIHandler(configService *services.AIConfigService) *AIHandler {
	return &AIHandler{configService: configService}
}

// ─── Admin Config CRUD ───────────────────────────────────────────────────

func (h *AIHandler) ListConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := h.configService.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list AI configs"})
		return
	}
	resp := make([]ai.AIConfigResponse, 0, len(configs))
	for _, c := range configs {
		resp = append(resp, c.ToResponse())
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: resp})
}

func (h *AIHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	c, err := h.configService.GetByID(r.Context(), id)
	if err != nil || c == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "AI config not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: c.ToResponse()})
}

func (h *AIHandler) CreateConfig(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isAdmin := middleware.GetIsAdmin(r.Context())

	var req struct {
		Provider    string `json:"provider"`
		Label       string `json:"label"`
		EndpointURL string `json:"endpoint_url"`
		APIKey      string `json:"api_key"`
		Model       string `json:"model"`
		IsActive    bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Provider == "" || req.Label == "" || req.EndpointURL == "" || req.Model == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "provider, label, endpoint_url, and model are required"})
		return
	}
	if req.Provider != "ollama" && req.Provider != "openai" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "provider must be 'ollama' or 'openai'"})
		return
	}

	if !isAdmin {
		// Non-admin creates a change request instead
		req := &services.ConfigChangeRequest{
			RequestedBy:     accountID,
			RequestedByName: "",
			ConfigType:      "ai_config",
			Action:          "create",
			Payload: map[string]interface{}{
				"provider":     req.Provider,
				"label":        req.Label,
				"endpoint_url": req.EndpointURL,
				"api_key":      req.APIKey,
				"model":        req.Model,
				"is_active":    req.IsActive,
			},
		}
		if err := h.configService.CreateChangeRequest(r.Context(), req); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit change request"})
			return
		}
		writeJSON(w, http.StatusCreated, APIResponse{
			Success: true,
			Data:    map[string]string{"status": "pending", "request_id": req.ID},
		})
		return
	}

	// Admin creates directly
	cfg := &ai.AIConfig{
		Provider:    req.Provider,
		Label:       req.Label,
		EndpointURL: req.EndpointURL,
		APIKey:      req.APIKey,
		Model:       req.Model,
		IsActive:    req.IsActive,
		CreatedBy:   &accountID,
	}
	if err := h.configService.Create(r.Context(), cfg); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create AI config: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: cfg.ToResponse()})
}

func (h *AIHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isAdmin := middleware.GetIsAdmin(r.Context())
	id := r.PathValue("id")

	existing, err := h.configService.GetByID(r.Context(), id)
	if err != nil || existing == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "AI config not found"})
		return
	}

	var req struct {
		Provider    string `json:"provider"`
		Label       string `json:"label"`
		EndpointURL string `json:"endpoint_url"`
		APIKey      string `json:"api_key,omitempty"`
		Model       string `json:"model"`
		IsActive    bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if !isAdmin {
		// Non-admin creates a change request
		payload := map[string]interface{}{
			"provider":     req.Provider,
			"label":        req.Label,
			"endpoint_url": req.EndpointURL,
			"model":        req.Model,
			"is_active":    req.IsActive,
		}
		if req.APIKey != "" {
			payload["api_key"] = req.APIKey
		}
		changeReq := &services.ConfigChangeRequest{
			RequestedBy:     accountID,
			RequestedByName: "",
			ConfigType:      "ai_config",
			Action:          "update",
			ConfigID:        &id,
			Payload:         payload,
		}
		if err := h.configService.CreateChangeRequest(r.Context(), changeReq); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit change request"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    map[string]string{"status": "pending", "request_id": changeReq.ID},
		})
		return
	}

	// Admin updates directly
	if req.Provider != "" {
		existing.Provider = req.Provider
	}
	if req.Label != "" {
		existing.Label = req.Label
	}
	if req.EndpointURL != "" {
		existing.EndpointURL = req.EndpointURL
	}
	if req.APIKey != "" {
		existing.APIKey = req.APIKey
	}
	if req.Model != "" {
		existing.Model = req.Model
	}
	existing.IsActive = req.IsActive

	if err := h.configService.Update(r.Context(), existing); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update AI config: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: existing.ToResponse()})
}

func (h *AIHandler) DeleteConfig(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())
	isAdmin := middleware.GetIsAdmin(r.Context())
	id := r.PathValue("id")

	if !isAdmin {
		changeReq := &services.ConfigChangeRequest{
			RequestedBy:     accountID,
			RequestedByName: "",
			ConfigType:      "ai_config",
			Action:          "delete",
			ConfigID:        &id,
			Payload:         map[string]interface{}{"config_id": id},
		}
		if err := h.configService.CreateChangeRequest(r.Context(), changeReq); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit change request"})
			return
		}
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    map[string]string{"status": "pending", "request_id": changeReq.ID},
		})
		return
	}

	if err := h.configService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete AI config"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// ─── Change Request Management ───────────────────────────────────────────

func (h *AIHandler) ListChangeRequests(w http.ResponseWriter, r *http.Request) {
	reqs, err := h.configService.ListChangeRequests(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list change requests"})
		return
	}
	if reqs == nil {
		reqs = []services.ConfigChangeRequest{}
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: reqs})
}

func (h *AIHandler) ApproveChangeRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	var body struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	// Fetch the change request to apply the config change
	reqs, err := h.configService.ListChangeRequests(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to fetch change request"})
		return
	}

	var targetReq *services.ConfigChangeRequest
	for i := range reqs {
		if reqs[i].ID == id {
			targetReq = &reqs[i]
			break
		}
	}

	if targetReq == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "change request not found"})
		return
	}

	// Apply the config change based on action
	switch targetReq.Action {
	case "create":
		cfg := &ai.AIConfig{
			Provider:    toString(targetReq.Payload["provider"]),
			Label:       toString(targetReq.Payload["label"]),
			EndpointURL: toString(targetReq.Payload["endpoint_url"]),
			APIKey:      toString(targetReq.Payload["api_key"]),
			Model:       toString(targetReq.Payload["model"]),
			IsActive:    toBool(targetReq.Payload["is_active"]),
			CreatedBy:   &accountID,
		}
		if err := h.configService.Create(r.Context(), cfg); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create config: " + err.Error()})
			return
		}

	case "update":
		if targetReq.ConfigID == nil || *targetReq.ConfigID == "" {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "config_id is required for update"})
			return
		}
		existing, err := h.configService.GetByID(r.Context(), *targetReq.ConfigID)
		if err != nil || existing == nil {
			writeJSON(w, http.StatusNotFound, APIResponse{Error: "AI config not found"})
			return
		}
		if v, ok := targetReq.Payload["provider"]; ok { existing.Provider = toString(v) }
		if v, ok := targetReq.Payload["label"]; ok { existing.Label = toString(v) }
		if v, ok := targetReq.Payload["endpoint_url"]; ok { existing.EndpointURL = toString(v) }
		if v, ok := targetReq.Payload["api_key"]; ok { existing.APIKey = toString(v) }
		if v, ok := targetReq.Payload["model"]; ok { existing.Model = toString(v) }
		if v, ok := targetReq.Payload["is_active"]; ok { existing.IsActive = toBool(v) }
		if err := h.configService.Update(r.Context(), existing); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update config: " + err.Error()})
			return
		}

	case "delete":
		if targetReq.ConfigID == nil || *targetReq.ConfigID == "" {
			writeJSON(w, http.StatusBadRequest, APIResponse{Error: "config_id is required for delete"})
			return
		}
		if err := h.configService.Delete(r.Context(), *targetReq.ConfigID); err != nil {
			writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete config: " + err.Error()})
			return
		}
	}

	// Mark the request as approved
	if err := h.configService.ApproveChangeRequest(r.Context(), id, accountID, "", body.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"status": "approved"}})
}

// ─── Helper functions ──────────────────────────────────────────────────────

func toString(v interface{}) string {
	s, _ := v.(string)
	return s
}

func toBool(v interface{}) bool {
	s, ok := v.(bool)
	if ok {
		return s
	}
	ss, ok := v.(string)
	if ok {
		return ss == "true"
	}
	return false
}

func (h *AIHandler) RejectChangeRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.configService.RejectChangeRequest(r.Context(), id, accountID, "", req.Notes); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject: " + err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: map[string]string{"status": "rejected"}})
}

// ─── Template Generation ─────────────────────────────────────────────────

func (h *AIHandler) GenerateTemplate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Prompt    string `json:"prompt"`
		Context   string `json:"context,omitempty"`
		MaxLength int    `json:"max_length,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}
	if req.Prompt == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "prompt is required"})
		return
	}

	// Get active AI config
	cfg, err := h.configService.GetActive(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to get active AI config"})
		return
	}
	if cfg == nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "no active AI configuration found. Ask an admin to configure AI in Settings > AI Config."})
		return
	}

	// Create provider client
	client, err := ai.NewProviderClient(cfg.Provider)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: err.Error()})
		return
	}

	input := ai.GenerateTemplateInput{
		Prompt:    req.Prompt,
		Context:   req.Context,
		MaxLength: req.MaxLength,
	}

	result, err := client.GenerateTemplate(r.Context(), cfg, input)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: fmt.Sprintf("AI generation failed: %s", err.Error())})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: result})
}
