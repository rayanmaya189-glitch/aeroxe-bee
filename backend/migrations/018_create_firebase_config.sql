-- 018_create_firebase_config.sql
-- Firebase Remote Config management: admins can update Firebase config values at runtime.
-- These values are served via an API endpoint that Android queries on startup.

CREATE TABLE IF NOT EXISTS firebase_config (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key  VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL DEFAULT '',
    value_type  VARCHAR(20) NOT NULL DEFAULT 'string',  -- string, boolean, integer, json
    category    VARCHAR(50) NOT NULL DEFAULT 'general',  -- general, feature_flags, update, mqtt, notifications
    description TEXT NOT NULL DEFAULT '',
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firebase_config_key ON firebase_config(config_key);
CREATE INDEX IF NOT EXISTS idx_firebase_config_category ON firebase_config(category);

-- Seed default Firebase config values
INSERT INTO firebase_config (config_key, config_value, value_type, category, description) VALUES
    ('min_app_version_code', '1', 'integer', 'update', 'Minimum required app version code. Below this, force update is triggered.'),
    ('latest_version_code', '1', 'integer', 'update', 'Latest released app version code.'),
    ('latest_version_name', '1.0.0', 'string', 'update', 'Latest released app version name.'),
    ('force_update_enabled', 'false', 'boolean', 'update', 'Whether force update is currently active.'),
    ('force_update_message', 'A new version is required. Please update to continue.', 'string', 'update', 'Message shown during force update.'),
    ('update_download_url', '', 'string', 'update', 'External APK download URL (fallback if no uploaded APK).'),
    ('mqtt_enabled', 'true', 'boolean', 'feature_flags', 'Enable MQTT connectivity in the app.'),
    ('sms_retry_enabled', 'true', 'boolean', 'feature_flags', 'Enable SMS retry logic on devices.'),
    ('push_notifications_enabled', 'true', 'boolean', 'feature_flags', 'Enable push notification delivery.'),
    ('onboarding_required', 'true', 'boolean', 'feature_flags', 'Whether onboarding flow is required on first launch.'),
    ('maintenance_mode', 'false', 'boolean', 'feature_flags', 'Put the app in maintenance mode.'),
    ('support_email', 'support@aeroxe.com', 'string', 'general', 'Support email shown in the app.'),
    ('heartbeat_interval_ms', '30000', 'integer', 'mqtt', 'MQTT heartbeat interval in milliseconds.'),
    ('retry_interval_ms', '60000', 'integer', 'mqtt', 'SMS retry interval in milliseconds.'),
    ('max_sms_parts', '5', 'integer', 'general', 'Maximum number of SMS parts per message.')
ON CONFLICT (config_key) DO NOTHING;
