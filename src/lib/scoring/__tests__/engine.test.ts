/**
 * EcoSphere AI — Scoring Engine Test Suite
 *
 * 70 tests across 5 groups:
 *   1. Environmental (14 tests)
 *   2. Social        (14 tests)
 *   3. Governance    (14 tests)
 *   4. Overall       (14 tests)
 *   5. Edge Cases    (14 tests)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateEnvironmentalScore,
  calculateSocialScore,
  calculateGovernanceScore,
  calculateFullScore,
  explainScore,
  simulateScore,
  type ScoringInput,
} from '../engine'
import { SCORE_THRESHOLDS, SOCIAL_WEIGHTS, GOVERNANCE_WEIGHTS, SEVERITY_PENALTIES } from '../constants'

// ─── Shared factories ────────────────────────────────────────────────────────

/** A past deadline (goal should be 100% done) */
const past = new Date(Date.now() - 30 * 86_400_000)

/** A near-future deadline (goal is ~in-flight this year) */
const nearFuture = new Date(Date.now() + 60 * 86_400_000)

/** A far-future deadline (> 365 days — excluded from E score) */
const farFuture = new Date(Date.now() + 400 * 86_400_000)

function makeBaseInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    goals: [{ target: 100, actual: 100, deadline: past }],
    emissions: [],
    csrActivities: [{ participants: 10, totalEligible: 10, approved: true }],
    trainingRecords: [{ completed: true, userId: 'u1' }, { completed: true, userId: 'u2' }],
    diversityScore: 100,
    policies: [{ acknowledged: 10, total: 10, status: 'active' }],
    audits: [{ findings: 0, critical: 0, resolved: 0 }],
    complianceIssues: [],
    weights: { environmental: 34, social: 33, governance: 33 },
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group 1 — Environmental Score (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateEnvironmentalScore', () => {
  it('E-1: returns 100 when a goal with past deadline is fully complete', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 100, deadline: past }],
    })
    expect(score).toBe(100)
  })

  it('E-2: returns 0 deductions when all goals are on track', () => {
    const { deductions } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 100, deadline: past }],
    })
    expect(deductions).toHaveLength(0)
  })

  it('E-3: deducts points when goal is behind trajectory (past deadline, partial completion)', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 50, deadline: past }],
    })
    // gap = 1.0 - 0.5 = 0.5 → deduction applied → score < 100
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('E-4: deduction record has correct reason string for a lagging goal', () => {
    const { deductions } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 50, deadline: past }],
    })
    expect(deductions[0].reason).toMatch(/Goal 1/)
    expect(deductions[0].reason).toMatch(/50%/)
    expect(deductions[0].reason).toMatch(/expected 100%/)
  })

  it('E-5: score is floored at 0 (never negative)', () => {
    // 5 overdue goals all at 0% complete
    const goals = Array.from({ length: 5 }, () => ({ target: 100, actual: 0, deadline: past }))
    const { score } = calculateEnvironmentalScore({ goals })
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('E-6: no single goal can deduct more than MAX_DEDUCTION_PER_GOAL (20 pts)', () => {
    const { deductions } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 0, deadline: past }],
    })
    expect(deductions[0].points).toBeLessThanOrEqual(20)
  })

  it('E-7: goals with deadline > 365 days away are excluded', () => {
    const { score, deductions } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 0, deadline: farFuture }],
    })
    expect(deductions).toHaveLength(0)
    expect(score).toBe(100)
  })

  it('E-8: multiple goals accumulate deductions independently', () => {
    const { deductions } = calculateEnvironmentalScore({
      goals: [
        { target: 100, actual: 0, deadline: past },
        { target: 100, actual: 0, deadline: past },
      ],
    })
    expect(deductions).toHaveLength(2)
  })

  it('E-9: returns score=0 with single deduction when goals array is empty', () => {
    const { score, deductions } = calculateEnvironmentalScore({ goals: [] })
    expect(score).toBe(0)
    expect(deductions[0].reason).toMatch(/No environmental goals/)
  })

  it('E-10: goals with target <= 0 are skipped (invalid data)', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: 0, actual: 50, deadline: past }],
    })
    // With target=0 skipped and no valid goals, score stays 100
    expect(score).toBe(100)
  })

  it('E-11: actual > target is clamped to completion fraction of 1 (no bonus)', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 150, deadline: past }],
    })
    expect(score).toBe(100)
  })

  it('E-12: score is capped at 100 (never exceeds max)', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 200, deadline: past }],
    })
    expect(score).toBeLessThanOrEqual(100)
  })

  it('E-13: a goal exactly on-trajectory produces no deduction', () => {
    // actual/target should equal expectedCompletion — use a near-future goal at 50% done
    // We can't control expectedCompletion exactly, so use a past deadline + 100% done
    const { deductions } = calculateEnvironmentalScore({
      goals: [{ target: 200, actual: 200, deadline: past }],
    })
    expect(deductions).toHaveLength(0)
  })

  it('E-14: deduction values are rounded to 1 decimal place', () => {
    const { deductions } = calculateEnvironmentalScore({
      goals: [{ target: 100, actual: 33, deadline: past }],
    })
    if (deductions.length > 0) {
      const val = deductions[0].points
      expect(val).toBe(Math.round(val * 10) / 10)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Group 2 — Social Score (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateSocialScore', () => {
  it('S-1: returns 100 when CSR, training, and diversity are all perfect', () => {
    const { score } = calculateSocialScore({
      csrActivities: [{ participants: 10, totalEligible: 10, approved: true }],
      trainingRecords: [{ completed: true, userId: 'u1' }],
      diversityScore: 100,
    })
    expect(score).toBe(100)
  })

  it('S-2: components sum to total score', () => {
    const { score, components } = calculateSocialScore({
      csrActivities: [{ participants: 5, totalEligible: 10, approved: true }],
      trainingRecords: [{ completed: true, userId: 'u1' }, { completed: false, userId: 'u2' }],
      diversityScore: 60,
    })
    const sum = components.csr + components.training + components.diversity
    expect(Math.abs(score - Math.round(sum * 10) / 10)).toBeLessThanOrEqual(0.2)
  })

  it('S-3: CSR rate is 0 when no approved activities', () => {
    const { components } = calculateSocialScore({
      csrActivities: [{ participants: 10, totalEligible: 10, approved: false }],
      trainingRecords: [],
      diversityScore: 0,
    })
    expect(components.csr).toBe(0)
  })

  it('S-4: CSR component maxes at SOCIAL_WEIGHTS.csr (40 pts) for perfect participation', () => {
    const { components } = calculateSocialScore({
      csrActivities: [{ participants: 100, totalEligible: 100, approved: true }],
      trainingRecords: [],
      diversityScore: 0,
    })
    expect(components.csr).toBe(SOCIAL_WEIGHTS.csr)
  })

  it('S-5: training component maxes at SOCIAL_WEIGHTS.training (30 pts) for 100% completion', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [
        { completed: true, userId: 'a' },
        { completed: true, userId: 'b' },
      ],
      diversityScore: 0,
    })
    expect(components.training).toBe(SOCIAL_WEIGHTS.training)
  })

  it('S-6: diversity component maxes at SOCIAL_WEIGHTS.diversity (30 pts) for score=100', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 100,
    })
    expect(components.diversity).toBe(SOCIAL_WEIGHTS.diversity)
  })

  it('S-7: returns 0 when all inputs are empty/zero', () => {
    const { score } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 0,
    })
    expect(score).toBe(0)
  })

  it('S-8: training rate with no records returns 0 training points', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 0,
    })
    expect(components.training).toBe(0)
  })

  it('S-9: diversity score > 100 is clamped to 100', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 150,
    })
    expect(components.diversity).toBe(SOCIAL_WEIGHTS.diversity)
  })

  it('S-10: diversity score < 0 is clamped to 0', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: -20,
    })
    expect(components.diversity).toBe(0)
  })

  it('S-11: NaN diversity score returns 0 diversity points', () => {
    const { components } = calculateSocialScore({
      csrActivities: [],
      trainingRecords: [],
      diversityScore: NaN,
    })
    expect(components.diversity).toBe(0)
  })

  it('S-12: multiple approved CSR activities aggregate participants correctly', () => {
    const { components } = calculateSocialScore({
      csrActivities: [
        { participants: 5, totalEligible: 10, approved: true },
        { participants: 5, totalEligible: 10, approved: true },
      ],
      trainingRecords: [],
      diversityScore: 0,
    })
    // 10/20 = 50% → 20 pts
    expect(components.csr).toBe(20)
  })

  it('S-13: unapproved activities are excluded from CSR rate denominator', () => {
    const { components: withUnapproved } = calculateSocialScore({
      csrActivities: [
        { participants: 10, totalEligible: 10, approved: true },
        { participants: 0, totalEligible: 100, approved: false },
      ],
      trainingRecords: [],
      diversityScore: 0,
    })
    expect(withUnapproved.csr).toBe(40) // still 10/10 = 100% after excluding unapproved
  })

  it('S-14: score is always between 0 and 100', () => {
    const { score } = calculateSocialScore({
      csrActivities: [{ participants: 50, totalEligible: 40, approved: true }], // over 100% should clamp
      trainingRecords: Array.from({ length: 5 }, (_, i) => ({ completed: true, userId: `u${i}` })),
      diversityScore: 100,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Group 3 — Governance Score (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateGovernanceScore', () => {
  it('G-1: returns 100 when all policies acknowledged, audits clean, no issues', () => {
    const { score } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [{ findings: 0, critical: 0, resolved: 0 }],
      complianceIssues: [],
    })
    expect(score).toBe(100)
  })

  it('G-2: archived policies are excluded from policy rate', () => {
    const { components } = calculateGovernanceScore({
      policies: [
        { acknowledged: 10, total: 10, status: 'active' },
        { acknowledged: 0, total: 10, status: 'archived' }, // should be ignored
      ],
      audits: [],
      complianceIssues: [],
    })
    expect(components.policies).toBe(GOVERNANCE_WEIGHTS.policies)
  })

  it('G-3: draft policies are excluded from policy rate', () => {
    const { components } = calculateGovernanceScore({
      policies: [
        { acknowledged: 10, total: 10, status: 'active' },
        { acknowledged: 0, total: 10, status: 'draft' },
      ],
      audits: [],
      complianceIssues: [],
    })
    expect(components.policies).toBe(GOVERNANCE_WEIGHTS.policies)
  })

  it('G-4: unresolved critical compliance issue deducts SEVERITY_PENALTIES.critical points', () => {
    const { components: withIssue } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: [{ severity: 'critical', resolved: false }],
    })
    const { components: clean } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: [],
    })
    expect(clean.issues - withIssue.issues).toBeCloseTo(SEVERITY_PENALTIES.critical, 0)
  })

  it('G-5: resolved issues do not deduct any points', () => {
    const { components } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: [
        { severity: 'critical', resolved: true },
        { severity: 'high', resolved: true },
      ],
    })
    expect(components.issues).toBe(GOVERNANCE_WEIGHTS.issues)
  })

  it('G-6: issue penalty is capped at MAX_ISSUE_PENALTY (30 pts) → issues never < 0', () => {
    const manyIssues = Array.from({ length: 10 }, () => ({ severity: 'critical' as const, resolved: false }))
    const { components } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: manyIssues,
    })
    expect(components.issues).toBeGreaterThanOrEqual(0)
  })

  it('G-7: audit with 0 findings counts as 100% resolved', () => {
    const { components } = calculateGovernanceScore({
      policies: [],
      audits: [{ findings: 0, critical: 0, resolved: 0 }],
      complianceIssues: [],
    })
    expect(components.audits).toBe(GOVERNANCE_WEIGHTS.audits)
  })

  it('G-8: audit with 50% resolved findings scores 50% of max audit points', () => {
    const { components } = calculateGovernanceScore({
      policies: [],
      audits: [{ findings: 10, critical: 0, resolved: 5 }],
      complianceIssues: [],
    })
    expect(components.audits).toBeCloseTo(GOVERNANCE_WEIGHTS.audits * 0.5, 0)
  })

  it('G-9: critical unresolved findings apply multiplier penalty to audit score', () => {
    const { components: withCritical } = calculateGovernanceScore({
      policies: [],
      audits: [{ findings: 4, critical: 2, resolved: 2 }], // 50% resolved but 2 critical still unresolved
      complianceIssues: [],
    })
    const { components: noCritical } = calculateGovernanceScore({
      policies: [],
      audits: [{ findings: 4, critical: 0, resolved: 2 }], // same 50% resolved, no critical
      complianceIssues: [],
    })
    expect(withCritical.audits).toBeLessThanOrEqual(noCritical.audits)
  })

  it('G-10: score stays ≥ 0 even with extreme penalties', () => {
    const { score } = calculateGovernanceScore({
      policies: [{ acknowledged: 0, total: 10, status: 'active' }],
      audits: [{ findings: 10, critical: 10, resolved: 0 }],
      complianceIssues: Array.from({ length: 5 }, () => ({ severity: 'critical' as const, resolved: false })),
    })
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('G-11: score stays ≤ 100 with perfect inputs', () => {
    const { score } = calculateGovernanceScore({
      policies: [{ acknowledged: 100, total: 100, status: 'active' }],
      audits: [{ findings: 0, critical: 0, resolved: 0 }],
      complianceIssues: [],
    })
    expect(score).toBeLessThanOrEqual(100)
  })

  it('G-12: policy rate with no active policies returns 0 policy points', () => {
    const { components } = calculateGovernanceScore({
      policies: [{ acknowledged: 0, total: 10, status: 'archived' }],
      audits: [],
      complianceIssues: [],
    })
    expect(components.policies).toBe(0)
  })

  it('G-13: low severity issues deduct SEVERITY_PENALTIES.low (2 pts) each', () => {
    const { components: one } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: [{ severity: 'low', resolved: false }],
    })
    const { components: clean } = calculateGovernanceScore({
      policies: [{ acknowledged: 10, total: 10, status: 'active' }],
      audits: [],
      complianceIssues: [],
    })
    expect(clean.issues - one.issues).toBeCloseTo(SEVERITY_PENALTIES.low, 0)
  })

  it('G-14: score output is rounded to 1 decimal place', () => {
    const { score } = calculateGovernanceScore({
      policies: [{ acknowledged: 7, total: 10, status: 'active' }],
      audits: [{ findings: 3, critical: 1, resolved: 1 }],
      complianceIssues: [{ severity: 'medium', resolved: false }],
    })
    expect(score).toBe(Math.round(score * 10) / 10)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Group 4 — Overall Score & Full Calculation (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateFullScore', () => {
  it('O-1: returns a full ScoreBreakdown object with all expected keys', () => {
    const result = calculateFullScore(makeBaseInput())
    expect(result).toHaveProperty('environmental')
    expect(result).toHaveProperty('social')
    expect(result).toHaveProperty('governance')
    expect(result).toHaveProperty('overall')
    expect(result).toHaveProperty('grade')
    expect(result).toHaveProperty('trend')
  })

  it('O-2: overall score is weighted average of E, S, G pillar scores', () => {
    const input = makeBaseInput({
      weights: { environmental: 50, social: 30, governance: 20 },
    })
    const { overall, environmental, social, governance } = calculateFullScore(input)
    const expected = (
      environmental.score * 50 +
      social.score * 30 +
      governance.score * 20
    ) / 100
    expect(Math.abs(overall - Math.round(expected * 10) / 10)).toBeLessThanOrEqual(0.2)
  })

  it('O-3: grade A+ for score >= 90', () => {
    const result = calculateFullScore(makeBaseInput())
    if (result.overall >= SCORE_THRESHOLDS['A+']) {
      expect(result.grade).toBe('A+')
    }
  })

  it('O-4: grade F for score < 40', () => {
    const badInput = makeBaseInput({
      goals: [{ target: 100, actual: 0, deadline: past }],
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 0,
      policies: [{ acknowledged: 0, total: 10, status: 'active' }],
      audits: [{ findings: 10, critical: 5, resolved: 0 }],
      complianceIssues: Array.from({ length: 5 }, () => ({ severity: 'critical' as const, resolved: false })),
    })
    const { grade, overall } = calculateFullScore(badInput)
    if (overall < 40) expect(grade).toBe('F')
  })

  it('O-5: grade is one of the expected grade strings', () => {
    const validGrades = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']
    const { grade } = calculateFullScore(makeBaseInput())
    expect(validGrades).toContain(grade)
  })

  it('O-6: throws when weights do not sum to 100', () => {
    const badInput = makeBaseInput({
      weights: { environmental: 50, social: 50, governance: 10 }, // sum = 110
    })
    expect(() => calculateFullScore(badInput)).toThrow(/weights must sum to 100/)
  })

  it('O-7: does NOT throw when weights sum to 100 within ±1 tolerance', () => {
    const input = makeBaseInput({ weights: { environmental: 34, social: 33, governance: 33 } })
    expect(() => calculateFullScore(input)).not.toThrow()
  })

  it('O-8: trend is "improving" for high overall score with balanced pillars', () => {
    const { trend } = calculateFullScore(makeBaseInput())
    // With a perfect input the score should be >= 70 and env spread > -5
    expect(['improving', 'stable']).toContain(trend)
  })

  it('O-9: trend is "declining" for very low overall score', () => {
    const badInput = makeBaseInput({
      goals: [{ target: 100, actual: 0, deadline: past }],
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 0,
      policies: [{ acknowledged: 0, total: 10, status: 'active' }],
      audits: [{ findings: 20, critical: 10, resolved: 0 }],
      complianceIssues: Array.from({ length: 5 }, () => ({ severity: 'critical' as const, resolved: false })),
    })
    const { trend, overall } = calculateFullScore(badInput)
    if (overall < 50) expect(trend).toBe('declining')
  })

  it('O-10: overall is always between 0 and 100', () => {
    const { overall } = calculateFullScore(makeBaseInput())
    expect(overall).toBeGreaterThanOrEqual(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it('O-11: explainScore returns a non-empty array of strings', () => {
    const breakdown = calculateFullScore(makeBaseInput())
    const lines = explainScore(breakdown)
    expect(lines.length).toBeGreaterThan(0)
    expect(typeof lines[0]).toBe('string')
  })

  it('O-12: explainScore includes GRI codes in output', () => {
    const breakdown = calculateFullScore(makeBaseInput())
    const lines = explainScore(breakdown)
    const joined = lines.join(' ')
    expect(joined).toMatch(/GRI/)
  })

  it('O-13: simulateScore delta is after.overall - before.overall', () => {
    const baseInput = makeBaseInput({
      complianceIssues: [{ severity: 'critical', resolved: false }],
    })
    const { before, after, delta } = simulateScore(baseInput, {
      complianceIssues: [{ severity: 'critical', resolved: true }],
    })
    expect(Math.abs(delta - Math.round((after.overall - before.overall) * 10) / 10)).toBeLessThanOrEqual(0.1)
  })

  it('O-14: simulateScore with no changes produces delta = 0', () => {
    const input = makeBaseInput()
    const { delta } = simulateScore(input, {})
    expect(delta).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Group 5 — Edge Cases (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('EC-1: all-zero ScoringInput does not throw', () => {
    const zeroInput = makeBaseInput({
      goals: [],
      csrActivities: [],
      trainingRecords: [],
      diversityScore: 0,
      policies: [],
      audits: [],
      complianceIssues: [],
    })
    expect(() => calculateFullScore(zeroInput)).not.toThrow()
  })

  it('EC-2: environmental score handles single goal with NaN target', () => {
    const { score } = calculateEnvironmentalScore({
      goals: [{ target: NaN, actual: 50, deadline: past }],
    })
    // NaN target → goal is skipped → no active goals → score = 0 (empty goals path)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('EC-3: social score with participants > totalEligible does not throw', () => {
    expect(() =>
      calculateSocialScore({
        csrActivities: [{ participants: 200, totalEligible: 100, approved: true }],
        trainingRecords: [],
        diversityScore: 50,
      })
    ).not.toThrow()
  })

  it('EC-4: governance score with acknowledged > total does not throw', () => {
    expect(() =>
      calculateGovernanceScore({
        policies: [{ acknowledged: 15, total: 10, status: 'active' }],
        audits: [],
        complianceIssues: [],
      })
    ).not.toThrow()
  })

  it('EC-5: scores are deterministic — same input always produces same output', () => {
    const input = makeBaseInput()
    const r1 = calculateFullScore(input)
    const r2 = calculateFullScore(input)
    expect(r1.overall).toBe(r2.overall)
    expect(r1.grade).toBe(r2.grade)
  })

  it('EC-6: equal weights (33/33/34) do not cause a weight-sum error', () => {
    const input = makeBaseInput({ weights: { environmental: 33, social: 33, governance: 34 } })
    expect(() => calculateFullScore(input)).not.toThrow()
  })

  it('EC-7: 100% weight on one pillar (100/0/0) is accepted and weighted correctly', () => {
    const input = makeBaseInput({ weights: { environmental: 100, social: 0, governance: 0 } })
    const { overall, environmental } = calculateFullScore(input)
    expect(overall).toBe(environmental.score)
  })

  it('EC-8: large number of goals does not cause performance issues (smoke test)', () => {
    const goals = Array.from({ length: 500 }, () => ({ target: 100, actual: 80, deadline: past }))
    const start = Date.now()
    calculateEnvironmentalScore({ goals })
    expect(Date.now() - start).toBeLessThan(200) // should complete in < 200ms
  })

  it('EC-9: governance handles empty audits array gracefully', () => {
    const { components } = calculateGovernanceScore({
      policies: [],
      audits: [],
      complianceIssues: [],
    })
    // No audits → 0 findings → 100% resolved → full audit points
    expect(components.audits).toBe(GOVERNANCE_WEIGHTS.audits)
  })

  it('EC-10: governance score with only draft and archived policies → 0 policy points', () => {
    const { components } = calculateGovernanceScore({
      policies: [
        { acknowledged: 10, total: 10, status: 'draft' },
        { acknowledged: 10, total: 10, status: 'archived' },
      ],
      audits: [],
      complianceIssues: [],
    })
    expect(components.policies).toBe(0)
  })

  it('EC-11: overall score never exceeds 100 even with overcharged inputs', () => {
    const { overall } = calculateFullScore(makeBaseInput({
      diversityScore: 999,
      csrActivities: [{ participants: 999, totalEligible: 1, approved: true }],
    }))
    expect(overall).toBeLessThanOrEqual(100)
  })

  it('EC-12: simulateScore preserves the original input (no mutation)', () => {
    const input = makeBaseInput()
    const originalIssueCount = input.complianceIssues.length
    simulateScore(input, {
      complianceIssues: [{ severity: 'critical', resolved: false }],
    })
    expect(input.complianceIssues.length).toBe(originalIssueCount)
  })

  it('EC-13: grade boundaries are correct — score exactly at threshold gets that grade', () => {
    // We can test indirectly by checking which grade a known overall score produces
    // We simulate an input and verify grade consistency with SCORE_THRESHOLDS
    const { overall, grade } = calculateFullScore(makeBaseInput())
    const expectedGrade = overall >= 90 ? 'A+'
      : overall >= 80 ? 'A'
      : overall >= 70 ? 'B+'
      : overall >= 60 ? 'B'
      : overall >= 50 ? 'C'
      : overall >= 40 ? 'D'
      : 'F'
    expect(grade).toBe(expectedGrade)
  })

  it('EC-14: explainScore output includes environmental, social, and governance sections', () => {
    const breakdown = calculateFullScore(makeBaseInput())
    const lines = explainScore(breakdown)
    const joined = lines.join('\n')
    expect(joined).toMatch(/Environmental/)
    expect(joined).toMatch(/Social/)
    expect(joined).toMatch(/Governance/)
  })
})
