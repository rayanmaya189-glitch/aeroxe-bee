-- Add phone_number column to devices table for storing the SIM's phone number
ALTER TABLE devices ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';

-- Update existing devices where we can infer the phone number from registration data
-- (This is a no-op for existing rows; phone numbers will be populated on next device reconnect)
COMMENT ON COLUMN devices.phone_number IS 'SIM card phone number (e.g. +1234567890) reported during device registration/login';
