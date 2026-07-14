-- AI configuration for template generation (smart AI feature)
CREATE TABLE IF NOT EXISTS ai_configs (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider      TEXT NOT NULL,          -- 'ollama', 'openai', 'anthropic', etc.
    label         TEXT NOT NULL,          -- user-friendly name (e.g. "Local Ollama")
    endpoint_url  TEXT NOT NULL,          -- API endpoint URL
    api_key       TEXT DEFAULT '',        -- encrypted or plain API key
    model         TEXT NOT NULL,          -- model name (e.g. "llama3", "gpt-4o-mini")
    is_active     BOOLEAN DEFAULT FALSE,  -- only one config can be active at a time
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Config change requests (maker-checker: staff/viewer proposes, admin approves)
CREATE TABLE IF NOT EXISTS config_change_requests (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_name TEXT NOT NULL DEFAULT '',
    config_type     TEXT NOT NULL,          -- 'ai_config'
    action          TEXT NOT NULL,          -- 'create', 'update', 'delete'
    config_id       TEXT,                    -- NULL for create
    payload         JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_name TEXT NOT NULL DEFAULT '',
    review_notes    TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

-- Ensure only one active ai_config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_configs(is_active) WHERE is_active = TRUE;
