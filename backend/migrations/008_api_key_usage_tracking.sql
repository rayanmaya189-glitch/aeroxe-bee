-- Add usage tracking columns to api_keys
-- Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India

BEGIN;

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS request_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at);

COMMIT;
