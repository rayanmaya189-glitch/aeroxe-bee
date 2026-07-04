-- 010: Add is_popular and cta_text columns to plans table
-- is_popular marks which plan gets the "Most Popular" badge on the pricing page
-- cta_text is the call-to-action button text shown on the pricing card

ALTER TABLE plans ADD COLUMN is_popular BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN cta_text VARCHAR(100) NOT NULL DEFAULT 'Get Started';

-- Set sensible defaults for existing plans
UPDATE plans SET is_popular = TRUE,  cta_text = 'Contact Sales' WHERE id = 'scale';
UPDATE plans SET is_popular = FALSE, cta_text = 'Get Started Free' WHERE id = 'free';
UPDATE plans SET is_popular = FALSE, cta_text = 'Start Free Trial' WHERE id = 'pro';
UPDATE plans SET is_popular = FALSE, cta_text = 'Contact Sales' WHERE id = 'enterprise';
