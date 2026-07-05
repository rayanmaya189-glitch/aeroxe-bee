-- 016_create_qr_pairing_tokens.sql
-- QR pairing tokens: member portal generates a short-lived token,
-- Android scans the QR code containing the token, then calls /devices/qr-login.

CREATE TABLE IF NOT EXISTS qr_pairing_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token       VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT false,
    device_id   VARCHAR(255),  -- set once the QR is scanned and device is paired
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_pairing_tokens_token ON qr_pairing_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_pairing_tokens_account_id ON qr_pairing_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_qr_pairing_tokens_expires_at ON qr_pairing_tokens(expires_at);

-- Auto-expire old tokens (cleanup job can also call this)
-- Tokens are valid for 5 minutes by default.
