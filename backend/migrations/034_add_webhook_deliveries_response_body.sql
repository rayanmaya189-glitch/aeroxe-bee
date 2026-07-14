-- 034_add_webhook_deliveries_response_body.sql
-- Migration 001 created webhook_deliveries without response_body.
-- Migration 019 intended to add it via CREATE TABLE IF NOT EXISTS, but the
-- table already existed so the statement was a no-op.  This ALTER TABLE
-- adds the missing column so webhook delivery queries stop failing.

ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_body TEXT NOT NULL DEFAULT '';
