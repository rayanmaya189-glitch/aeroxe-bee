-- Migration 003: 2FA and User Preferences
BEGIN;

-- 2FA Secrets (TOTP)
CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    account_id UUID,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_owner CHECK (
        (user_id IS NOT NULL AND account_id IS NULL) OR
        (user_id IS NULL AND account_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON two_factor_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_account_id ON two_factor_secrets(account_id);

-- User/Account Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    account_id UUID UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    webhook_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_required BOOLEAN NOT NULL DEFAULT FALSE,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_pref_owner CHECK (
        (user_id IS NOT NULL AND account_id IS NULL) OR
        (user_id IS NULL AND account_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_prefs_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_account_id ON user_preferences(account_id);

-- KYC Records
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    document_type VARCHAR(50) NOT NULL DEFAULT '',
    document_number VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    date_of_birth VARCHAR(50) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_account_id ON kyc_records(account_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_records(status);

COMMIT;
