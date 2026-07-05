package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

// AppReleaseHandler handles app release management endpoints
type AppReleaseHandler struct {
	releaseService *services.AppReleaseService
}

func NewAppReleaseHandler(releaseService *services.AppReleaseService) *AppReleaseHandler {
	return &AppReleaseHandler{releaseService: releaseService}
}

// Create handles POST /api/v1/admin/releases — creates a new release draft
func (h *AppReleaseHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID := middleware.GetAccountID(r.Context())

	var req struct {
		VersionCode        int    `json:"version_code"`
		VersionName        string `json:"version_name"`
		ReleaseType        string `json:"release_type"`
		Title              string `json:"title"`
		ReleaseNotes       string `json:"release_notes"`
		MinRequiredVersion int    `json:"min_required_version"`
		APKURL             string `json:"apk_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	if req.VersionCode <= 0 || req.VersionName == "" {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "version_code and version_name are required"})
		return
	}
	if req.ReleaseType == "" {
		req.ReleaseType = models.ReleaseTypeNormal
	}
	if req.MinRequiredVersion <= 0 {
		req.MinRequiredVersion = 1
	}

	release := &models.AppRelease{
		VersionCode:        req.VersionCode,
		VersionName:        req.VersionName,
		ReleaseType:        req.ReleaseType,
		Title:              req.Title,
		ReleaseNotes:       req.ReleaseNotes,
		MinRequiredVersion: req.MinRequiredVersion,
		APKURL:             req.APKURL,
		Status:             models.ReleaseStatusDraft,
		SubmittedBy:        &accountID,
		SubmittedByName:    accountID,
	}

	if err := h.releaseService.Create(r.Context(), release); err != nil {
		if strings.Contains(err.Error(), "unique") {
			writeJSON(w, http.StatusConflict, APIResponse{Error: "version_code already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to create release"})
		return
	}

	writeJSON(w, http.StatusCreated, APIResponse{Success: true, Data: release})
}

// List handles GET /api/v1/admin/releases — lists all releases
func (h *AppReleaseHandler) List(w http.ResponseWriter, r *http.Request) {
	releases, err := h.releaseService.ListAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list releases"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: releases})
}

// Get handles GET /api/v1/admin/releases/{id}
func (h *AppReleaseHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	release, err := h.releaseService.GetByID(r.Context(), id)
	if err != nil || release == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "release not found"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: release})
}

// Submit handles POST /api/v1/admin/releases/{id}/submit — submit for approval
func (h *AppReleaseHandler) Submit(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.releaseService.SubmitForApproval(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to submit release"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Approve handles POST /api/v1/admin/releases/{id}/approve — admin approves
func (h *AppReleaseHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admin can approve releases"})
		return
	}

	if err := h.releaseService.Approve(r.Context(), id, accountID, accountID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to approve release"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Reject handles POST /api/v1/admin/releases/{id}/reject — admin rejects
func (h *AppReleaseHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	accountID := middleware.GetAccountID(r.Context())

	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admin can reject releases"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.releaseService.Reject(r.Context(), id, accountID, req.Reason); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to reject release"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Release handles POST /api/v1/admin/releases/{id}/release — publish the release
func (h *AppReleaseHandler) Release(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	if !middleware.GetIsAdmin(r.Context()) {
		writeJSON(w, http.StatusForbidden, APIResponse{Error: "only admin can publish releases"})
		return
	}

	if err := h.releaseService.Release(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to publish release"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Delete handles DELETE /api/v1/admin/releases/{id}
func (h *AppReleaseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.releaseService.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete release"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// UploadAPK handles POST /api/v1/admin/releases/{id}/upload — upload APK file and associate with release
func (h *AppReleaseHandler) UploadAPK(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	r.Body = http.MaxBytesReader(w, r.Body, 100<<20)
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "file too large (max 100MB)"})
		return
	}

	file, header, err := r.FormFile("apk")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "no APK file provided"})
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".apk") {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "file must be an .apk file"})
		return
	}

	release, err := h.releaseService.GetByID(r.Context(), id)
	if err != nil || release == nil {
		writeJSON(w, http.StatusNotFound, APIResponse{Error: "release not found"})
		return
	}
	if release.Status != models.ReleaseStatusDraft {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "can only upload APK to draft releases"})
		return
	}

	uploadDir := filepath.Join("uploads", "apks")
	os.MkdirAll(uploadDir, 0755)

	filename := fmt.Sprintf("app-v%s-%d.apk", release.VersionName, time.Now().UnixMilli())
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to save file"})
		return
	}
	defer dst.Close()

	totalWritten, err := io.Copy(dst, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to write file"})
		return
	}

	// Update the release record with the APK info
	downloadURL := fmt.Sprintf("/api/v1/uploads/apks/%s", filename)
	if err := h.releaseService.UpdateAPK(r.Context(), id, downloadURL, filename, totalWritten); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update release with APK info"})
		return
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"filename":     filename,
			"file_path":    filePath,
			"size_bytes":   totalWritten,
			"download_url": downloadURL,
		},
	})
}

// VersionCheck handles GET /api/v1/version-check — Android checks for updates
func (h *AppReleaseHandler) VersionCheck(w http.ResponseWriter, r *http.Request) {
	currentVersionStr := r.URL.Query().Get("version_code")
	currentVersion, _ := strconv.Atoi(currentVersionStr)

	release, err := h.releaseService.GetLatestReleased(r.Context())
	if err != nil || release == nil {
		writeJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"update_available": false,
			},
		})
		return
	}

	updateAvailable := release.VersionCode > currentVersion
	forceUpdate := false
	if updateAvailable && release.ReleaseType == models.ReleaseTypeForce {
		forceUpdate = release.MinRequiredVersion > 0 && currentVersion < release.MinRequiredVersion
	}

	writeJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"update_available": updateAvailable,
			"force_update":     forceUpdate,
			"version_code":     release.VersionCode,
			"version_name":     release.VersionName,
			"release_type":     release.ReleaseType,
			"title":            release.Title,
			"release_notes":    release.ReleaseNotes,
			"download_url":     release.APKURL,
			"apk_filename":     release.APKFilename,
			"release_id":       release.ID,
		},
	})
}

// ─── Firebase Config Handler ────────────────────────────────────────────────

// FirebaseConfigHandler handles Firebase Remote Config management
type FirebaseConfigHandler struct {
	configService *services.FirebaseConfigService
}

func NewFirebaseConfigHandler(configService *services.FirebaseConfigService) *FirebaseConfigHandler {
	return &FirebaseConfigHandler{configService: configService}
}

// List handles GET /api/v1/admin/firebase-config — admin lists all config entries
func (h *FirebaseConfigHandler) List(w http.ResponseWriter, r *http.Request) {
	entries, err := h.configService.ListAll(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to list config"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: entries})
}

// PublicConfig handles GET /api/v1/firebase-config — public endpoint for Android
func (h *FirebaseConfigHandler) PublicConfig(w http.ResponseWriter, r *http.Request) {
	configMap, err := h.configService.GetAsMap(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to load config"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: configMap})
}

// Upsert handles PUT /api/v1/admin/firebase-config/{key} — update a single config entry
func (h *FirebaseConfigHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	userID := middleware.GetAccountID(r.Context())

	var req struct {
		Value       string `json:"value"`
		ValueType   string `json:"value_type"`
		Category    string `json:"category"`
		Description string `json:"description"`
		IsSensitive bool   `json:"is_sensitive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	entry := &models.FirebaseConfigEntry{
		ConfigKey:     key,
		ConfigValue:   req.Value,
		ValueType:     req.ValueType,
		Category:      req.Category,
		Description:   req.Description,
		IsSensitive:   req.IsSensitive,
		UpdatedBy:     &userID,
		UpdatedByName: userID,
	}

	if err := h.configService.Upsert(r.Context(), entry); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to update config"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true, Data: entry})
}

// BulkUpdate handles PUT /api/v1/admin/firebase-config — bulk update multiple entries
func (h *FirebaseConfigHandler) BulkUpdate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetAccountID(r.Context())

	var req struct {
		Entries []struct {
			ConfigKey   string `json:"config_key"`
			ConfigValue string `json:"config_value"`
			ValueType   string `json:"value_type"`
			Category    string `json:"category"`
			Description string `json:"description"`
			IsSensitive bool   `json:"is_sensitive"`
		} `json:"entries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, APIResponse{Error: "invalid request body"})
		return
	}

	entries := make([]models.FirebaseConfigEntry, len(req.Entries))
	for i, e := range req.Entries {
		entries[i] = models.FirebaseConfigEntry{
			ConfigKey:    e.ConfigKey,
			ConfigValue:  e.ConfigValue,
			ValueType:    e.ValueType,
			Category:     e.Category,
			Description:  e.Description,
			IsSensitive:  e.IsSensitive,
		}
	}

	if err := h.configService.BulkUpdate(r.Context(), entries, userID, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}

// Delete handles DELETE /api/v1/admin/firebase-config/{key}
func (h *FirebaseConfigHandler) Delete(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	if err := h.configService.Delete(r.Context(), key); err != nil {
		writeJSON(w, http.StatusInternalServerError, APIResponse{Error: "failed to delete config"})
		return
	}
	writeJSON(w, http.StatusOK, APIResponse{Success: true})
}
