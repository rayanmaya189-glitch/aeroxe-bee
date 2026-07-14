-- 032_add_webhook_deliveries_payload.sql
-- Store the full webhook payload alongside each delivery record so that retries
-- can re-send the complete original context (recipient, sender, status, etc.)
-- instead of a minimal reconstructed payload. Existing rows default to '' and
-- fall back to minimal reconstruction on retry.

ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT '';
