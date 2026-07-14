-- AeroXe Bee - Initial Schema
-- Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India
-- All tables for the distributed Android SMS gateway platform

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
    retention_days INTEGER NOT NULL DEFAULT 90,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Physical Devices (Android phones)
CREATE TABLE IF NOT EXISTS physical_devices (
    id VARCHAR(255) PRIMARY KEY, -- ANDROID_ID
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    model VARCHAR(255) NOT NULL DEFAULT '',
    os_version VARCHAR(100) NOT NULL DEFAULT '',
    app_version VARCHAR(50) NOT NULL DEFAULT '',
    battery_level DOUBLE PRECISION NOT NULL DEFAULT 0,
    network_type VARCHAR(50) NOT NULL DEFAULT '',
    device_state VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devices (per-SIM logical identity)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(255) PRIMARY KEY, -- ANDROID_ID + SIM slot
    physical_device_id VARCHAR(255) NOT NULL REFERENCES physical_devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sim_slot INTEGER NOT NULL,
    carrier VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
    sim_health_status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
    health_trend_slope DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_seen TIMESTAMPTZ,
    last_ping_at TIMESTAMPTZ,
    last_pong_at TIMESTAMPTZ,
    messages_sent_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    mqtt_credential_id UUID,
    reliability_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    reputation_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    complaint_count BIGINT NOT NULL DEFAULT 0,
    block_event_count BIGINT NOT NULL DEFAULT 0,
    fraud_flag_weight DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    success_rate_24h DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    uptime_ratio_24h DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    avg_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    country_code VARCHAR(10) NOT NULL DEFAULT '',
    region VARCHAR(100) NOT NULL DEFAULT '',
    max_per_minute INTEGER NOT NULL DEFAULT 10,
    max_per_hour INTEGER NOT NULL DEFAULT 100,
    isolated_pool_id UUID,
    circuit_breaker_state VARCHAR(50) NOT NULL DEFAULT 'CLOSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(physical_device_id, sim_slot)
);

-- MQTT Credentials
CREATE TABLE IF NOT EXISTS mqtt_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL UNIQUE,
    credential_hash_or_cert_ref VARCHAR(255) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Templates must be created before messages reference them
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) REFERENCES devices(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
    recipient VARCHAR(50) NOT NULL,
    sender VARCHAR(50) NOT NULL,
    encrypted_message BYTEA NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'transactional',
    priority_lane VARCHAR(50) NOT NULL DEFAULT 'transactional',
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    purge_after TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    routing_strategy_used VARCHAR(100) NOT NULL DEFAULT 'highest_reliability'
);

-- Idempotency Keys (Redis backed, but logged here for audit)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- OTP Metadata
CREATE TABLE IF NOT EXISTS otp_metadata (
    message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_rotated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_status VARCHAR(100) NOT NULL DEFAULT 'pending',
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    daily_quota BIGINT NOT NULL DEFAULT 0,
    monthly_quota BIGINT NOT NULL DEFAULT 0,
    overage_buffer_pct DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    max_queue_depth INTEGER NOT NULL DEFAULT 1000,
    dedicated_pool BOOLEAN NOT NULL DEFAULT FALSE,
    default_routing_strategy VARCHAR(100) NOT NULL DEFAULT 'highest_reliability',
    price_per_sms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    monthly_price DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    renewal_date TIMESTAMPTZ NOT NULL,
    stripe_customer_id VARCHAR(255),
    quota_daily BIGINT NOT NULL DEFAULT 0,
    quota_monthly BIGINT NOT NULL DEFAULT 0,
    overage_buffer_pct DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    max_queue_depth INTEGER NOT NULL DEFAULT 1000,
    dedicated_pool BOOLEAN NOT NULL DEFAULT FALSE,
    default_routing_strategy VARCHAR(100) NOT NULL DEFAULT 'highest_reliability',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage Counters
CREATE TABLE IF NOT EXISTS usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, date)
);

-- Analytics Daily
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date VARCHAR(10) NOT NULL UNIQUE,
    total_sent BIGINT NOT NULL DEFAULT 0,
    total_delivered BIGINT NOT NULL DEFAULT 0,
    total_failed BIGINT NOT NULL DEFAULT 0,
    avg_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    otp_sent BIGINT NOT NULL DEFAULT 0,
    transactional_sent BIGINT NOT NULL DEFAULT 0,
    marketing_sent BIGINT NOT NULL DEFAULT 0
);

-- Cost Tracking
CREATE TABLE IF NOT EXISTS cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    cost_per_sms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    date VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device Cost Profile
CREATE TABLE IF NOT EXISTS device_cost_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    sim_cost_per_sms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    region_cost_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    plan_context VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abuse Flags
CREATE TABLE IF NOT EXISTS abuse_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    flag_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Fraud Flags
CREATE TABLE IF NOT EXISTS fraud_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    device_id VARCHAR(255) REFERENCES devices(id) ON DELETE SET NULL,
    flag_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    weight DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Global Throttle Counters
CREATE TABLE IF NOT EXISTS global_throttle_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    scope_value VARCHAR(255) NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL
);

-- Circuit Breaker Events
CREATE TABLE IF NOT EXISTS circuit_breaker_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    scope_value VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    reason TEXT NOT NULL DEFAULT ''
);

-- Queue Dead Letters
CREATE TABLE IF NOT EXISTS queue_dead_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    fail_reason TEXT NOT NULL DEFAULT '',
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_account_id ON api_keys(account_id);
CREATE INDEX IF NOT EXISTS idx_devices_account_id ON devices(account_id);
CREATE INDEX IF NOT EXISTS idx_devices_physical_device_id ON devices(physical_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_carrier ON devices(carrier);
CREATE INDEX IF NOT EXISTS idx_devices_sim_health ON devices(sim_health_status);
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages(device_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_idempotency_key ON messages(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_account_id ON webhooks(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_account_id ON fraud_flags(account_id);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_account_id ON abuse_flags(account_id);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_scope ON circuit_breaker_events(scope, scope_value);
CREATE INDEX IF NOT EXISTS idx_usage_counters_account_date ON usage_counters(account_id, date);

-- Seed default plans
INSERT INTO plans (id, name, daily_quota, monthly_quota, overage_buffer_pct, max_queue_depth, dedicated_pool, default_routing_strategy, price_per_sms, monthly_price) VALUES
    ('free', 'Free', 100, 3000, 10, 1000, FALSE, 'highest_reliability', 0.0, 0.0),
    ('pro', 'Pro', 1000, 30000, 10, 5000, FALSE, 'lowest_cost', 0.005, 29.99),
    ('scale', 'Scale', 10000, 300000, 10, 20000, TRUE, 'lowest_cost', 0.003, 99.99),
    ('enterprise', 'Enterprise', 100000, 3000000, 15, 100000, TRUE, 'lowest_cost', 0.002, 299.99)
ON CONFLICT (id) DO NOTHING;

COMMIT;
