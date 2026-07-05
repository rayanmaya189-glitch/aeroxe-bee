-- Create device_fcm_tokens table for storing FCM push notification tokens.
-- Used by FCMRevivalService on Android and FCMTokenHandler on the backend.
-- Tracks token freshness via last_seen_at for automatic stale token pruning.

CREATE TABLE IF NOT EXISTS device_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL,
    fcm_token TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'android',
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_fcm_tokens_device_id ON device_fcm_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fcm_tokens_account_id ON device_fcm_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_device_fcm_tokens_is_valid ON device_fcm_tokens(is_valid);
CREATE INDEX IF NOT EXISTS idx_device_fcm_tokens_last_seen_at ON device_fcm_tokens(last_seen_at);
