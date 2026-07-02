-- Add name column to devices table for user-friendly device naming
BEGIN;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT '';

-- Set default name to physical_device_id for existing devices
UPDATE devices SET name = physical_device_id WHERE name = '';

COMMIT;
