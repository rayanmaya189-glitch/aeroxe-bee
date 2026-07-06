-- Add scheduled_at column to messages table for message scheduling
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Index for scheduler to efficiently find due scheduled messages
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON messages (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'scheduled';
