-- 012_contact_submissions.sql
-- Stores submissions from the Contact Sales form on the landing page.

CREATE TABLE IF NOT EXISTS contact_submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    company       VARCHAR(255) DEFAULT '',
    phone         VARCHAR(50)  DEFAULT '',
    plan_interest VARCHAR(100) DEFAULT '',
    message       TEXT NOT NULL,
    status        VARCHAR(50)  NOT NULL DEFAULT 'new',  -- new, contacted, converted, closed
    notes         TEXT DEFAULT '',
    ip_address    VARCHAR(45)  DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);
