-- Add indexes on mqtt_credentials to optimize Mosquitto auth queries
-- The auth plugin queries:
--   credential_hash_or_cert_ref WHERE username = $1 AND revoked_at IS NULL
-- This index covers both the WHERE clause and includes the returned column

BEGIN;

-- Index for username lookups with non-revoked filter (used by auth plugin)
CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_username_active
    ON mqtt_credentials (username)
    WHERE revoked_at IS NULL;

-- Index for device_id lookups (used by backend service)
CREATE INDEX IF NOT EXISTS idx_mqtt_credentials_device_id
    ON mqtt_credentials (device_id)
    WHERE revoked_at IS NULL;

COMMIT;
