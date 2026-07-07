package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AIConfig represents a configured AI provider in the database.
type AIConfig struct {
	ID          string    `db:"id" json:"id"`
	Provider    string    `db:"provider" json:"provider"`       // "ollama", "openai", "anthropic"
	Label       string    `db:"label" json:"label"`             // user-friendly name
	EndpointURL string    `db:"endpoint_url" json:"endpoint_url"` // API endpoint URL
	APIKey      string    `db:"api_key" json:"-"`               // never expose in JSON
	Model       string    `db:"model" json:"model"`             // model name
	IsActive    bool      `db:"is_active" json:"is_active"`
	CreatedBy   *string   `db:"created_by" json:"created_by,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// AIConfigResponse is what we expose in JSON (no API key).
type AIConfigResponse struct {
	ID          string    `json:"id"`
	Provider    string    `json:"provider"`
	Label       string    `json:"label"`
	EndpointURL string    `json:"endpoint_url"`
	Model       string    `json:"model"`
	HasAPIKey   bool      `json:"has_api_key"`
	IsActive    bool      `json:"is_active"`
	CreatedBy   *string   `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (c *AIConfig) ToResponse() AIConfigResponse {
	return AIConfigResponse{
		ID:          c.ID,
		Provider:    c.Provider,
		Label:       c.Label,
		EndpointURL: c.EndpointURL,
		Model:       c.Model,
		HasAPIKey:   c.APIKey != "",
		IsActive:    c.IsActive,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}

// GenerateTemplate calls the configured AI provider to generate an SMS template.
type GenerateTemplateInput struct {
	Prompt      string `json:"prompt"`
	Context     string `json:"context,omitempty"` // e.g. existing template body for refinement
	MaxLength   int    `json:"max_length,omitempty"`
}

type GenerateTemplateOutput struct {
	Body      string   `json:"body"`
	Name      string   `json:"name"`
	Variables []string `json:"variables"`
}

// ProviderClient is the interface for AI provider API calls.
type ProviderClient interface {
	GenerateTemplate(ctx context.Context, cfg *AIConfig, input GenerateTemplateInput) (*GenerateTemplateOutput, error)
}

// NewProviderClient creates the appropriate client for a given provider.
func NewProviderClient(provider string) (ProviderClient, error) {
	switch strings.ToLower(provider) {
	case "ollama":
		return &OllamaClient{httpClient: &http.Client{Timeout: 120 * time.Second}}, nil
	case "openai":
		return &OpenAIClient{httpClient: &http.Client{Timeout: 60 * time.Second}}, nil
	default:
		return nil, fmt.Errorf("unsupported AI provider: %s", provider)
	}
}

// ─── Ollama ─────────────────────────────────────────────────────────────

type OllamaClient struct {
	httpClient *http.Client
}

type ollamaRequest struct {
	Model   string `json:"model"`
	Prompt  string `json:"prompt"`
	Stream  bool   `json:"stream"`
	Options map[string]interface{} `json:"options,omitempty"`
}

type ollamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

func (c *OllamaClient) GenerateTemplate(ctx context.Context, cfg *AIConfig, input GenerateTemplateInput) (*GenerateTemplateOutput, error) {
	maxLen := input.MaxLength
	if maxLen <= 0 {
		maxLen = 200
	}

	systemPrompt := `You are an SMS template generator. Generate a short SMS template body (max 160 characters).

Rules:
- Return ONLY a JSON object with fields: name, body, variables
- name: a short descriptive name for the template
- body: the SMS text with {{variable}} placeholders. Max 160 characters.
- variables: array of variable names used in the body (without braces)
- The template should be concise and effective for SMS communication`

	userPrompt := fmt.Sprintf("Generate an SMS template for: %s", input.Prompt)
	if input.Context != "" {
		userPrompt = fmt.Sprintf("Refine this SMS template: %q\n\nContext: %s", input.Context, input.Prompt)
	}

	fullPrompt := fmt.Sprintf("%s\n\n%s\n\nReturn only valid JSON, no markdown, no explanation.", systemPrompt, userPrompt)

	endpoint := strings.TrimRight(cfg.EndpointURL, "/") + "/api/generate"
	body := ollamaRequest{
		Model:  cfg.Model,
		Prompt: fullPrompt,
		Stream: false,
		Options: map[string]interface{}{
			"num_predict": maxLen,
			"temperature": 0.7,
		},
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("ollama request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ollama call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ollama read: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ollama error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var or ollamaResponse
	if err := json.Unmarshal(respBody, &or); err != nil {
		return nil, fmt.Errorf("ollama parse: %w", err)
	}

	return parseAIResponse(or.Response)
}

// ─── OpenAI-compatible ───────────────────────────────────────────────────

type OpenAIClient struct {
	httpClient *http.Client
}

type openAIRequest struct {
	Model       string            `json:"model"`
	Messages    []openAIMessage   `json:"messages"`
	Temperature float64           `json:"temperature"`
	MaxTokens   int               `json:"max_tokens"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (c *OpenAIClient) GenerateTemplate(ctx context.Context, cfg *AIConfig, input GenerateTemplateInput) (*GenerateTemplateOutput, error) {
	maxLen := input.MaxLength
	if maxLen <= 0 {
		maxLen = 200
	}

	system := `You are an SMS template generator. Generate a short SMS template body (max 160 characters).

Rules:
- Return ONLY a JSON object with fields: name, body, variables
- name: a short descriptive name for the template
- body: the SMS text with {{variable}} placeholders. Max 160 characters.
- variables: array of variable names used in the body (without braces)
- The template should be concise and effective for SMS communication`

	userMsg := fmt.Sprintf("Generate an SMS template for: %s", input.Prompt)
	if input.Context != "" {
		userMsg = fmt.Sprintf("Refine this SMS template: %q\n\nContext: %s", input.Context, input.Prompt)
	}

	body := openAIRequest{
		Model: cfg.Model,
		Messages: []openAIMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: userMsg},
		},
		Temperature: 0.7,
		MaxTokens:   maxLen,
	}

	payload, _ := json.Marshal(body)

	endpoint := strings.TrimRight(cfg.EndpointURL, "/")
	if !strings.Contains(endpoint, "/chat/completions") {
		endpoint += "/v1/chat/completions"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("openai request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openai read: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var or openAIResponse
	if err := json.Unmarshal(respBody, &or); err != nil {
		return nil, fmt.Errorf("openai parse: %w", err)
	}

	if len(or.Choices) == 0 {
		return nil, fmt.Errorf("openai: no choices returned")
	}

	return parseAIResponse(or.Choices[0].Message.Content)
}

// ─── Shared parsing ──────────────────────────────────────────────────────

func parseAIResponse(raw string) (*GenerateTemplateOutput, error) {
	// Try to find JSON in the response (it may be wrapped in markdown code blocks)
	cleaned := raw
	if idx := strings.Index(cleaned, "{"); idx >= 0 {
		cleaned = cleaned[idx:]
	}
	if idx := strings.LastIndex(cleaned, "}"); idx >= 0 {
		cleaned = cleaned[:idx+1]
	}

	var out GenerateTemplateOutput
	if err := json.Unmarshal([]byte(cleaned), &out); err != nil {
		// Fallback: use the raw response as the body
		return &GenerateTemplateOutput{
			Body:      strings.TrimSpace(raw),
			Name:      "AI Generated",
			Variables: []string{},
		}, nil
	}
	if out.Body == "" {
		out.Body = strings.TrimSpace(raw)
	}
	if out.Name == "" {
		out.Name = "AI Generated"
	}
	if out.Variables == nil {
		out.Variables = []string{}
	}
	return &out, nil
}
