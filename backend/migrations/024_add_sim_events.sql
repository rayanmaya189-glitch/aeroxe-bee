-- SIM rotation event tracking for fraud detection
CREATE TABLE IF NOT EXISTS sim_events (
    id BIGSERIAL PRIMARY KEY,
    physical_device_id VARCHAR(255) NOT NULL REFERENCES physical_devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '',
    sim_snapshot JSONB NOT NULL DEFAULT '[]',
    frequency VARCHAR(20) NOT NULL DEFAULT '',
    fingerprint_hash VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_events_physical_device_id ON sim_events(physical_device_id);
CREATE INDEX IF NOT EXISTS idx_sim_events_account_id ON sim_events(account_id);
CREATE INDEX IF NOT EXISTS idx_sim_events_created_at ON sim_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sim_events_physical_device_created ON sim_events(physical_device_id, created_at DESC);
