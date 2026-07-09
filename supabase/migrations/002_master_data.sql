-- ============================================================
-- 002_master_data.sql
-- EcoSphere AI — Master Data Tables
-- ============================================================

-- ─── Emission Factors ─────────────────────────────────────────
CREATE TABLE emission_factors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('purchase','manufacturing','expense','fleet','other')),
  factor_value  NUMERIC(12,6) NOT NULL CHECK (factor_value > 0),
  unit          TEXT NOT NULL,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Product ESG Profiles ─────────────────────────────────────
CREATE TABLE product_esg_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  emission_factor   NUMERIC(12,6),
  recyclability     INT CHECK (recyclability BETWEEN 0 AND 100),
  social_impact     TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Environmental Goals ──────────────────────────────────────
CREATE TABLE environmental_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  title           TEXT NOT NULL,
  description     TEXT,
  target_value    NUMERIC(14,2) NOT NULL CHECK (target_value > 0),
  current_value   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit            TEXT NOT NULL,
  start_date      DATE NOT NULL,
  deadline        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft','active','completed','missed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ESG Policies ─────────────────────────────────────────────
CREATE TABLE esg_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN ('environmental','social','governance')),
  version         TEXT NOT NULL DEFAULT '1.0',
  effective_date  DATE NOT NULL,
  review_date     DATE,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Badges ───────────────────────────────────────────────────
CREATE TABLE badges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  icon                TEXT NOT NULL DEFAULT '🏆',
  unlock_rule_type    TEXT NOT NULL
                        CHECK (unlock_rule_type IN ('xp_threshold','challenges_completed','csr_activities_completed')),
  unlock_rule_value   INT NOT NULL CHECK (unlock_rule_value > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Badge Awards ─────────────────────────────────────────────
CREATE TABLE badge_awards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  badge_id      UUID NOT NULL REFERENCES badges(id),
  employee_id   UUID NOT NULL REFERENCES profiles(id),
  awarded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by    UUID REFERENCES profiles(id),  -- NULL = auto-awarded
  UNIQUE (badge_id, employee_id)
);

-- ─── Rewards ──────────────────────────────────────────────────
CREATE TABLE rewards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  points_required INT NOT NULL CHECK (points_required > 0),
  stock           INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
