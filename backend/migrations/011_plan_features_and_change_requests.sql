-- 011: Add features column to plans and plan_change_requests for maker-checker flow
-- features: TEXT[] array of feature strings bound to each plan
-- plan_change_requests: non-admin staff submit changes, admin approves/rejects

BEGIN;

-- Add features column to plans (TEXT[] for consistency with webhooks.events, templates.variables)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}';

-- Seed default features for existing plans
UPDATE plans SET features = ARRAY['1K SMS/month', '50 daily SMS', '1 device connection', 'Fastest delivery routing', 'Basic analytics', 'Community support', 'Shared device pool', 'API access'] WHERE id = 'free';
UPDATE plans SET features = ARRAY['10K SMS/month', '2K daily SMS', '5 device connections', 'Fastest delivery routing', 'Advanced analytics', 'Priority support', 'Shared device pool', 'Custom webhooks', 'OTP system', 'API access'] WHERE id = 'pro';
UPDATE plans SET features = ARRAY['100K SMS/month', '20K daily SMS', '25 device connections', 'Fastest delivery routing', 'Full analytics suite', 'Dedicated support', 'Dedicated device pool', 'Custom webhooks', 'OTP system', 'Cost & profit tracking', 'API access'] WHERE id = 'scale';
UPDATE plans SET features = ARRAY['1M SMS/month', '200K daily SMS', '50 device connections', 'Fastest delivery routing', 'Full analytics suite', 'Dedicated support & custom SLA', 'Dedicated device pool', 'Custom webhooks', 'OTP system', 'Cost & profit tracking', 'Custom integrations', 'API access'] WHERE id = 'enterprise';

-- Maker-checker: plan change requests table
CREATE TABLE IF NOT EXISTS plan_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL,
    requested_by_name VARCHAR(255) NOT NULL DEFAULT '',
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    plan_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_by_name VARCHAR(255) NOT NULL DEFAULT '',
    review_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plan_change_requests_status ON plan_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_requested_by ON plan_change_requests(requested_by);

COMMIT;
