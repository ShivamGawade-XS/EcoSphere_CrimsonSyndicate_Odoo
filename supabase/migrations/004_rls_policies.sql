-- ============================================================
-- 004_rls_policies.sql
-- EcoSphere AI — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE csr_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get current user's org_id ───────────────
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Helper function: get current user's role ─────────────────
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Helper function: is admin or esg_manager ─────────────────
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin','esg_manager') FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Org-scoped SELECT policies ───────────────────────────────
-- Pattern: users can see all data in their org

CREATE POLICY "org_members_see_org" ON organizations
  FOR SELECT USING (id = auth_org_id());

CREATE POLICY "org_members_see_profiles" ON profiles
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_depts" ON departments
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_categories" ON categories
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_emission_factors" ON emission_factors
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_goals" ON environmental_goals
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_carbon_tx" ON carbon_transactions
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_policies" ON esg_policies
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_acknowledgements" ON policy_acknowledgements
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_audits" ON audits
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_issues" ON compliance_issues
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_csr" ON csr_activities
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_participations" ON employee_participations
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_challenges" ON challenges
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_challenge_participations" ON challenge_participations
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_badges" ON badges
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_badge_awards" ON badge_awards
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_rewards" ON rewards
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_redemptions" ON reward_redemptions
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "org_members_see_scores" ON department_scores
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "own_notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid() AND org_id = auth_org_id());

CREATE POLICY "own_xp_transactions" ON xp_transactions
  FOR SELECT USING (org_id = auth_org_id());

-- ─── Evidence Requirement RLS ─────────────────────────────────
-- Blocks approval of CSR participation without proof when evidence_required is ON
CREATE OR REPLACE FUNCTION check_evidence_required()
RETURNS TRIGGER AS $$
DECLARE
  ev_required BOOLEAN;
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.proof_url IS NULL THEN
    SELECT evidence_required INTO ev_required
    FROM organizations
    WHERE id = NEW.org_id;
    
    IF ev_required THEN
      RAISE EXCEPTION 'Proof of participation is required before approval.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_evidence_requirement
  BEFORE UPDATE ON employee_participations
  FOR EACH ROW EXECUTE FUNCTION check_evidence_required();

CREATE TRIGGER enforce_challenge_evidence_requirement
  BEFORE UPDATE ON challenge_participations
  FOR EACH ROW EXECUTE FUNCTION check_evidence_required();
