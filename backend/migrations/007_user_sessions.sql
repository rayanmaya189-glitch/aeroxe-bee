-- 007_user_sessions.sql
-- Tracks active login sessions so users can view and revoke them.

CREATE TABLE IF NOT EXISTS user_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    user_type    VARCHAR(20) NOT NULL DEFAULT 'account',  -- 'account' or 'user'
    ip_address   VARCHAR(45) DEFAULT '',
    user_agent   TEXT DEFAULT '',
    token_hash   VARCHAR(64) NOT NULL,
    last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, revoked_at) WHERE revoked_at IS NULL;
