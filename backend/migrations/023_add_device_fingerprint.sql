-- Add device identity / anti-spoofing columns to physical_devices
ALTER TABLE physical_devices
    ADD COLUMN IF NOT EXISTS fingerprint_hash VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS signature TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS public_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS uuid VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS brand VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sdk_level INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sim_country VARCHAR(10) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS sim_operator VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS install_time BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS trust_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS integrity_token TEXT,
    ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;

-- Index on fingerprint_hash for lookup / anti-clone detection
CREATE INDEX IF NOT EXISTS idx_physical_devices_fingerprint_hash ON physical_devices(fingerprint_hash);

-- Also add fingerprint_hash to logical devices for quick join
ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS fingerprint_hash VARCHAR(64) NOT NULL DEFAULT '';
