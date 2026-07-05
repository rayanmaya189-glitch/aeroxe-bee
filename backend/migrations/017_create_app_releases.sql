-- 017_create_app_releases.sql
-- App release management: version tracking, APK distribution, force/normal updates.
-- Supports both direct APK upload and external download URLs.
-- Any role can submit a release (maker), only admin can approve and publish (checker).

CREATE TABLE IF NOT EXISTS app_releases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code        INTEGER NOT NULL,
    version_name        VARCHAR(50) NOT NULL,
    release_type        VARCHAR(20) NOT NULL DEFAULT 'normal',  -- 'force' or 'normal'
    title               VARCHAR(255) NOT NULL DEFAULT '',
    release_notes       TEXT NOT NULL DEFAULT '',
    min_required_version INTEGER NOT NULL DEFAULT 1,            -- min version_code to force update
    apk_url             TEXT NOT NULL DEFAULT '',                -- external download URL
    apk_filename        VARCHAR(255) NOT NULL DEFAULT '',       -- stored APK filename (if uploaded)
    apk_size_bytes      BIGINT NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',   -- draft, pending_approval, approved, released, rejected
    submitted_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_by_name   VARCHAR(255) NOT NULL DEFAULT '',
    approved_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_name    VARCHAR(255) NOT NULL DEFAULT '',
    rejected_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason    TEXT NOT NULL DEFAULT '',
    released_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(version_code)
);

CREATE INDEX IF NOT EXISTS idx_app_releases_status ON app_releases(status);
CREATE INDEX IF NOT EXISTS idx_app_releases_version_code ON app_releases(version_code DESC);
CREATE INDEX IF NOT EXISTS idx_app_releases_submitted_by ON app_releases(submitted_by);

-- Only one release can be 'released' at a time (latest version)
-- Enforced via application logic (un-release previous before releasing new)
