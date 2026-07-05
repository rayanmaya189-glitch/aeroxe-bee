package services

import (
	"context"
	"fmt"
	"time"

	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// AppReleaseService handles app release CRUD and maker-checker approval flow
type AppReleaseService struct {
	db DatabaseQuerier
}

func NewAppReleaseService(db DatabaseQuerier) *AppReleaseService {
	return &AppReleaseService{db: db}
}

// Create inserts a new app release draft
func (s *AppReleaseService) Create(ctx context.Context, r *models.AppRelease) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO app_releases (version_code, version_name, release_type, title, release_notes,
		 min_required_version, apk_url, apk_filename, apk_size_bytes, status, submitted_by, submitted_by_name)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		r.VersionCode, r.VersionName, r.ReleaseType, r.Title, r.ReleaseNotes,
		r.MinRequiredVersion, r.APKURL, r.APKFilename, r.APKSizeBytes, r.Status,
		r.SubmittedBy, r.SubmittedByName,
	)
	return err
}

// GetByID retrieves a release by ID
func (s *AppReleaseService) GetByID(ctx context.Context, id string) (*models.AppRelease, error) {
	r := &models.AppRelease{}
	err := s.db.QueryRow(ctx,
		`SELECT id, version_code, version_name, release_type, title, release_notes,
		 min_required_version, apk_url, apk_filename, apk_size_bytes, status,
		 submitted_by, submitted_by_name, approved_by, approved_by_name,
		 rejected_by, rejection_reason, released_at, created_at, updated_at
		 FROM app_releases WHERE id = $1`, id,
	).Scan(&r.ID, &r.VersionCode, &r.VersionName, &r.ReleaseType, &r.Title, &r.ReleaseNotes,
		&r.MinRequiredVersion, &r.APKURL, &r.APKFilename, &r.APKSizeBytes, &r.Status,
		&r.SubmittedBy, &r.SubmittedByName, &r.ApprovedBy, &r.ApprovedByName,
		&r.RejectedBy, &r.RejectionReason, &r.ReleasedAt, &r.CreatedAt, &r.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return r, err
}

// ListAll returns all releases ordered by version_code descending
func (s *AppReleaseService) ListAll(ctx context.Context) ([]models.AppRelease, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, version_code, version_name, release_type, title, release_notes,
		 min_required_version, apk_url, apk_filename, apk_size_bytes, status,
		 submitted_by, submitted_by_name, approved_by, approved_by_name,
		 rejected_by, rejection_reason, released_at, created_at, updated_at
		 FROM app_releases ORDER BY version_code DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var releases []models.AppRelease
	for rows.Next() {
		var r models.AppRelease
		if err := rows.Scan(&r.ID, &r.VersionCode, &r.VersionName, &r.ReleaseType, &r.Title, &r.ReleaseNotes,
			&r.MinRequiredVersion, &r.APKURL, &r.APKFilename, &r.APKSizeBytes, &r.Status,
			&r.SubmittedBy, &r.SubmittedByName, &r.ApprovedBy, &r.ApprovedByName,
			&r.RejectedBy, &r.RejectionReason, &r.ReleasedAt, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		releases = append(releases, r)
	}
	return releases, nil
}

// GetLatestReleased returns the currently released version
func (s *AppReleaseService) GetLatestReleased(ctx context.Context) (*models.AppRelease, error) {
	r := &models.AppRelease{}
	err := s.db.QueryRow(ctx,
		`SELECT id, version_code, version_name, release_type, title, release_notes,
		 min_required_version, apk_url, apk_filename, apk_size_bytes, status,
		 submitted_by, submitted_by_name, approved_by, approved_by_name,
		 rejected_by, rejection_reason, released_at, created_at, updated_at
		 FROM app_releases WHERE status = 'released' ORDER BY version_code DESC LIMIT 1`,
	).Scan(&r.ID, &r.VersionCode, &r.VersionName, &r.ReleaseType, &r.Title, &r.ReleaseNotes,
		&r.MinRequiredVersion, &r.APKURL, &r.APKFilename, &r.APKSizeBytes, &r.Status,
		&r.SubmittedBy, &r.SubmittedByName, &r.ApprovedBy, &r.ApprovedByName,
		&r.RejectedBy, &r.RejectionReason, &r.ReleasedAt, &r.CreatedAt, &r.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return r, err
}

// SubmitForApproval sets status to pending_approval
func (s *AppReleaseService) SubmitForApproval(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE app_releases SET status = 'pending_approval', updated_at = NOW() WHERE id = $1 AND status = 'draft'`, id)
	return err
}

// Approve sets status to approved
func (s *AppReleaseService) Approve(ctx context.Context, id, approvedBy, approvedByName string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE app_releases SET status = 'approved', approved_by = $1, approved_by_name = $2, updated_at = NOW()
		 WHERE id = $3 AND status = 'pending_approval'`, approvedBy, approvedByName, id)
	return err
}

// Reject sets status to rejected
func (s *AppReleaseService) Reject(ctx context.Context, id, rejectedBy, reason string) error {
	_, err := s.db.Exec(ctx,
		`UPDATE app_releases SET status = 'rejected', rejected_by = $1, rejection_reason = $2, updated_at = NOW()
		 WHERE id = $3 AND status = 'pending_approval'`, rejectedBy, reason, id)
	return err
}

// Release publishes a release — un-releases any previous release first
func (s *AppReleaseService) Release(ctx context.Context, id string) error {
	// Un-release any previously released version
	_, _ = s.db.Exec(ctx, `UPDATE app_releases SET status = 'approved' WHERE status = 'released'`)
	// Release the new version
	_, err := s.db.Exec(ctx,
		`UPDATE app_releases SET status = 'released', released_at = $1, updated_at = NOW() WHERE id = $2 AND status = 'approved'`,
		time.Now(), id)
	return err
}

// Delete removes a release (only drafts and rejected)
func (s *AppReleaseService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx,
		`DELETE FROM app_releases WHERE id = $1 AND status IN ('draft', 'rejected')`, id)
	return err
}

// UpdateAPK updates the APK metadata on a draft release
func (s *AppReleaseService) UpdateAPK(ctx context.Context, id, apkURL, filename string, sizeBytes int64) error {
	_, err := s.db.Exec(ctx,
		`UPDATE app_releases SET apk_url = $1, apk_filename = $2, apk_size_bytes = $3, updated_at = NOW()
		 WHERE id = $4 AND status = 'draft'`, apkURL, filename, sizeBytes, id)
	return err
}

// FirebaseConfigService handles Firebase Remote Config key-value management
type FirebaseConfigService struct {
	db DatabaseQuerier
}

func NewFirebaseConfigService(db DatabaseQuerier) *FirebaseConfigService {
	return &FirebaseConfigService{db: db}
}

// ListAll returns all config entries ordered by category and key
func (s *FirebaseConfigService) ListAll(ctx context.Context) ([]models.FirebaseConfigEntry, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, config_key, config_value, value_type, category, description, is_sensitive,
		 updated_by, updated_by_name, created_at, updated_at
		 FROM firebase_config ORDER BY category, config_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.FirebaseConfigEntry
	for rows.Next() {
		var e models.FirebaseConfigEntry
		if err := rows.Scan(&e.ID, &e.ConfigKey, &e.ConfigValue, &e.ValueType, &e.Category,
			&e.Description, &e.IsSensitive, &e.UpdatedBy, &e.UpdatedByName, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ListPublic returns only non-sensitive config entries (for Android client)
func (s *FirebaseConfigService) ListPublic(ctx context.Context) ([]models.FirebaseConfigEntry, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, config_key, config_value, value_type, category, description, is_sensitive,
		 updated_by, updated_by_name, created_at, updated_at
		 FROM firebase_config WHERE is_sensitive = false ORDER BY category, config_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.FirebaseConfigEntry
	for rows.Next() {
		var e models.FirebaseConfigEntry
		if err := rows.Scan(&e.ID, &e.ConfigKey, &e.ConfigValue, &e.ValueType, &e.Category,
			&e.Description, &e.IsSensitive, &e.UpdatedBy, &e.UpdatedByName, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// GetByKey returns a single config entry
func (s *FirebaseConfigService) GetByKey(ctx context.Context, key string) (*models.FirebaseConfigEntry, error) {
	e := &models.FirebaseConfigEntry{}
	err := s.db.QueryRow(ctx,
		`SELECT id, config_key, config_value, value_type, category, description, is_sensitive,
		 updated_by, updated_by_name, created_at, updated_at
		 FROM firebase_config WHERE config_key = $1`, key,
	).Scan(&e.ID, &e.ConfigKey, &e.ConfigValue, &e.ValueType, &e.Category,
		&e.Description, &e.IsSensitive, &e.UpdatedBy, &e.UpdatedByName, &e.CreatedAt, &e.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return e, err
}

// Upsert creates or updates a config entry
func (s *FirebaseConfigService) Upsert(ctx context.Context, e *models.FirebaseConfigEntry) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO firebase_config (config_key, config_value, value_type, category, description, is_sensitive, updated_by, updated_by_name)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (config_key) DO UPDATE SET
		   config_value = EXCLUDED.config_value, value_type = EXCLUDED.value_type,
		   category = EXCLUDED.category, description = EXCLUDED.description,
		   is_sensitive = EXCLUDED.is_sensitive, updated_by = EXCLUDED.updated_by,
		   updated_by_name = EXCLUDED.updated_by_name, updated_at = NOW()`,
		e.ConfigKey, e.ConfigValue, e.ValueType, e.Category, e.Description, e.IsSensitive, e.UpdatedBy, e.UpdatedByName)
	return err
}

// BulkUpdate updates multiple config entries in a single transaction
func (s *FirebaseConfigService) BulkUpdate(ctx context.Context, entries []models.FirebaseConfigEntry, updatedBy, updatedByName string) error {
	for _, e := range entries {
		e.UpdatedBy = &updatedBy
		e.UpdatedByName = updatedByName
		if err := s.Upsert(ctx, &e); err != nil {
			return fmt.Errorf("update key %s: %w", e.ConfigKey, err)
		}
	}
	return nil
}

// Delete removes a config entry
func (s *FirebaseConfigService) Delete(ctx context.Context, key string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM firebase_config WHERE config_key = $1`, key)
	return err
}

// GetAsMap returns all public config entries as a map (for Android version check)
func (s *FirebaseConfigService) GetAsMap(ctx context.Context) (map[string]interface{}, error) {
	entries, err := s.ListPublic(ctx)
	if err != nil {
		return nil, err
	}
	result := make(map[string]interface{})
	for _, e := range entries {
		switch e.ValueType {
		case "boolean":
			result[e.ConfigKey] = e.ConfigValue == "true"
		case "integer":
			var v int
			if _, err := fmt.Sscanf(e.ConfigValue, "%d", &v); err == nil {
				result[e.ConfigKey] = v
			} else {
				result[e.ConfigKey] = e.ConfigValue
			}
		default:
			result[e.ConfigKey] = e.ConfigValue
		}
	}
	return result, nil
}
