-- Migration: Create physical_devices and device_fcm_tokens tables
-- Called by POST /api/v1/devices/info and POST /api/v1/auth/fcm-token

-- Physical device metadata reported by Android after login
CREATE TABLE IF NOT EXISTS physical_devices (
    id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    model VARCHAR(255) DEFAULT '',
    manufacturer VARCHAR(255) DEFAULT '',
    os_version VARCHAR(255) DEFAULT '',
    app_version VARCHAR(100) DEFAULT '',
    battery_level REAL DEFAULT 0,
    network_type VARCHAR(50) DEFAULT '',
    device_state VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, DOZE_RISK, OEM_KILL_RISK
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_devices_account_id ON physical_devices(account_id);

-- FCM tokens for push notification revival
-- Per Firebase best practices: store FID/token with timestamp,
-- update timestamp on every upload, remove stale registrations (>1 month).
-- Tokens inactive for 270 days are garbage collected by FCM.
CREATE TABLE IF NOT EXISTS device_fcm_tokens (
    device_id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    fcm_token TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'android',
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_fcm_tokens_account_id ON device_fcm_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_device_fcm_tokens_last_seen ON device_fcm_tokens(last_seen_at);
