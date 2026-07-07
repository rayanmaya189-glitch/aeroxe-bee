-- Fix mqtt_credentials table for reliable re-login and per-device credential rotation
--
-- Problem: The UNIQUE constraint on `username` prevents inserting new credentials
-- when a previously revoked credential with the same username still exists in the table.
-- This causes "failed to create MQTT credentials" on every login after the first re-login.
--
-- Fix:
--   1. Drop the UNIQUE constraint on username
--   2. Add a partial UNIQUE index on (username) WHERE revoked_at IS NULL to enforce
--      "at most one active credential per device" while allowing multiple revoked rows
--   3. Ensure encrypted_password column exists (defensive, also handled in migration 004)

BEGIN;

-- Drop the UNIQUE constraint on username (auto-named by PostgreSQL)
ALTER TABLE mqtt_credentials DROP CONSTRAINT IF EXISTS mqtt_credentials_username_key;

-- Ensure encrypted_password column exists (defensive, in case migration 004 was not applied)
ALTER TABLE mqtt_credentials ADD COLUMN IF NOT EXISTS encrypted_password TEXT NOT NULL DEFAULT '';

-- Enforce at most one active (non-revoked) credential per device
-- Drop existing non-unique index first (may have been created by migration 005)
DROP INDEX IF EXISTS idx_mqtt_credentials_username_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mqtt_credentials_username_active
    ON mqtt_credentials (username)
    WHERE revoked_at IS NULL;

COMMIT;
