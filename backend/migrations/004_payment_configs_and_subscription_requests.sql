-- AeroXe Bee - Payment Configs, Payment Requests, Subscription Requests
-- Migration 004

BEGIN;

-- Payment Configs: admin-configurable payment options
CREATE TABLE IF NOT EXISTS payment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method VARCHAR(50) NOT NULL UNIQUE,  -- 'bank_transfer', 'trc20', 'qr_code'
    label VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',  -- bank name, account number, trc20 address, qr image url, etc.
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Requests: when a member wants to recharge/upgrade
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    payment_method VARCHAR(50) NOT NULL,  -- 'bank_transfer', 'trc20', 'qr_code'
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    proof_url TEXT DEFAULT '',  -- uploaded proof of payment
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription Requests: member-initiated subscription change requests (maker-checker)
CREATE TABLE IF NOT EXISTS subscription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    requested_plan VARCHAR(50) NOT NULL,
    requested_billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    current_plan VARCHAR(50) NOT NULL DEFAULT 'free',
    reason TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KYC Records
CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    document_type VARCHAR(50) NOT NULL DEFAULT '',  -- passport, drivers_license, national_id
    document_number VARCHAR(255) NOT NULL DEFAULT '',
    document_url TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Preferences (notifications, 2FA settings, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sms_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    billing_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    force_2fa BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_account_id ON payment_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_account_id ON subscription_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_kyc_records_account_id ON kyc_records(account_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_account_id ON user_preferences(account_id);

-- Seed default payment configs
INSERT INTO payment_configs (method, label, details, enabled) VALUES
    ('bank_transfer', 'Bank Transfer', '{"bank_name":"AeroXe Enterprises","account_name":"AeroXe Enterprises Pvt. Ltd.","account_number":"XXXX-XXXX-1234","routing_number":"021000021","swift_code":"AEROUS33","iban":"","currency":"USD"}', true),
    ('trc20', 'TRC-20 (USDT)', '{"network":"TRON","token":"USDT","address":"TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","memo":""}', true),
    ('qr_code', 'QR Code Payment', '{"provider":"manual","instructions":"Scan QR and upload payment proof","qr_image_url":""}', false)
ON CONFLICT (method) DO NOTHING;

COMMIT;
