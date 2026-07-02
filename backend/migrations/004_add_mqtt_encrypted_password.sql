-- Add encrypted_password column to mqtt_credentials table for AES-256 reversible password storage
BEGIN;

ALTER TABLE mqtt_credentials ADD COLUMN IF NOT EXISTS encrypted_password TEXT NOT NULL DEFAULT '';

COMMIT;
