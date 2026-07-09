-- ============================================================
-- 001_core_tables.sql
-- EcoSphere AI — Core Tables
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Organizations ────────────────────────────────────────────
CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  logo_url              TEXT,
  env_weight            INT NOT NULL DEFAULT 40 CHECK (env_weight BETWEEN 0 AND 100),
  social_weight         INT NOT NULL DEFAULT 30 CHECK (social_weight BETWEEN 0 AND 100),
  gov_weight            INT NOT NULL DEFAULT 30 CHECK (gov_weight BETWEEN 0 AND 100),
  auto_emission_calc    BOOLEAN NOT NULL DEFAULT false,
  evidence_required     BOOLEAN NOT NULL DEFAULT false,
  badge_auto_award      BOOLEAN NOT NULL DEFAULT true,
  notify_in_app         BOOLEAN NOT NULL DEFAULT true,
  notify_email          BOOLEAN NOT NULL DEFAULT false,
  notify_email_admin    TEXT,
  policy_reminder_days  INT NOT NULL DEFAULT 3,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum CHECK (env_weight + social_weight + gov_weight = 100)
);

-- ─── Profiles (extends auth.users) ───────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('admin','executive','esg_manager','dept_head','employee')),
  org_id        UUID REFERENCES organizations(id),
  department_id UUID,  -- FK added after departments table
  total_xp      INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  total_points  INT NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Departments ──────────────────────────────────────────────
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  parent_id       UUID REFERENCES departments(id),
  head_id         UUID REFERENCES profiles(id),
  employee_count  INT NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

-- Add FK from profiles to departments
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_department_id_fkey 
  FOREIGN KEY (department_id) REFERENCES departments(id);

-- ─── Categories ───────────────────────────────────────────────
CREATE TABLE categories (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL CHECK (type IN ('csr_activity','challenge')),
  status  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  UNIQUE (org_id, name, type)
);

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  recipient_id  UUID NOT NULL REFERENCES profiles(id),
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT false,
  action_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read, created_at DESC);

-- ─── XP Transactions ─────────────────────────────────────────
CREATE TABLE xp_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  employee_id   UUID NOT NULL REFERENCES profiles(id),
  amount        INT NOT NULL,
  source_type   TEXT NOT NULL CHECK (source_type IN ('challenge','csr_activity','badge','manual')),
  source_id     UUID,
  description   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_transactions_employee ON xp_transactions(employee_id, created_at DESC);

-- ─── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
