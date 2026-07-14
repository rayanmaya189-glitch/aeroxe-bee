-- 035_add_account_id_to_messages.sql

BEGIN;

-- Add index for efficient account-scoped queries
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages (account_id, created_at DESC);

COMMIT;
