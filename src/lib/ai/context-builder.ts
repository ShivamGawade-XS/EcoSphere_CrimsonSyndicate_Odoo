/**
 * EcoSphere AI — ESG Context Builder
 *
 * Builds a rich, structured ESG context object from the org's data.
 * Works in both mock mode (localStorage via dbService) and live Supabase mode.
 * This context is passed to the AI system prompt before every chat message.
 *
 * @module ai/context-builder
 */

import { dbService } from '@/lib/dbService'
import { calculateEnvironmentalScore, calculateSocialScore, calculateGovernanceScore } from '@/lib/scoring/engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ESGContext {
  orgName: string
  currentScores: {
    overall: number
    environmental: number
    social: number
    governance: number
  }
  scoreVsPreviousMonth: {
    overall: number
    environmental: number
    social: number
    governance: number
  }
  topRisks: Array<{
    area: 'Environmental' | 'Social' | 'Governance'
    issue: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    impact: string
  }>
  recentEmissions: Array<{
    department: string
    amount: number
    date: string
  }>
  openComplianceIssues: Array<{
    description: string
    severity: string
    owner: string
    daysOverdue: number
  }>
  goalsOffTrack: Array<{
    name: string
    target: number
    current: number
    deadline: string
  }>
  pendingPolicyAcknowledgements: {
    count: number
    pctComplete: number
  }
  activeGamificationChallenges: Array<{
    title: string
    participants: number
    deadline: string
  }>
  topLeaderboardDepartments: Array<{
    name: string
    score: number
  }>
  lastUpdated: string
}

// ─── Context Builder ──────────────────────────────────────────────────────────

/**
 * Build a full ESG context snapshot for AI consumption.
 * @param _orgId - Org ID (used in future live Supabase queries; currently reads from dbService mock)
 */
export async function buildESGContext(_orgId?: string): Promise<ESGContext> {
  // Reads from localStorage in mock mode — no network required
  const org        = dbService.getOrganization()
  const depts      = dbService.getDepartments()
  const profiles   = dbService.getProfiles()
  const goals      = dbService.getGoals()
  const txs        = dbService.getCarbonTransactions()
  const issues     = dbService.getComplianceIssues()
  const policies   = dbService.getPolicies()
  const acks       = dbService.getAcknowledgements()
  const challenges = dbService.getChallenges()
  const challengeParts = dbService.getChallengeParticipations()
  const deptScores = dbService.getDepartmentScores()
  const training   = dbService.getTrainingRecords()
  const csrActs    = dbService.getCSRActivities()
  const audits     = dbService.getAudits()

  // ── Score Calculation ────────────────────────────────────────────────────────
  const envResult = calculateEnvironmentalScore({
    goals: goals.map(g => ({
      target:   g.target_value,
      actual:   g.current_value,
      deadline: new Date(g.deadline),
    })),
  })

  const participationsList = dbService.getCSRParticipations()

  const socResult = calculateSocialScore({
    csrActivities: csrActs.map(a => {
      const pCount = participationsList.filter(p => p.activity_id === a.id && p.approval_status === 'approved').length
      return {
        participants:  pCount,
        totalEligible: a.max_participants ?? profiles.length,
        approved:      a.status === 'active',
      }
    }),
    trainingRecords: training.map(t => ({ completed: t.status === 'completed', userId: t.employee_id })),
    diversityScore: 65, // default placeholder
  })

  const govResult = calculateGovernanceScore({
    policies: policies.map(p => {
      const ackedCount = acks.filter(a => a.policy_id === p.id).length
      return { acknowledged: ackedCount, total: profiles.length, status: p.status }
    }),
    audits: audits.map(a => {
      const isCompleted = a.status === 'completed'
      return {
        findings: isCompleted ? 2 : 0,
        critical: 0,
        resolved: isCompleted ? 2 : 0,
      }
    }),
    complianceIssues: issues.map(i => ({
      severity: i.severity as 'low' | 'medium' | 'high' | 'critical',
      resolved: i.status === 'resolved',
    })),
  })

  const weights = {
    environmental: org.env_weight,
    social:        org.social_weight,
    governance:    org.gov_weight,
  }

  const overall = Math.round(
    (envResult.score * weights.environmental +
     socResult.score * weights.social +
     govResult.score * weights.governance) / 100
  )

  // Simulate "previous month" as slightly lower (mock delta — replace with real history)
  const currentScores = {
    overall,
    environmental: envResult.score,
    social:        socResult.score,
    governance:    govResult.score,
  }

  const prevDelta = { overall: -2, environmental: -1.5, social: -0.8, governance: -2.5 }
  const scoreVsPreviousMonth = {
    overall:       Math.round((currentScores.overall - prevDelta.overall) * 10) / 10,
    environmental: Math.round((currentScores.environmental - prevDelta.environmental) * 10) / 10,
    social:        Math.round((currentScores.social - prevDelta.social) * 10) / 10,
    governance:    Math.round((currentScores.governance - prevDelta.governance) * 10) / 10,
  }

  // ── Top Risks ────────────────────────────────────────────────────────────────
  const openIssues = issues.filter(i => i.status !== 'resolved')
  const now = new Date()

  const topRisks = openIssues
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4)
    })
    .slice(0, 5)
    .map(i => ({
      area:     'Governance' as const,
      issue:    i.description || i.title,
      severity: i.severity as 'low' | 'medium' | 'high' | 'critical',
      impact:   `Due ${new Date(i.due_date).toLocaleDateString('en-IN')} — ${i.severity} severity penalty applied to Governance score`,
    }))

  // ── Recent Emissions ─────────────────────────────────────────────────────────
  const recentEmissions = txs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(tx => {
      const dept = depts.find(d => d.id === tx.department_id)
      return {
        department: dept?.name ?? 'Unknown',
        amount:     Math.round(tx.calculated_emission_kg),
        date:       tx.date,
      }
    })

  // ── Goals Off-Track ──────────────────────────────────────────────────────────
  const goalsOffTrack = goals
    .filter(g => {
      const deadline = new Date(g.deadline)
      if (deadline < now) return false
      const start = new Date(g.start_date).getTime()
      const end   = deadline.getTime()
      const elapsed = (now.getTime() - start) / (end - start)
      const expected = elapsed
      const actual   = g.current_value / g.target_value
      return actual < expected * 0.85 // behind by more than 15%
    })
    .slice(0, 3)
    .map(g => ({
      name:     g.title,
      target:   g.target_value,
      current:  g.current_value,
      deadline: g.deadline,
    }))

  // ── Policy Acknowledgements ───────────────────────────────────────────────────
  const activePolicies = policies.filter(p => p.status === 'active')
  const totalRequired  = activePolicies.length * profiles.length
  const totalAcked     = acks.filter(a => activePolicies.some(p => p.id === a.policy_id)).length
  const pctComplete    = totalRequired > 0 ? Math.round((totalAcked / totalRequired) * 100) : 100

  // ── Open Compliance Issues (enriched) ────────────────────────────────────────
  const openComplianceIssues = openIssues.slice(0, 5).map(i => {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86_400_000))
    const owner = profiles.find(p => p.id === i.owner_id)?.full_name ?? 'Unassigned'
    return {
      description: i.description || i.title,
      severity:    i.severity,
      owner,
      daysOverdue,
    }
  })

  // ── Active Gamification Challenges ───────────────────────────────────────────
  const activeChallenges = challenges.filter(c => c.status === 'active').slice(0, 3)
  const activeGamificationChallenges = activeChallenges.map(c => {
    const participants = challengeParts.filter(cp => cp.challenge_id === c.id).length
    return {
      title:        c.title,
      participants,
      deadline:     c.deadline ?? new Date().toISOString(),
    }
  })

  // ── Department Leaderboard ────────────────────────────────────────────────────
  const topLeaderboardDepartments = deptScores
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 3)
    .map(ds => ({
      name:  depts.find(d => d.id === ds.department_id)?.name ?? 'Unknown',
      score: Math.round(ds.total_score ?? 0),
    }))

  return {
    orgName:           org.name,
    currentScores,
    scoreVsPreviousMonth,
    topRisks,
    recentEmissions,
    openComplianceIssues,
    goalsOffTrack,
    pendingPolicyAcknowledgements: {
      count:       totalRequired - totalAcked,
      pctComplete,
    },
    activeGamificationChallenges,
    topLeaderboardDepartments,
    lastUpdated: new Date().toISOString(),
  }
}
