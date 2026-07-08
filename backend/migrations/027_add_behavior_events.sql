CREATE TABLE IF NOT EXISTS behavior_events (
    id BIGSERIAL PRIMARY KEY,
    physical_device_id VARCHAR(255) NOT NULL REFERENCES physical_devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    severity INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '',
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_events_device ON behavior_events(physical_device_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_account ON behavior_events(account_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_type ON behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_events_created ON behavior_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_events_correlation ON behavior_events(physical_device_id, event_type, created_at DESC);
