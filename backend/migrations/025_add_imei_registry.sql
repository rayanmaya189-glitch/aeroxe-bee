CREATE TABLE IF NOT EXISTS imei_registry (
    id BIGSERIAL PRIMARY KEY,
    imei VARCHAR(32) NOT NULL,
    physical_device_id VARCHAR(255) NOT NULL REFERENCES physical_devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}',
    UNIQUE(imei, physical_device_id)
);

CREATE INDEX IF NOT EXISTS idx_imei_registry_imei ON imei_registry(imei);
CREATE INDEX IF NOT EXISTS idx_imei_registry_physical_device_id ON imei_registry(physical_device_id);
CREATE INDEX IF NOT EXISTS idx_imei_registry_account_id ON imei_registry(account_id);
CREATE INDEX IF NOT EXISTS idx_imei_registry_last_seen ON imei_registry(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_imei_registry_imei_active ON imei_registry(imei, is_active);
