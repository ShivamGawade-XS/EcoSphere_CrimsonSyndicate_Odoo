-- ─── Migration 009: Immutable Audit Trail (CSRD Compliance) ──────────────────
-- Implements append-only audit logging for all ESG data mutations.
-- Compliant with CSRD audit trail requirements.

-- ── Audit Events Table (append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES organisations(id),
  table_name     text        NOT NULL,
  record_id      uuid        NOT NULL,
  event_type     text        NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id        uuid        NOT NULL REFERENCES auth.users(id),
  user_email     text        NOT NULL,
  user_role      text        NOT NULL,
  before_data    jsonb,
  after_data     jsonb,
  changed_fields text[],
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_events_org_table_idx
  ON audit_events(org_id, table_name, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_record_idx
  ON audit_events(record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_user_idx
  ON audit_events(user_id, created_at DESC);

-- ── RLS: Append-only — no UPDATE or DELETE ───────────────────────────────────
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Org members can SELECT their own audit events
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- INSERT via SECURITY DEFINER function only (deny direct insert from client)
CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT WITH CHECK (false);  -- clients cannot insert directly

-- Explicitly deny UPDATE and DELETE (belt + suspenders)
CREATE POLICY audit_events_no_update ON audit_events
  FOR UPDATE USING (false);

CREATE POLICY audit_events_no_delete ON audit_events
  FOR DELETE USING (false);

-- ── SECURITY DEFINER insert function ─────────────────────────────────────────
-- This is the ONLY allowed write path to audit_events.
CREATE OR REPLACE FUNCTION insert_audit_event(
  p_org_id       uuid,
  p_table_name   text,
  p_record_id    uuid,
  p_event_type   text,
  p_user_id      uuid,
  p_user_email   text,
  p_user_role    text,
  p_before_data  jsonb DEFAULT NULL,
  p_after_data   jsonb DEFAULT NULL,
  p_changed_fields text[] DEFAULT NULL,
  p_ip_address   inet DEFAULT NULL,
  p_user_agent   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO audit_events (
    org_id, table_name, record_id, event_type,
    user_id, user_email, user_role,
    before_data, after_data, changed_fields,
    ip_address, user_agent
  ) VALUES (
    p_org_id, p_table_name, p_record_id, p_event_type,
    p_user_id, p_user_email, p_user_role,
    p_before_data, p_after_data, p_changed_fields,
    p_ip_address, p_user_agent
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── Trigger function for audited tables ──────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    uuid;
  v_user_email text;
  v_user_role  text;
  v_org_id     uuid;
  v_before     jsonb := NULL;
  v_after      jsonb := NULL;
  v_changed    text[] := NULL;
  v_record_id  uuid;
BEGIN
  -- Get caller identity from auth context
  v_user_id := auth.uid();

  SELECT email, role, org_id
    INTO v_user_email, v_user_role, v_org_id
    FROM profiles
    WHERE id = v_user_id
    LIMIT 1;

  IF v_user_id IS NULL THEN
    -- System-level operation; skip audit
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Capture record ID
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_before := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    -- Compute changed fields
    SELECT array_agg(key)
      INTO v_changed
      FROM jsonb_each(v_before) b(key, val)
      WHERE b.val IS DISTINCT FROM v_after->b.key;
  END IF;

  -- Insert audit record (uses SECURITY DEFINER path)
  INSERT INTO audit_events (
    org_id, table_name, record_id, event_type,
    user_id, user_email, user_role,
    before_data, after_data, changed_fields
  ) VALUES (
    COALESCE(v_org_id, '00000000-0000-0000-0000-000000000000'),
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_user_id,
    COALESCE(v_user_email, 'system'),
    COALESCE(v_user_role, 'system'),
    v_before,
    v_after,
    v_changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach trigger to audited tables ─────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'carbon_transactions',
    'csr_activities',
    'audit_findings',
    'compliance_issues',
    'policies',
    'policy_acknowledgements',
    'rewards_redemptions'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS audit_trigger ON %I;
        CREATE TRIGGER audit_trigger
          AFTER INSERT OR UPDATE OR DELETE ON %I
          FOR EACH ROW EXECUTE FUNCTION log_audit_event();
      ', t, t);
    END IF;
  END LOOP;
END;
$$;

-- ── Data Integrity Checksums Table ───────────────────────────────────────────
-- Monthly SHA-256 hash of all ESG data for the org (tamper-evidence)
CREATE TABLE IF NOT EXISTS data_integrity_checksums (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES organisations(id),
  period      text        NOT NULL,   -- e.g. '2025-12'
  checksum    text        NOT NULL,   -- SHA-256 hex string
  record_count integer    NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid        REFERENCES auth.users(id),
  verified    boolean     DEFAULT false,
  UNIQUE (org_id, period)
);

ALTER TABLE data_integrity_checksums ENABLE ROW LEVEL SECURITY;

CREATE POLICY checksums_select ON data_integrity_checksums
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY checksums_insert ON data_integrity_checksums
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
