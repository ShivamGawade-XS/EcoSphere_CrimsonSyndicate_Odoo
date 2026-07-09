-- ============================================================
-- 003_transactional_tables.sql
-- EcoSphere AI — Transactional Data Tables
-- ============================================================

-- ─── Carbon Transactions ──────────────────────────────────────
CREATE TABLE carbon_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id           UUID NOT NULL REFERENCES departments(id),
  emission_factor_id      UUID NOT NULL REFERENCES emission_factors(id),
  quantity                NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
  calculated_emission_kg  NUMERIC(14,4) NOT NULL,
  auto_calculated         BOOLEAN NOT NULL DEFAULT false,
  source_type             TEXT NOT NULL CHECK (source_type IN ('purchase','manufacturing','expense','fleet','other')),
  date                    DATE NOT NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_carbon_transactions_dept_date ON carbon_transactions(department_id, date DESC);
CREATE INDEX idx_carbon_transactions_org_date ON carbon_transactions(org_id, date DESC);

-- ─── CSR Activities ───────────────────────────────────────────
CREATE TABLE csr_activities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  category_id       UUID REFERENCES categories(id),
  date              DATE NOT NULL,
  points_reward     INT NOT NULL DEFAULT 0 CHECK (points_reward >= 0),
  description       TEXT,
  max_participants  INT,
  department_id     UUID REFERENCES departments(id),
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','completed','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Employee Participations (CSR) ────────────────────────────
CREATE TABLE employee_participations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  employee_id       UUID NOT NULL REFERENCES profiles(id),
  activity_id       UUID NOT NULL REFERENCES csr_activities(id),
  proof_url         TEXT,
  approval_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (approval_status IN ('pending','approved','rejected')),
  points_earned     INT NOT NULL DEFAULT 0,
  completion_date   DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, activity_id)
);

-- ─── Challenges ───────────────────────────────────────────────
CREATE TABLE challenges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  category_id         UUID REFERENCES categories(id),
  xp_reward           INT NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  difficulty          TEXT NOT NULL DEFAULT 'medium'
                        CHECK (difficulty IN ('easy','medium','hard','expert')),
  evidence_required   BOOLEAN NOT NULL DEFAULT false,
  deadline            DATE,
  department_id       UUID REFERENCES departments(id),
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','active','under_review','completed','archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Challenge Participations ─────────────────────────────────
CREATE TABLE challenge_participations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  challenge_id      UUID NOT NULL REFERENCES challenges(id),
  employee_id       UUID NOT NULL REFERENCES profiles(id),
  progress          INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  proof_url         TEXT,
  approval_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (approval_status IN ('pending','approved','rejected')),
  xp_awarded        INT NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, employee_id)
);

-- ─── Policy Acknowledgements ──────────────────────────────────
CREATE TABLE policy_acknowledgements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  policy_id       UUID NOT NULL REFERENCES esg_policies(id),
  employee_id     UUID NOT NULL REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, employee_id)
);

-- ─── Audits ───────────────────────────────────────────────────
CREATE TABLE audits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  department_id   UUID NOT NULL REFERENCES departments(id),
  auditor_id      UUID REFERENCES profiles(id),
  scope           TEXT,
  scheduled_date  DATE NOT NULL,
  findings        TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Compliance Issues ────────────────────────────────────────
-- CRITICAL: owner_id and due_date are NOT NULL — enforced at DB level
CREATE TABLE compliance_issues (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  severity          TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','resolved','overdue')),
  owner_id          UUID NOT NULL REFERENCES profiles(id),   -- NON-NULLABLE
  due_date          DATE NOT NULL,                           -- NON-NULLABLE
  department_id     UUID REFERENCES departments(id),
  audit_id          UUID REFERENCES audits(id),
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_compliance_issues_updated_at
  BEFORE UPDATE ON compliance_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_compliance_issues_owner ON compliance_issues(owner_id);
CREATE INDEX idx_compliance_issues_due_date ON compliance_issues(due_date) WHERE status NOT IN ('resolved');

-- ─── Department Scores ────────────────────────────────────────
CREATE TABLE department_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  department_id   UUID NOT NULL REFERENCES departments(id),
  env_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (env_score BETWEEN 0 AND 100),
  social_score    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (social_score BETWEEN 0 AND 100),
  gov_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gov_score BETWEEN 0 AND 100),
  total_score     NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dept_scores_period ON department_scores(org_id, period_end DESC);

-- ─── Reward Redemptions ───────────────────────────────────────
CREATE TABLE reward_redemptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  reward_id     UUID NOT NULL REFERENCES rewards(id),
  employee_id   UUID NOT NULL REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','fulfilled','cancelled')),
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at  TIMESTAMPTZ
);

CREATE INDEX idx_redemptions_employee ON reward_redemptions(employee_id, redeemed_at DESC);
