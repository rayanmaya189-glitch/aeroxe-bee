package models

import (
	"time"
)

// AppRelease represents a versioned app release with APK distribution
type AppRelease struct {
	ID                string     `db:"id" json:"id"`
	VersionCode       int        `db:"version_code" json:"version_code"`
	VersionName       string     `db:"version_name" json:"version_name"`
	ReleaseType       string     `db:"release_type" json:"release_type"` // 'force' or 'normal'
	Title             string     `db:"title" json:"title"`
	ReleaseNotes      string     `db:"release_notes" json:"release_notes"`
	MinRequiredVersion int       `db:"min_required_version" json:"min_required_version"`
	APKURL            string     `db:"apk_url" json:"apk_url"`
	APKFilename       string     `db:"apk_filename" json:"apk_filename"`
	APKSizeBytes      int64      `db:"apk_size_bytes" json:"apk_size_bytes"`
	Status            string     `db:"status" json:"status"` // draft, pending_approval, approved, released, rejected
	SubmittedBy       *string    `db:"submitted_by" json:"submitted_by,omitempty"`
	SubmittedByName   string     `db:"submitted_by_name" json:"submitted_by_name"`
	ApprovedBy        *string    `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedByName    string     `db:"approved_by_name" json:"approved_by_name"`
	RejectedBy        *string    `db:"rejected_by" json:"rejected_by,omitempty"`
	RejectionReason   string     `db:"rejection_reason" json:"rejection_reason"`
	ReleasedAt        *time.Time `db:"released_at" json:"released_at,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}

// Release status constants
const (
	ReleaseStatusDraft           = "draft"
	ReleaseStatusPendingApproval = "pending_approval"
	ReleaseStatusApproved        = "approved"
	ReleaseStatusReleased        = "released"
	ReleaseStatusRejected        = "rejected"
)

// Release type constants
const (
	ReleaseTypeForce  = "force"
	ReleaseTypeNormal = "normal"
)

// FirebaseConfigEntry represents a single Firebase Remote Config key-value pair
type FirebaseConfigEntry struct {
	ID           string    `db:"id" json:"id"`
	ConfigKey    string    `db:"config_key" json:"config_key"`
	ConfigValue  string    `db:"config_value" json:"config_value"`
	ValueType    string    `db:"value_type" json:"value_type"`
	Category     string    `db:"category" json:"category"`
	Description  string    `db:"description" json:"description"`
	IsSensitive  bool      `db:"is_sensitive" json:"is_sensitive"`
	UpdatedBy    *string   `db:"updated_by" json:"updated_by,omitempty"`
	UpdatedByName string   `db:"updated_by_name" json:"updated_by_name"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}
