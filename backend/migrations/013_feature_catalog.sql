-- 013_feature_catalog.sql
-- Global feature catalog that admins manage and plans auto-suggest from.

CREATE TABLE IF NOT EXISTS feature_catalog (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL DEFAULT 'general',
    sort_order  INT NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_catalog_name ON feature_catalog(name);
CREATE INDEX IF NOT EXISTS idx_feature_catalog_category ON feature_catalog(category);
CREATE INDEX IF NOT EXISTS idx_feature_catalog_active ON feature_catalog(active);

-- Seed default feature catalog entries
INSERT INTO feature_catalog (name, category, sort_order) VALUES
  ('1K SMS/month', 'quota', 1),
  ('5K SMS/month', 'quota', 2),
  ('10K SMS/month', 'quota', 3),
  ('50K SMS/month', 'quota', 4),
  ('100K SMS/month', 'quota', 5),
  ('500K SMS/month', 'quota', 6),
  ('1M SMS/month', 'quota', 7),
  ('50 daily SMS', 'quota', 8),
  ('2K daily SMS', 'quota', 9),
  ('10K daily SMS', 'quota', 10),
  ('20K daily SMS', 'quota', 11),
  ('50K daily SMS', 'quota', 12),
  ('200K daily SMS', 'quota', 13),
  ('1 device connection', 'devices', 14),
  ('5 device connections', 'devices', 15),
  ('10 device connections', 'devices', 16),
  ('25 device connections', 'devices', 17),
  ('50 device connections', 'devices', 18),
  ('Fastest delivery routing', 'routing', 19),
  ('Lowest-cost routing', 'routing', 20),
  ('Highest-reliability routing', 'routing', 21),
  ('Geo-affinity routing', 'routing', 22),
  ('Basic analytics', 'analytics', 23),
  ('Advanced analytics', 'analytics', 24),
  ('Full analytics suite', 'analytics', 25),
  ('Community support', 'support', 26),
  ('Priority support', 'support', 27),
  ('Dedicated support', 'support', 28),
  ('Dedicated support & custom SLA', 'support', 29),
  ('Shared device pool', 'infrastructure', 30),
  ('Dedicated device pool', 'infrastructure', 31),
  ('Custom webhooks', 'integration', 32),
  ('OTP system', 'integration', 33),
  ('API access', 'integration', 34),
  ('Cost & profit tracking', 'analytics', 35),
  ('Custom integrations', 'integration', 36)
ON CONFLICT (name) DO NOTHING;
