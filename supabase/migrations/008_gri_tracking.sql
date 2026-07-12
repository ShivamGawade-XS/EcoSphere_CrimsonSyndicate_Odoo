-- ─── Migration 008: GRI Tracking ─────────────────────────────────────────────
-- Stores GRI disclosure status per org, enables coverage tracking and reporting.

-- ── GRI Disclosure Status Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gri_disclosure_status (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  gri_code     text        NOT NULL,                          -- e.g. 'GRI 305-1'
  field_key    text        NOT NULL,                          -- e.g. 'scope1_emissions'
  status       text        NOT NULL DEFAULT 'not_reported'
                           CHECK (status IN ('reported', 'partial', 'not_reported')),
  data_source  text,                                          -- e.g. 'carbon_transactions'
  current_value text,                                         -- Human-readable value snapshot
  notes        text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid        REFERENCES auth.users(id),
  UNIQUE (org_id, gri_code)
);

CREATE INDEX IF NOT EXISTS gri_status_org_idx ON gri_disclosure_status(org_id, status);

-- ── RLS: Only org members can view/update their own GRI status ────────────────
ALTER TABLE gri_disclosure_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY gri_status_select ON gri_disclosure_status
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY gri_status_insert ON gri_disclosure_status
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY gri_status_update ON gri_disclosure_status
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ── GRI Coverage Summary View ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW gri_coverage_summary AS
SELECT
  org_id,
  COUNT(*)                                                       AS total_disclosures,
  COUNT(*) FILTER (WHERE status = 'reported')                    AS reported,
  COUNT(*) FILTER (WHERE status = 'partial')                     AS partial,
  COUNT(*) FILTER (WHERE status = 'not_reported')                AS not_reported,
  ROUND(
    (
      COUNT(*) FILTER (WHERE status = 'reported') +
      COUNT(*) FILTER (WHERE status = 'partial') * 0.5
    ) * 100.0 / NULLIF(COUNT(*), 0),
    1
  )                                                              AS coverage_pct,
  MAX(last_updated)                                              AS last_updated
FROM gri_disclosure_status
GROUP BY org_id;
