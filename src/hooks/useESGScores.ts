import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import type { DepartmentScore, Notification } from '@/types'
import { calculateFullScore, type ScoringInput } from '@/lib/scoring/engine'

export interface ESGScoreSummary {
  env:       number
  social:    number
  gov:       number
  composite: number
  trend:     'up' | 'down' | 'flat'
  lastUpdated: string
}

/** Build a ScoringInput from the local dbService data layer */
function buildScoringInput(
  org: ReturnType<typeof dbService.getOrganization>
): ScoringInput {
  const goals             = dbService.getGoals()
  const transactions      = dbService.getCarbonTransactions()
  const csrActivities     = dbService.getCSRActivities()
  const csrParticipations = dbService.getCSRParticipations()
  const profiles          = dbService.getProfiles()
  const policies          = dbService.getPolicies?.() ?? []
  const audits            = dbService.getAudits?.()   ?? []
  const issues            = dbService.getComplianceIssues()

  // Build goals array from environmental goals
  const scoringGoals = goals.map(g => ({
    target:   typeof g.target_value === 'number' ? g.target_value : 100,
    actual:   typeof g.current_value === 'number' ? g.current_value : 0,
    deadline: new Date(g.deadline ?? new Date()),
  }))

  // Build emissions from carbon transactions
  const scoringEmissions = transactions.map(tx => ({
    amount: tx.calculated_emission_kg ?? 0,
    month:  new Date(tx.date ?? new Date()),
    scope:  (tx.source_type === 'manufacturing' || tx.source_type === 'fleet' ? 1 : tx.source_type === 'expense' ? 2 : 3) as 1 | 2 | 3,
  }))

  // CSR activities: use participations to calculate rates per activity
  const activityMap = new Map<string, { participants: number; totalEligible: number; approved: boolean }>()
  for (const p of csrParticipations) {
    const existing = activityMap.get(p.activity_id ?? '')
    if (existing) {
      existing.participants++
      if (p.approval_status === 'approved') existing.approved = true
    } else {
      activityMap.set(p.activity_id ?? '', {
        participants: 1,
        totalEligible: profiles.length || 1,
        approved: p.approval_status === 'approved',
      })
    }
  }
  // Fall back to counting active CSR activities if no participations
  if (activityMap.size === 0) {
    for (const a of csrActivities) {
      activityMap.set(a.id, {
        participants: Math.round(profiles.length * 0.6),
        totalEligible: profiles.length || 1,
        approved: a.status === 'active',
      })
    }
  }
  const scoringCSR = Array.from(activityMap.values())

  // Training records: use XP-based mock (employees with points > 100 count as trained)
  const scoringTraining = profiles.map(p => ({
    completed: (p.total_points ?? 0) > 100,
    userId: p.id,
  }))

  // Diversity score: stored on org or defaulted to 65
  const diversityScore = (org as any).diversity_score ?? 65

  // Policies
  const scoringPolicies = policies.length > 0
    ? policies.map((p: any) => ({
        acknowledged: p.acknowledgements?.length ?? Math.round((p.total ?? 10) * 0.8),
        total:        p.total ?? p.employee_count ?? 10,
        status:       (p.status ?? 'active') as 'active' | 'draft' | 'archived',
      }))
    : [{ acknowledged: 8, total: 10, status: 'active' as const }]

  // Audits
  const scoringAudits = audits.length > 0
    ? audits.map((a: any) => ({
        findings: a.findings_count ?? a.findings ?? 0,
        critical: a.critical_count ?? a.critical ?? 0,
        resolved: a.resolved_count ?? a.resolved ?? 0,
      }))
    : [{ findings: 2, critical: 0, resolved: 2 }]

  // Compliance issues
  const scoringIssues = issues.map(i => ({
    severity: (i.severity ?? 'low') as 'low' | 'medium' | 'high' | 'critical',
    resolved: i.status === 'resolved',
  }))

  return {
    goals:            scoringGoals,
    emissions:        scoringEmissions,
    csrActivities:    scoringCSR,
    trainingRecords:  scoringTraining,
    diversityScore,
    policies:         scoringPolicies,
    audits:           scoringAudits,
    complianceIssues: scoringIssues,
    weights: {
      environmental: org.env_weight    ?? 40,
      social:        org.social_weight ?? 30,
      governance:    org.gov_weight    ?? 30,
    },
  }
}

/**
 * Reads ESG scores via the pure scoring engine (src/lib/scoring/engine.ts)
 * and refreshes whenever the component mounts or `refresh()` is called.
 *
 * This hook is the only place where React state and the scoring engine connect.
 * The engine itself has no React dependency.
 */
export function useESGScores() {
  const [scores, setScores] = useState<ESGScoreSummary | null>(null)
  const [deptScores, setDeptScores] = useState<DepartmentScore[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    try {
      const org  = dbService.getOrganization()
      const all  = dbService.getDepartmentScores()
      setDeptScores(all)

      // Build input and run through the pure engine
      const input     = buildScoringInput(org)
      const breakdown = calculateFullScore(input)

      setScores({
        env:         breakdown.environmental.score,
        social:      breakdown.social.score,
        gov:         breakdown.governance.score,
        composite:   breakdown.overall,
        trend:       breakdown.trend === 'improving' ? 'up'
                   : breakdown.trend === 'declining' ? 'down'
                   : 'flat',
        lastUpdated: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[useESGScores] Scoring engine error:', err)
      setScores({ env: 0, social: 0, gov: 0, composite: 0, trend: 'flat', lastUpdated: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { scores, deptScores, loading, refresh: load }
}

/**
 * Reads unread notifications for the current session user.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(() => {
    const all = dbService.getNotifications()
    setNotifications(all)
    setUnreadCount(all.filter((n) => !n.read).length)
  }, [])

  const markAllRead = useCallback(() => {
    dbService.markAllNotificationsRead()
    load()
  }, [load])

  const markRead = useCallback((id: string) => {
    dbService.markNotificationRead(id)
    load()
  }, [load])

  useEffect(() => {
    load()
    // Poll every 5 seconds to pick up notifications generated by other actions
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load])

  return { notifications, unreadCount, markAllRead, markRead, refresh: load }
}
