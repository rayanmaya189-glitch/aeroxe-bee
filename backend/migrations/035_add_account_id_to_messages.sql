-- 035_add_account_id_to_messages.sql
-- Add account_id directly to messages table for:
-- 1. Proper account isolation even if device is disconnected or deleted
-- 2. Simplified queries without EXISTS subqueries
-- 3. Better traceability of messages to accounts

BEGIN;

-- Add the column (nullable initially to backfill)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS account_id UUID;

-- Backfill account_id from existing relationships:
-- 1. Through api_keys (api_key_id -> api_keys.account_id)
-- 2. Through devices (device_id -> devices.account_id)
UPDATE messages m
SET account_id = COALESCE(
    (SELECT ak.account_id FROM api_keys ak WHERE ak.id = m.api_key_id),
    (SELECT d.account_id FROM devices d WHERE d.id = m.device_id)
)
WHERE m.account_id IS NULL;

-- Make account_id NOT NULL after backfill
ALTER TABLE messages ALTER COLUMN account_id SET NOT NULL;

-- Add index for efficient account-scoped queries
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages (account_id, created_at DESC);

COMMIT;
