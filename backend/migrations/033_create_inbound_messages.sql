-- 033_create_inbound_messages.sql
-- Inbound (received) SMS captured by device nodes and forwarded over the
-- devices/{id}/inbox MQTT topic. Enables two-way SMS: viewing replies/incoming
-- messages per account and device.

CREATE TABLE IF NOT EXISTS inbound_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id    VARCHAR(255) NOT NULL,
    account_id   VARCHAR(255) NOT NULL,
    sender       VARCHAR(64)  NOT NULL DEFAULT '',
    recipient    VARCHAR(64)  NOT NULL DEFAULT '',
    body         TEXT         NOT NULL DEFAULT '',
    sim_slot     INT          NOT NULL DEFAULT 0,
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_messages_account_id ON inbound_messages(account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_device_id ON inbound_messages(device_id, received_at DESC);
