-- 019_add_max_templates.sql
-- Add template limit to plans and subscriptions

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_templates INTEGER NOT NULL DEFAULT 10;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_templates INTEGER NOT NULL DEFAULT 10;

-- Update existing plans with sensible template limits
UPDATE plans SET max_templates = 5  WHERE id = 'free';
UPDATE plans SET max_templates = 20 WHERE id = 'pro';
UPDATE plans SET max_templates = 50 WHERE id = 'scale';
UPDATE plans SET max_templates = 100 WHERE id = 'enterprise';

-- Sync existing subscriptions to match their plan's max_templates
UPDATE subscriptions s
SET max_templates = p.max_templates
FROM plans p
WHERE s.plan_type = p.id;
