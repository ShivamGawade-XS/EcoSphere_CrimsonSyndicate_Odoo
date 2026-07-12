/**
 * EcoSphere AI — Pure ESG Scoring Engine
 *
 * This module contains ONLY pure functions with no side effects.
 * It has zero dependencies on React, Supabase, or any browser API.
 * All inputs and outputs are plain TypeScript values — making this
 * module trivially testable in any JS environment (Node, Deno, Vitest).
 *
 * @module scoring/engine
 */

import {
  SCORE_THRESHOLDS,
  SEVERITY_PENALTIES,
  MAX_ISSUE_PENALTY,
  MAX_ENV_DEDUCTION,
  TRAJECTORY_PENALTY_SCALE,
  MAX_DEDUCTION_PER_GOAL,
  SOCIAL_WEIGHTS,
  GOVERNANCE_WEIGHTS,
  FINDING_PENALTY_PER_UNRESOLVED,
  CRITICAL_FINDING_MULTIPLIER,
  GRI_DISCLOSURE_MAP,
} from './constants'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoringInput {
  /** Environmental goals with target, actual, and deadline information */
  goals: Array<{
    target:   number
    actual:   number
    deadline: Date
  }>
  /** Carbon emission records by month and scope */
  emissions: Array<{
    amount: number
    month:  Date
    scope:  1 | 2 | 3
  }>
  /** CSR activity participation records */
  csrActivities: Array<{
    participants:  number
    totalEligible: number
    approved:      boolean
  }>
  /** Employee training completion records */
  trainingRecords: Array<{
    completed: boolean
    userId:    string
  }>
  /** Diversity score (0–100) provided externally */
  diversityScore: number
  /** Policy acknowledgement records */
  policies: Array<{
    acknowledged: number
    total:        number
    status:       'active' | 'draft' | 'archived'
  }>
  /** Audit records with finding counts */
  audits: Array<{
    findings: number
    critical: number
    resolved: number
  }>
  /** Compliance issue records */
  complianceIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    resolved: boolean
  }>
  /** Configurable scoring weights (must sum to 100) */
  weights: {
    environmental: number
    social:        number
    governance:    number
  }
}

export interface ScoreBreakdown {
  environmental: {
    score:      number
    deductions: Array<{ reason: string; points: number }>
  }
  social: {
    score:      number
    components: { csr: number; training: number; diversity: number }
  }
  governance: {
    score:      number
    components: { policies: number; audits: number; issues: number }
  }
  overall: number
  grade:   'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F'
  trend:   'improving' | 'stable' | 'declining'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Clamp a number between a min and max bound */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Round to 1 decimal place */
function r1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Safe division — returns 0 if denominator is 0 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  const result = numerator / denominator
  return isNaN(result) || !isFinite(result) ? 0 : result
}

/** Return today at midnight (for consistent date comparisons) */
function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Compute the expected completion fraction for a goal based on
 * linear trajectory from now to deadline.
 *
 * If the deadline is in the future:
 *   expected = elapsed_days / total_days   (how far along we should be)
 * If the deadline is past, expected = 1.0 (should be 100% done)
 * If the deadline is in the future by 0 days, expected = 1.0
 */
function expectedCompletion(deadline: Date): number {
  const now = today()
  if (deadline <= now) return 1.0   // past deadline — expect 100% done

  // We don't have a start date, so assume goals started at the beginning of
  // the current calendar year and end at the deadline. This gives a fair
  // trajectory for annual environmental goals.
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const totalDays   = Math.max(1, (deadline.getTime() - yearStart.getTime()) / 86_400_000)
  const elapsedDays = Math.max(0, (now.getTime() - yearStart.getTime()) / 86_400_000)
  return clamp(elapsedDays / totalDays, 0, 1)
}

/** Derive letter grade from a score */
function toGrade(score: number): ScoreBreakdown['grade'] {
  const entries = Object.entries(SCORE_THRESHOLDS)
    .sort(([, a], [, b]) => b - a) // descending by threshold

  for (const [grade, threshold] of entries) {
    if (score >= threshold) return grade as ScoreBreakdown['grade']
  }
  return 'F'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public Exports
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the Environmental score (0–100).
 *
 * Formula:
 *   score = 100 − Σ(deduction per goal behind trajectory)
 *
 * Each goal's deduction is calculated as:
 *   gap = expectedCompletion(deadline) − (actual / target)
 *   deduction = gap × TRAJECTORY_PENALTY_SCALE × 100   (if gap > 0)
 *   deduction is capped at MAX_DEDUCTION_PER_GOAL
 *
 * Future goals (deadline more than 1 full year away) are excluded.
 * Score is floored at 0.
 *
 * GRI reference: {@link GRI_DISCLOSURE_MAP.environmental}
 */
export function calculateEnvironmentalScore(
  input: Pick<ScoringInput, 'goals'>
): { score: number; deductions: Array<{ reason: string; points: number }> } {
  if (input.goals.length === 0) {
    return { score: 0, deductions: [{ reason: 'No environmental goals defined', points: 100 }] }
  }

  const now = today()
  const deductions: Array<{ reason: string; points: number }> = []
  let totalDeduction = 0

  for (let i = 0; i < input.goals.length; i++) {
    const { target, actual, deadline } = input.goals[i]

    // Skip goals with invalid data
    if (isNaN(target) || isNaN(actual) || target <= 0) continue

    // Skip goals that haven't started yet (deadline > 1 year from now)
    const daysToDeadline = (deadline.getTime() - now.getTime()) / 86_400_000
    if (daysToDeadline > 365) continue

    const completionFraction = clamp(safeDivide(actual, target), 0, 1)
    const expected           = expectedCompletion(deadline)
    const gap                = expected - completionFraction

    if (gap > 0) {
      const raw       = gap * TRAJECTORY_PENALTY_SCALE * 100
      const deduction = Math.min(raw, MAX_DEDUCTION_PER_GOAL)
      totalDeduction += deduction
      deductions.push({
        reason: `Goal ${i + 1}: ${(completionFraction * 100).toFixed(0)}% complete, expected ${(expected * 100).toFixed(0)}%`,
        points: r1(deduction),
      })
    }
  }

  const score = clamp(100 - totalDeduction, 0, 100)
  return { score: r1(score), deductions }
}

/**
 * Calculate the Social score (0–100).
 *
 * Formula:
 *   Social = (CSR Rate × 40) + (Training Rate × 30) + (Diversity × 30)
 *
 * Where:
 *   CSR Rate      = approved_participants / total_eligible (active activities only)
 *   Training Rate = completed_records / total_records
 *   Diversity     = diversityScore / 100
 *
 * GRI references: {@link GRI_DISCLOSURE_MAP.csr}, {@link GRI_DISCLOSURE_MAP.training},
 *   {@link GRI_DISCLOSURE_MAP.diversity}
 */
export function calculateSocialScore(
  input: Pick<ScoringInput, 'csrActivities' | 'trainingRecords' | 'diversityScore'>
): { score: number; components: { csr: number; training: number; diversity: number } } {
  // CSR component: only count approved activities
  const approvedActivities = input.csrActivities.filter(a => a.approved)
  const totalParticipants  = approvedActivities.reduce((s, a) => s + Math.max(0, a.participants), 0)
  const totalEligible      = approvedActivities.reduce((s, a) => s + Math.max(0, a.totalEligible), 0)
  const csrRate            = clamp(safeDivide(totalParticipants, totalEligible), 0, 1)

  // Training component
  const completedTraining = input.trainingRecords.filter(r => r.completed).length
  const trainingRate      = clamp(safeDivide(completedTraining, input.trainingRecords.length), 0, 1)

  // Diversity component (external score, already 0-100)
  const diversityNorm = clamp(isNaN(input.diversityScore) ? 0 : input.diversityScore, 0, 100) / 100

  const csrPoints       = csrRate       * SOCIAL_WEIGHTS.csr
  const trainingPoints  = trainingRate  * SOCIAL_WEIGHTS.training
  const diversityPoints = diversityNorm * SOCIAL_WEIGHTS.diversity

  const score = clamp(csrPoints + trainingPoints + diversityPoints, 0, 100)

  return {
    score: r1(score),
    components: {
      csr:       r1(csrPoints),
      training:  r1(trainingPoints),
      diversity: r1(diversityPoints),
    },
  }
}

/**
 * Calculate the Governance score (0–100).
 *
 * Formula:
 *   Governance = (Policy Rate × 40) + (Audit Rate × 30) + (30 − issue penalties)
 *
 * Where:
 *   Policy Rate  = acknowledged / total  (active policies only; archived excluded)
 *   Audit Rate   = resolved_findings / total_findings  (0 findings → 100%)
 *   Issue penalty = Σ(SEVERITY_PENALTIES[severity])  for unresolved issues
 *                   capped at MAX_ISSUE_PENALTY
 *
 * GRI references: {@link GRI_DISCLOSURE_MAP.governance}
 */
export function calculateGovernanceScore(
  input: Pick<ScoringInput, 'policies' | 'audits' | 'complianceIssues'>
): { score: number; components: { policies: number; audits: number; issues: number } } {
  // Policy component — archived policies are excluded from calculation
  const activePolicies    = input.policies.filter(p => p.status === 'active')
  const totalAcknowledged = activePolicies.reduce((s, p) => s + Math.max(0, p.acknowledged), 0)
  const totalPolicies     = activePolicies.reduce((s, p) => s + Math.max(0, p.total), 0)
  const policyRate        = clamp(safeDivide(totalAcknowledged, totalPolicies), 0, 1)
  const policyPoints      = policyRate * GOVERNANCE_WEIGHTS.policies

  // Audit component — audits with 0 findings count as perfectly resolved
  const totalFindings  = input.audits.reduce((s, a) => s + Math.max(0, a.findings), 0)
  const totalResolved  = input.audits.reduce((s, a) => s + Math.max(0, a.resolved), 0)
  const criticalUnresolved = input.audits.reduce(
    (s, a) => s + Math.max(0, a.critical - Math.min(a.critical, a.resolved)),
    0
  )
  let auditRate = totalFindings === 0
    ? 1.0
    : clamp(safeDivide(totalResolved, totalFindings), 0, 1)

  // Apply critical finding multiplier penalty
  const criticalPenaltyPoints = criticalUnresolved * FINDING_PENALTY_PER_UNRESOLVED * CRITICAL_FINDING_MULTIPLIER
  const auditPoints = clamp(
    auditRate * GOVERNANCE_WEIGHTS.audits - criticalPenaltyPoints,
    0,
    GOVERNANCE_WEIGHTS.audits
  )

  // Issue component — start at 30 and subtract penalties for unresolved issues
  const issuePenalty = input.complianceIssues
    .filter(i => !i.resolved)
    .reduce((total, issue) => {
      const pen = isNaN(SEVERITY_PENALTIES[issue.severity]) ? 0 : SEVERITY_PENALTIES[issue.severity]
      return total + pen
    }, 0)

  const cappedPenalty = Math.min(issuePenalty, MAX_ISSUE_PENALTY)
  const issuePoints   = Math.max(0, GOVERNANCE_WEIGHTS.issues - cappedPenalty)

  const score = clamp(policyPoints + auditPoints + issuePoints, 0, 100)

  return {
    score: r1(score),
    components: {
      policies: r1(policyPoints),
      audits:   r1(auditPoints),
      issues:   r1(issuePoints),
    },
  }
}

/**
 * Calculate the full ESG score breakdown including overall score, grade, and trend.
 *
 * @param input - Complete scoring input data
 * @returns Full score breakdown with all components, grade, and trend direction
 * @throws {Error} if weights do not sum to 100 (±1 tolerance)
 *
 * Overall formula:
 *   Overall = (Env × w.environmental + Social × w.social + Gov × w.governance) / 100
 */
export function calculateFullScore(input: ScoringInput): ScoreBreakdown {
  // Validate weights
  const weightSum = input.weights.environmental + input.weights.social + input.weights.governance
  if (Math.abs(weightSum - 100) > 1) {
    throw new Error(
      `ESG weights must sum to 100, got ${weightSum}. ` +
      `(environmental: ${input.weights.environmental}, social: ${input.weights.social}, governance: ${input.weights.governance})`
    )
  }

  const envResult = calculateEnvironmentalScore({ goals: input.goals })
  const socResult = calculateSocialScore({
    csrActivities:   input.csrActivities,
    trainingRecords: input.trainingRecords,
    diversityScore:  input.diversityScore,
  })
  const govResult = calculateGovernanceScore({
    policies:         input.policies,
    audits:           input.audits,
    complianceIssues: input.complianceIssues,
  })

  const overall = clamp(
    (envResult.score * input.weights.environmental +
     socResult.score * input.weights.social +
     govResult.score * input.weights.governance) / 100,
    0,
    100
  )

  // Trend: derived from the gap between governance (lagging indicator) and environmental (leading)
  const spread = envResult.score - govResult.score
  const trend: ScoreBreakdown['trend'] =
    overall >= 70 && spread > -5 ? 'improving'
    : overall >= 50              ? 'stable'
    :                              'declining'

  return {
    environmental: envResult,
    social:        { score: socResult.score, components: socResult.components },
    governance:    { score: govResult.score, components: govResult.components },
    overall:       r1(overall),
    grade:         toGrade(overall),
    trend,
  }
}

/**
 * Generate human-readable explanations for a score breakdown.
 * Returns an array of insight strings for display in the UI or reports.
 * Each string includes the relevant GRI disclosure code.
 *
 * @param breakdown - Output from calculateFullScore()
 * @returns Array of explanation strings sorted by impact (highest deduction first)
 */
export function explainScore(breakdown: ScoreBreakdown): string[] {
  const lines: string[] = []

  // Overall summary
  lines.push(
    `Overall ESG Score: ${breakdown.overall}/100 (Grade ${breakdown.grade}) — Trend: ${breakdown.trend}.`
  )

  // Environmental
  lines.push(
    `Environmental (${GRI_DISCLOSURE_MAP.environmental}): ${breakdown.environmental.score}/100.`
  )
  for (const d of breakdown.environmental.deductions) {
    lines.push(`  ⚠ −${d.points} pts — ${d.reason}`)
  }
  if (breakdown.environmental.deductions.length === 0) {
    lines.push('  ✓ All environmental goals are on track.')
  }

  // Social
  const { csr, training, diversity } = breakdown.social.components
  lines.push(`Social (${GRI_DISCLOSURE_MAP.social}): ${breakdown.social.score}/100.`)
  lines.push(`  • CSR Participation (${GRI_DISCLOSURE_MAP.csr}): ${csr.toFixed(1)} / ${SOCIAL_WEIGHTS.csr} pts`)
  lines.push(`  • Training Completion (${GRI_DISCLOSURE_MAP.training}): ${training.toFixed(1)} / ${SOCIAL_WEIGHTS.training} pts`)
  lines.push(`  • Diversity Index (${GRI_DISCLOSURE_MAP.diversity}): ${diversity.toFixed(1)} / ${SOCIAL_WEIGHTS.diversity} pts`)

  // Governance
  const { policies, audits, issues } = breakdown.governance.components
  lines.push(`Governance (${GRI_DISCLOSURE_MAP.governance}): ${breakdown.governance.score}/100.`)
  lines.push(`  • Policy Acknowledgements (${GRI_DISCLOSURE_MAP.policies}): ${policies.toFixed(1)} / ${GOVERNANCE_WEIGHTS.policies} pts`)
  lines.push(`  • Audit Resolution Rate (${GRI_DISCLOSURE_MAP.audits}): ${audits.toFixed(1)} / ${GOVERNANCE_WEIGHTS.audits} pts`)
  lines.push(`  • Compliance Issues (${GRI_DISCLOSURE_MAP.compliance_issues}): ${issues.toFixed(1)} / ${GOVERNANCE_WEIGHTS.issues} pts`)

  return lines
}

/**
 * Simulate the effect of hypothetical changes on the ESG score.
 *
 * Merges `hypothetical` partial overrides on top of `input` and computes
 * two score breakdowns. The `delta` is the overall score difference.
 *
 * @param input - Baseline scoring input
 * @param hypothetical - Partial overrides to apply for the simulation
 * @returns { before, after, delta } where delta = after.overall − before.overall
 *
 * @example
 * // What if we resolved all critical compliance issues?
 * const result = simulateScore(input, {
 *   complianceIssues: input.complianceIssues.map(i => ({ ...i, resolved: true }))
 * })
 * console.log(`Resolving all issues would add ${result.delta.toFixed(1)} points`)
 */
export function simulateScore(
  input: ScoringInput,
  hypothetical: Partial<ScoringInput>
): { before: ScoreBreakdown; after: ScoreBreakdown; delta: number } {
  const before = calculateFullScore(input)
  const merged: ScoringInput = { ...input, ...hypothetical }
  const after  = calculateFullScore(merged)
  return {
    before,
    after,
    delta: r1(after.overall - before.overall),
  }
}
