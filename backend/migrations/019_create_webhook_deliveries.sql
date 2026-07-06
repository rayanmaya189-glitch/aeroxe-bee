-- 019_create_webhook_deliveries.sql
-- Webhook delivery tracking — logs every delivery attempt (including retries)
-- and allows users/admins to view delivery history for each webhook endpoint.

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    message_id      VARCHAR(255) NOT NULL DEFAULT '',
    event           VARCHAR(100) NOT NULL DEFAULT '',
    attempt_count   INT NOT NULL DEFAULT 1,
    status_code     INT NOT NULL DEFAULT 0,
    response_body   TEXT NOT NULL DEFAULT '',
    last_status     VARCHAR(100) NOT NULL DEFAULT 'pending',
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(last_status);
