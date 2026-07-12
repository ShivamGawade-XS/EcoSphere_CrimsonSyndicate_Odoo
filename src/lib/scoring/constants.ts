/**
 * EcoSphere AI — Scoring Engine Constants
 *
 * Centralised configuration for grade thresholds, severity penalties,
 * and GRI 2021 disclosure cross-references used by the scoring engine.
 *
 * @module scoring/constants
 */

// ─── Grade Thresholds ─────────────────────────────────────────────────────────

/**
 * Minimum score required to achieve each letter grade.
 * Values are inclusive lower bounds (score >= threshold → grade).
 */
export const SCORE_THRESHOLDS = {
  'A+': 90,
  'A':  80,
  'B+': 70,
  'B':  60,
  'C':  50,
  'D':  40,
  'F':  0,
} as const

export type Grade = keyof typeof SCORE_THRESHOLDS

// ─── Severity Penalties ───────────────────────────────────────────────────────

/**
 * Points deducted from the governance score per *unresolved* compliance issue
 * at each severity level. Resolved issues deduct 0 points.
 */
export const SEVERITY_PENALTIES: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  critical: 20,
  high:     10,
  medium:    5,
  low:       2,
} as const

/** Maximum governance deduction from compliance issues (floor protection) */
export const MAX_ISSUE_PENALTY = 30

// ─── Environmental Goal Deductions ───────────────────────────────────────────

/**
 * Points deducted per goal that is behind its expected trajectory.
 * The further behind, the larger the deduction (scaled linearly).
 *
 * trajectory_gap = expected_completion% - actual_completion%
 * deduction = gap * TRAJECTORY_PENALTY_SCALE   (capped at MAX_DEDUCTION_PER_GOAL)
 */
export const TRAJECTORY_PENALTY_SCALE = 0.5   // 1% behind → 0.5 pts
export const MAX_DEDUCTION_PER_GOAL   = 20    // never lose more than 20 pts per goal
export const MAX_ENV_DEDUCTION        = 100   // environmental floor is 0

// ─── Audit Score Deduction ────────────────────────────────────────────────────

/**
 * Points deducted from the 30-point audit component per *unresolved* finding.
 * Audits with 100% findings resolved deduct nothing.
 */
export const FINDING_PENALTY_PER_UNRESOLVED = 3
export const CRITICAL_FINDING_MULTIPLIER    = 2  // critical findings hurt twice as much

// ─── Social Score Component Weights ──────────────────────────────────────────

export const SOCIAL_WEIGHTS = {
  csr:       40,
  training:  30,
  diversity: 30,
} as const

// ─── Governance Score Component Weights ──────────────────────────────────────

export const GOVERNANCE_WEIGHTS = {
  policies: 40,
  audits:   30,
  issues:   30, // starts at 30 and penalties are subtracted
} as const

// ─── GRI 2021 Disclosure Cross-Reference Map ─────────────────────────────────

/**
 * Maps each ESG score component to its corresponding GRI 2021 disclosure code.
 * Used by explainScore() to surface compliance cross-references.
 *
 * @see https://www.globalreporting.org/standards/
 */
export const GRI_DISCLOSURE_MAP = {
  // Environmental
  environmental:        'GRI 305 (Emissions)',
  env_goals:            'GRI 305-5 (Reduction of GHG Emissions)',
  env_scope1:           'GRI 305-1 (Direct Scope 1 Emissions)',
  env_scope2:           'GRI 305-2 (Indirect Scope 2 Emissions)',
  env_scope3:           'GRI 305-3 (Other Indirect Scope 3 Emissions)',

  // Social
  social:               'GRI 400 (Social Standards)',
  csr:                  'GRI 413 (Local Communities)',
  training:             'GRI 404-1 (Training & Education)',
  diversity:            'GRI 405-1 (Diversity & Equal Opportunity)',

  // Governance
  governance:           'GRI 2-9 (Governance Structure)',
  policies:             'GRI 2-23 (Policy Commitments)',
  audits:               'GRI 2-25 (Processes to Remediate Negative Impacts)',
  compliance_issues:    'GRI 2-27 (Compliance with Laws and Regulations)',
} as const

export type GRIComponent = keyof typeof GRI_DISCLOSURE_MAP
