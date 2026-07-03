-- AeroXe Bee - Plan Visibility
-- Copyright (c) Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India
-- Migration 006

BEGIN;

-- Add visibility column to plans table
-- public: visible to all members
-- private: only visible to admins
-- custom: visible only to subscribed members
ALTER TABLE plans ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) NOT NULL DEFAULT 'public';

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_plans_visibility ON plans(visibility);

-- Update existing plans to have appropriate visibility
-- Free and Pro plans are public by default
-- Scale and Enterprise plans are custom by default
UPDATE plans SET visibility = 'public' WHERE id IN ('free', 'pro');
UPDATE plans SET visibility = 'custom' WHERE id IN ('scale', 'enterprise');

COMMIT;
