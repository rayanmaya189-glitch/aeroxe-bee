CREATE TABLE IF NOT EXISTS sim_device_history (
    id BIGSERIAL PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    physical_device_id VARCHAR(255) NOT NULL REFERENCES physical_devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_fingerprint_hash VARCHAR(64) NOT NULL DEFAULT '',
    last_fingerprint_hash VARCHAR(64) NOT NULL DEFAULT '',
    device_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sim_slot INTEGER NOT NULL DEFAULT 0,
    carrier_name VARCHAR(255) NOT NULL DEFAULT '',
    mcc_mnc VARCHAR(16) NOT NULL DEFAULT '',
    country_iso VARCHAR(10) NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    UNIQUE(subscription_id, physical_device_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_device_history_subscription ON sim_device_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sim_device_history_device ON sim_device_history(physical_device_id);
CREATE INDEX IF NOT EXISTS idx_sim_device_history_active ON sim_device_history(is_active);
CREATE INDEX IF NOT EXISTS idx_sim_device_history_sub_active ON sim_device_history(subscription_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sim_device_history_last_seen ON sim_device_history(last_seen DESC);
