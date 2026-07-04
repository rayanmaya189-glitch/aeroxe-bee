-- Add max_devices column to plans table
-- Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India

BEGIN;

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_devices INTEGER NOT NULL DEFAULT 1;

-- Set sensible defaults for existing seed plans
UPDATE plans SET max_devices = 2 WHERE id = 'free';
UPDATE plans SET max_devices = 10 WHERE id = 'pro';
UPDATE plans SET max_devices = 50 WHERE id = 'scale';
UPDATE plans SET max_devices = 500 WHERE id = 'enterprise';

COMMIT;
