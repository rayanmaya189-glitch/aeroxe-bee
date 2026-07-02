-- Phase 1: Add users table for staff/admin panel users
-- Users are staff members who manage the system via admin panel
-- Accounts are customers/members who own Android devices and send SMS

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (staff/admin panel users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    avatar VARCHAR(512) DEFAULT '',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log for admin panel audit trail
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL DEFAULT '',
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) DEFAULT '',
    details TEXT DEFAULT '',
    ip_address VARCHAR(45) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Seed default admin user (password: admin123456)
-- bcrypt hash of 'admin123456'
INSERT INTO users (name, email, password_hash, role, status) VALUES
    ('Admin', 'admin@textbee.dev', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

COMMIT;
