import * as mock from './mockData'
import {
  Department,
  Profile,
  Organization,
  Category,
  EmissionFactor,
  CarbonTransaction,
  EnvironmentalGoal,
  CSRActivity,
  EmployeeParticipation,
  Challenge,
  ChallengeParticipation,
  Badge,
  BadgeAward,
  Reward,
  RewardRedemption,
  DepartmentScore,
  Notification,
  XPTransaction,
  ComplianceIssue,
  Audit,
  ESGPolicy,
} from '@/types'

// Keys for LocalStorage
const KEYS = {
  org: 'ecosphere_org',
  depts: 'ecosphere_depts',
  cats: 'ecosphere_categories',
  users: 'ecosphere_profiles',
  factors: 'ecosphere_emission_factors',
  goals: 'ecosphere_goals',
  txs: 'ecosphere_transactions',
  csr: 'ecosphere_csr_activities',
  participations: 'ecosphere_csr_participations',
  challenges: 'ecosphere_challenges',
  challengeParts: 'ecosphere_challenge_participations',
  badges: 'ecosphere_badges',
  badgeAwards: 'ecosphere_badge_awards',
  rewards: 'ecosphere_rewards',
  redemptions: 'ecosphere_redemptions',
  notifications: 'ecosphere_notifications',
  xpTransactions: 'ecosphere_xp_transactions',
  issues: 'ecosphere_compliance_issues',
  audits: 'ecosphere_audits',
  policies: 'ecosphere_policies',
  scores: 'ecosphere_department_scores',
  currentUser: 'ecosphere_current_user_id',
}

// ─── Initial Database Seeding ─────────────────────────────────
export function initializeLocalDatabase(force = false) {
  const seed = (key: string, data: any) => {
    if (force || !localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data))
    }
  }

  seed(KEYS.org, mock.defaultOrganization)
  seed(KEYS.depts, mock.defaultDepartments)
  seed(KEYS.cats, mock.defaultCategories)
  seed(KEYS.users, mock.defaultProfiles)
  seed(KEYS.factors, mock.defaultEmissionFactors)
  seed(KEYS.goals, mock.defaultGoals)
  seed(KEYS.txs, mock.defaultCarbonTransactions)
  seed(KEYS.csr, mock.defaultCSRActivities)
  seed(KEYS.participations, [])
  seed(KEYS.challenges, mock.defaultChallenges)
  seed(KEYS.challengeParts, [])
  seed(KEYS.badges, mock.defaultBadges)
  seed(KEYS.badgeAwards, [])
  seed(KEYS.rewards, mock.defaultRewards)
  seed(KEYS.redemptions, [])
  seed(KEYS.notifications, [])
  seed(KEYS.xpTransactions, [])
  seed(KEYS.issues, mock.defaultComplianceIssues)
  seed(KEYS.audits, mock.defaultAudits)
  seed(KEYS.policies, mock.defaultPolicies)
  seed(KEYS.scores, [])

  // Default active user is the ESG Manager for complete demo experience
  if (!localStorage.getItem(KEYS.currentUser)) {
    localStorage.setItem(KEYS.currentUser, 'user-esg')
  }

  // Calculate initial scores if empty
  const scores = JSON.parse(localStorage.getItem(KEYS.scores) || '[]')
  if (scores.length === 0) {
    recalculateScores()
  }
}

// ─── Generic DB Accessors ─────────────────────────────────────
function get<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) || '[]') as T
}

function set<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Public Database Service API ──────────────────────────────
export const dbService = {
  // Authentication & Current User
  getCurrentUser: (): Profile => {
    const userId = localStorage.getItem(KEYS.currentUser) || 'user-esg'
    const users = get<Profile[]>(KEYS.users)
    return users.find((u) => u.id === userId) || users[0]
  },
  setCurrentUser: (userId: string) => {
    localStorage.setItem(KEYS.currentUser, userId)
  },
  getProfiles: () => get<Profile[]>(KEYS.users),
  updateProfile: (updated: Profile) => {
    const users = get<Profile[]>(KEYS.users)
    set(KEYS.users, users.map(u => u.id === updated.id ? updated : u))
  },

  // Organization settings
  getOrganization: (): Organization => {
    return JSON.parse(localStorage.getItem(KEYS.org) || '{}') as Organization
  },
  updateOrganization: (updated: Organization) => {
    localStorage.setItem(KEYS.org, JSON.stringify(updated))
  },

  // Departments
  getDepartments: () => get<Department[]>(KEYS.depts),
  addDepartment: (dept: Omit<Department, 'id' | 'org_id' | 'created_at'>) => {
    const depts = get<Department[]>(KEYS.depts)
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
      org_id: 'org-greentech-123',
      created_at: new Date().toISOString()
    }
    set(KEYS.depts, [...depts, newDept])
    return newDept;
  },

  // Categories
  getCategories: () => get<Category[]>(KEYS.cats),

  // Emission Factors
  getEmissionFactors: () => get<EmissionFactor[]>(KEYS.factors),
  addEmissionFactor: (factor: Omit<EmissionFactor, 'id' | 'org_id' | 'created_at'>) => {
    const list = get<EmissionFactor[]>(KEYS.factors)
    const newFactor: EmissionFactor = {
      ...factor,
      id: `ef-${Date.now()}`,
      org_id: 'org-greentech-123',
      created_at: new Date().toISOString()
    }
    set(KEYS.factors, [...list, newFactor])
    return newFactor
  },
  deleteEmissionFactor: (id: string) => {
    const list = get<EmissionFactor[]>(KEYS.factors)
    set(KEYS.factors, list.filter(f => f.id !== id))
  },

  // Carbon Transactions
  getCarbonTransactions: () => {
    const txs = get<CarbonTransaction[]>(KEYS.txs)
    const depts = get<Department[]>(KEYS.depts)
    const factors = get<EmissionFactor[]>(KEYS.factors)
    return txs.map(tx => ({
      ...tx,
      department: depts.find(d => d.id === tx.department_id),
      emission_factor: factors.find(f => f.id === tx.emission_factor_id)
    }))
  },
  addCarbonTransaction: (tx: Omit<CarbonTransaction, 'id' | 'org_id' | 'created_at' | 'calculated_emission_kg'>) => {
    const txs = get<CarbonTransaction[]>(KEYS.txs)
    const factors = get<EmissionFactor[]>(KEYS.factors)
    const factor = factors.find(f => f.id === tx.emission_factor_id)
    const calculated_emission_kg = tx.quantity * (factor?.factor_value || 0)

    const newTx: CarbonTransaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      org_id: 'org-greentech-123',
      calculated_emission_kg,
      created_at: new Date().toISOString()
    }
    set(KEYS.txs, [newTx, ...txs])
    recalculateScores()
    return newTx
  },

  // Environmental Goals
  getGoals: () => get<EnvironmentalGoal[]>(KEYS.goals),
  addGoal: (goal: Omit<EnvironmentalGoal, 'id' | 'org_id' | 'created_at' | 'current_value'>) => {
    const goals = get<EnvironmentalGoal[]>(KEYS.goals)
    const newGoal: EnvironmentalGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      org_id: 'org-greentech-123',
      current_value: 0,
      created_at: new Date().toISOString()
    }
    set(KEYS.goals, [...goals, newGoal])
    return newGoal
  },
  updateGoalProgress: (id: string, currentValue: number) => {
    const goals = get<EnvironmentalGoal[]>(KEYS.goals)
    set(KEYS.goals, goals.map(g => {
      if (g.id === id) {
        const status = currentValue >= g.target_value ? 'completed' : g.status
        return { ...g, current_value: currentValue, status }
      }
      return g
    }))
    recalculateScores()
  },

  // CSR Activities
  getCSRActivities: () => get<CSRActivity[]>(KEYS.csr),
  addCSRActivity: (act: Omit<CSRActivity, 'id' | 'org_id' | 'created_at' | 'status'>) => {
    const list = get<CSRActivity[]>(KEYS.csr)
    const newAct: CSRActivity = {
      ...act,
      id: `csr-${Date.now()}`,
      org_id: 'org-greentech-123',
      status: 'active',
      created_at: new Date().toISOString()
    }
    set(KEYS.csr, [...list, newAct])
    return newAct
  },

  // Employee participations
  getCSRParticipations: () => {
    const list = get<EmployeeParticipation[]>(KEYS.participations)
    const users = get<Profile[]>(KEYS.users)
    const acts = get<CSRActivity[]>(KEYS.csr)
    return list.map(p => ({
      ...p,
      employee: users.find(u => u.id === p.employee_id),
      activity: acts.find(a => a.id === p.activity_id)
    }))
  },
  joinCSRActivity: (activityId: string, employeeId: string) => {
    const list = get<EmployeeParticipation[]>(KEYS.participations)
    if (list.some(p => p.activity_id === activityId && p.employee_id === employeeId)) return

    const newParticipation: EmployeeParticipation = {
      id: `part-${Date.now()}`,
      org_id: 'org-greentech-123',
      employee_id: employeeId,
      activity_id: activityId,
      proof_url: null,
      approval_status: 'pending',
      points_earned: 0,
      completion_date: null,
      notes: null,
      created_at: new Date().toISOString()
    }
    set(KEYS.participations, [...list, newParticipation])
  },
  approveCSRParticipation: (id: string, approve: boolean, proofUrl: string | null) => {
    const list = get<EmployeeParticipation[]>(KEYS.participations)
    const users = get<Profile[]>(KEYS.users)
    const acts = get<CSRActivity[]>(KEYS.csr)
    const org = this ? (this as any).getOrganization() : dbService.getOrganization()

    const itemIndex = list.findIndex(p => p.id === id)
    if (itemIndex === -1) return

    const item = list[itemIndex]
    const activity = acts.find(a => a.id === item.activity_id)

    if (approve && org.evidence_required && !proofUrl && !item.proof_url) {
      throw new Error("Proof of participation is required before approval.")
    }

    item.approval_status = approve ? 'approved' : 'rejected'
    if (approve && activity) {
      item.points_earned = activity.points_reward
      item.completion_date = new Date().toISOString().split('T')[0]

      // Award points and XP
      const userIndex = users.findIndex(u => u.id === item.employee_id)
      if (userIndex !== -1) {
        users[userIndex].total_points += activity.points_reward
        users[userIndex].total_xp += activity.points_reward
        dbService.addXPTransaction(item.employee_id, activity.points_reward, 'csr_activity', item.id, `Completed CSR Activity: ${activity.title}`)
      }
    }

    set(KEYS.participations, list)
    set(KEYS.users, users)
    
    // Auto badges check
    if (approve && org.badge_auto_award) {
      checkAndAwardBadges(item.employee_id)
    }
    recalculateScores()
  },

  // XP transactions audit log
  getXPTransactions: () => get<XPTransaction[]>(KEYS.xpTransactions),
  addXPTransaction: (employeeId: string, amount: number, sourceType: XPTransaction['source_type'], sourceId: string | null, description: string) => {
    const list = get<XPTransaction[]>(KEYS.xpTransactions)
    const newTx: XPTransaction = {
      id: `xp-tx-${Date.now()}`,
      org_id: 'org-greentech-123',
      employee_id: employeeId,
      amount,
      source_type: sourceType,
      source_id: sourceId,
      description,
      created_at: new Date().toISOString()
    }
    set(KEYS.xpTransactions, [newTx, ...list])
  },

  // Compliance Issues
  getComplianceIssues: () => {
    const list = get<ComplianceIssue[]>(KEYS.issues)
    const users = get<Profile[]>(KEYS.users)
    const depts = get<Department[]>(KEYS.depts)
    return list.map(i => ({
      ...i,
      owner: users.find(u => u.id === i.owner_id),
      department: depts.find(d => d.id === i.department_id)
    }))
  },
  addComplianceIssue: (issue: Omit<ComplianceIssue, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'status' | 'resolution_notes'>) => {
    if (!issue.owner_id) throw new Error("Compliance issue must have an assigned owner.")
    if (!issue.due_date) throw new Error("Compliance issue must have a due date.")

    const list = get<ComplianceIssue[]>(KEYS.issues)
    const newIssue: ComplianceIssue = {
      ...issue,
      id: `issue-${Date.now()}`,
      org_id: 'org-greentech-123',
      status: 'open',
      resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    set(KEYS.issues, [newIssue, ...list])
    recalculateScores()
    return newIssue
  },
  resolveComplianceIssue: (id: string, notes: string) => {
    const list = get<ComplianceIssue[]>(KEYS.issues)
    set(KEYS.issues, list.map(i => i.id === id ? { ...i, status: 'resolved', resolution_notes: notes, updated_at: new Date().toISOString() } : i))
    recalculateScores()
  },

  // Policies
  getPolicies: () => get<ESGPolicy[]>(KEYS.policies),
  addPolicy: (policy: Omit<ESGPolicy, 'id' | 'org_id' | 'created_at' | 'status'>) => {
    const list = get<ESGPolicy[]>(KEYS.policies)
    const newPolicy: ESGPolicy = {
      ...policy,
      id: `pol-${Date.now()}`,
      org_id: 'org-greentech-123',
      status: 'active',
      created_at: new Date().toISOString()
    }
    set(KEYS.policies, [...list, newPolicy])
    recalculateScores()
    return newPolicy
  },
  getAcknowledgements: () => get<PolicyAcknowledgement[]>(KEYS.acknowledgements),
  acknowledgePolicy: (policyId: string, employeeId: string) => {
    const list = get<PolicyAcknowledgement[]>(KEYS.acknowledgements)
    if (list.some(a => a.policy_id === policyId && a.employee_id === employeeId)) return

    const newAck: PolicyAcknowledgement = {
      id: `ack-${Date.now()}`,
      org_id: 'org-greentech-123',
      policy_id: policyId,
      employee_id: employeeId,
      acknowledged_at: new Date().toISOString()
    }
    set(KEYS.acknowledgements, [...list, newAck])
    recalculateScores()
  },

  // Audits
  getAudits: () => get<Audit[]>(KEYS.audits),
  addAudit: (audit: Omit<Audit, 'id' | 'org_id' | 'created_at'>) => {
    const list = get<Audit[]>(KEYS.audits)
    const newAudit: Audit = {
      ...audit,
      id: `aud-${Date.now()}`,
      org_id: 'org-greentech-123',
      created_at: new Date().toISOString()
    }
    set(KEYS.audits, [...list, newAudit])
    recalculateScores()
    return newAudit
  },

  // Challenges
  getChallenges: () => get<Challenge[]>(KEYS.challenges),
  addChallenge: (challenge: Omit<Challenge, 'id' | 'org_id' | 'created_at' | 'status'>) => {
    const list = get<Challenge[]>(KEYS.challenges)
    const newChallenge: Challenge = {
      ...challenge,
      id: `chal-${Date.now()}`,
      org_id: 'org-greentech-123',
      status: 'active',
      created_at: new Date().toISOString()
    }
    set(KEYS.challenges, [...list, newChallenge])
    return newChallenge
  },
  getChallengeParticipations: () => get<ChallengeParticipation[]>(KEYS.challengeParts),
  joinChallenge: (challengeId: string, employeeId: string) => {
    const list = get<ChallengeParticipation[]>(KEYS.challengeParts)
    if (list.some(p => p.challenge_id === challengeId && p.employee_id === employeeId)) return

    const newPart: ChallengeParticipation = {
      id: `cpart-${Date.now()}`,
      org_id: 'org-greentech-123',
      challenge_id: challengeId,
      employee_id: employeeId,
      progress: 0,
      proof_url: null,
      approval_status: 'pending',
      xp_awarded: 0,
      notes: null,
      created_at: new Date().toISOString()
    }
    set(KEYS.challengeParts, [...list, newPart])
  },
  submitChallengeProof: (challengeId: string, employeeId: string, proofUrl: string, notes: string) => {
    const list = get<ChallengeParticipation[]>(KEYS.challengeParts)
    set(KEYS.challengeParts, list.map(p => {
      if (p.challenge_id === challengeId && p.employee_id === employeeId) {
        return {
          ...p,
          progress: 100,
          proof_url: proofUrl,
          notes,
          approval_status: 'pending'
        }
      }
      return p
    }))
  },
  approveChallengeParticipation: (id: string, approve: boolean) => {
    const list = get<ChallengeParticipation[]>(KEYS.challengeParts)
    const users = get<Profile[]>(KEYS.users)
    const chals = get<Challenge[]>(KEYS.challenges)
    const org = dbService.getOrganization()

    const itemIndex = list.findIndex(p => p.id === id)
    if (itemIndex === -1) return

    const item = list[itemIndex]
    const challenge = chals.find(c => c.id === item.challenge_id)

    if (approve && org.evidence_required && !item.proof_url) {
      throw new Error("Proof of participation is required before approval.")
    }

    item.approval_status = approve ? 'approved' : 'rejected'
    if (approve && challenge) {
      item.xp_awarded = challenge.xp_reward
      item.progress = 100

      // Award points/XP
      const userIndex = users.findIndex(u => u.id === item.employee_id)
      if (userIndex !== -1) {
        users[userIndex].total_points += challenge.xp_reward
        users[userIndex].total_xp += challenge.xp_reward
        dbService.addXPTransaction(item.employee_id, challenge.xp_reward, 'challenge', item.id, `Completed Challenge: ${challenge.title}`)
      }
    }

    set(KEYS.challengeParts, list)
    set(KEYS.users, users)

    if (approve && org.badge_auto_award) {
      checkAndAwardBadges(item.employee_id)
    }
    recalculateScores()
  },

  // Badges & Awards
  getBadges: () => get<Badge[]>(KEYS.badges),
  getBadgeAwards: () => {
    const awards = get<BadgeAward[]>(KEYS.badgeAwards)
    const badges = get<Badge[]>(KEYS.badges)
    return awards.map(a => ({
      ...a,
      badge: badges.find(b => b.id === a.badge_id)
    }))
  },

  // Rewards catalog & Atomic redemption
  getRewards: () => get<Reward[]>(KEYS.rewards),
  addReward: (reward: Omit<Reward, 'id' | 'org_id' | 'created_at'>) => {
    const list = get<Reward[]>(KEYS.rewards)
    const newReward: Reward = {
      ...reward,
      id: `rew-${Date.now()}`,
      org_id: 'org-greentech-123',
      created_at: new Date().toISOString()
    }
    set(KEYS.rewards, [...list, newReward])
    return newReward
  },
  getRedemptions: () => {
    const list = get<RewardRedemption[]>(KEYS.redemptions)
    const rewards = get<Reward[]>(KEYS.rewards)
    const users = get<Profile[]>(KEYS.users)
    return list.map(r => ({
      ...r,
      reward: rewards.find(rw => rw.id === r.reward_id),
      employee: users.find(u => u.id === r.employee_id)
    }))
  },
  redeemReward: (rewardId: string, employeeId: string) => {
    // ATOMIC REDEMPTION (Protected simulated transaction)
    const rewards = get<Reward[]>(KEYS.rewards)
    const users = get<Profile[]>(KEYS.users)
    const redemptions = get<RewardRedemption[]>(KEYS.redemptions)

    const reward = rewards.find(r => r.id === rewardId)
    const user = users.find(u => u.id === employeeId)

    if (!reward) throw new Error("Reward not found.")
    if (!user) throw new Error("Employee not found.")

    if (reward.status !== 'active') throw new Error("Reward is currently inactive.")
    if (reward.stock <= 0) throw new Error("Reward is out of stock.")
    if (user.total_points < reward.points_required) {
      throw new Error(`Insufficient points balance. Needed: ${reward.points_required}, Balance: ${user.total_points}`)
    }

    // Atomic Deductions
    reward.stock -= 1
    user.total_points -= reward.points_required

    const newRedemption: RewardRedemption = {
      id: `red-${Date.now()}`,
      org_id: 'org-greentech-123',
      reward_id: rewardId,
      employee_id: employeeId,
      status: 'pending',
      redeemed_at: new Date().toISOString(),
      fulfilled_at: null
    }

    set(KEYS.rewards, rewards)
    set(KEYS.users, users)
    set(KEYS.redemptions, [newRedemption, ...redemptions])

    // Create notifications
    dbService.addNotification(employeeId, 'reward_redeemed', '🎁 Reward Redeemed!', `You redeemed ${reward.name} for ${reward.points_required} points.`)
    
    // Notify all admins
    users.filter(u => u.role === 'admin').forEach(admin => {
      dbService.addNotification(admin.id, 'reward_redeemed', '🔔 New Reward Redemption', `${user.full_name} redeemed ${reward.name}. Fulfill request in Settings.`)
    })

    return newRedemption
  },
  fulfillRedemption: (id: string) => {
    const list = get<RewardRedemption[]>(KEYS.redemptions)
    set(KEYS.redemptions, list.map(r => r.id === id ? { ...r, status: 'fulfilled', fulfilled_at: new Date().toISOString() } : r))
  },

  // Notifications
  getNotifications: (recipientId: string) => {
    const list = get<Notification[]>(KEYS.notifications)
    return list.filter(n => n.recipient_id === recipientId)
  },
  addNotification: (recipientId: string, type: Notification['type'], title: string, body: string) => {
    const list = get<Notification[]>(KEYS.notifications)
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      org_id: 'org-greentech-123',
      recipient_id: recipientId,
      type,
      title,
      body,
      read: false,
      action_url: null,
      created_at: new Date().toISOString()
    }
    set(KEYS.notifications, [newNotif, ...list])
  },
  markNotificationRead: (id: string) => {
    const list = get<Notification[]>(KEYS.notifications)
    set(KEYS.notifications, list.map(n => n.id === id ? { ...n, read: true } : n))
  },

  // Department scores
  getDepartmentScores: () => {
    const scores = get<DepartmentScore[]>(KEYS.scores)
    const depts = get<Department[]>(KEYS.depts)
    return scores.map(s => ({
      ...s,
      department: depts.find(d => d.id === s.department_id)
    }))
  }
}

// ─── Badge Auto-Award Checker ────────────────────────────────
function checkAndAwardBadges(employeeId: string) {
  const users = get<Profile[]>(KEYS.users)
  const user = users.find(u => u.id === employeeId)
  if (!user) return

  const challenges = get<ChallengeParticipation[]>(KEYS.challengeParts)
    .filter(p => p.employee_id === employeeId && p.approval_status === 'approved').length

  const csrs = get<EmployeeParticipation[]>(KEYS.participations)
    .filter(p => p.employee_id === employeeId && p.approval_status === 'approved').length

  const badgeAwards = get<BadgeAward[]>(KEYS.badgeAwards)
  const badgesList = get<Badge[]>(KEYS.badges)

  badgesList.forEach(badge => {
    const alreadyAwarded = badgeAwards.some(a => a.badge_id === badge.id && a.employee_id === employeeId)
    if (alreadyAwarded) return

    let unlock = false
    if (badge.unlock_rule_type === 'xp_threshold' && user.total_xp >= badge.unlock_rule_value) {
      unlock = true
    } else if (badge.unlock_rule_type === 'challenges_completed' && challenges >= badge.unlock_rule_value) {
      unlock = true
    } else if (badge.unlock_rule_type === 'csr_activities_completed' && csrs >= badge.unlock_rule_value) {
      unlock = true
    }

    if (unlock) {
      const newAward: BadgeAward = {
        id: `award-${Date.now()}`,
        org_id: 'org-greentech-123',
        badge_id: badge.id,
        employee_id: employeeId,
        awarded_at: new Date().toISOString(),
        awarded_by: null
      }
      set(KEYS.badgeAwards, [...badgeAwards, newAward])
      dbService.addNotification(employeeId, 'badge_unlocked', `🏆 Badge Unlocked!`, `Congratulations, you unlocked the "${badge.name}" badge!`)
    }
  })
}

// ─── Real-Time ESG Scoring Calculator ──────────────────────────
export function recalculateScores() {
  const depts = get<Department[]>(KEYS.depts).filter(d => d.status === 'active')
  const org = dbService.getOrganization()
  const goals = get<EnvironmentalGoal[]>(KEYS.goals).filter(g => g.status === 'active')
  const txs = get<CarbonTransaction[]>(KEYS.txs)
  const participations = get<EmployeeParticipation[]>(KEYS.participations).filter(p => p.approval_status === 'approved')
  const issues = get<ComplianceIssue[]>(KEYS.issues).filter(i => i.status !== 'resolved')
  const audits = get<Audit[]>(KEYS.audits)
  const policies = get<ESGPolicy[]>(KEYS.policies).filter(p => p.status === 'active')
  const acknowledgements = get<PolicyAcknowledgement[]>(KEYS.acknowledgements)

  const newScores: DepartmentScore[] = []

  depts.forEach(dept => {
    // 1. Environmental Score (Goals + Trajectories)
    const deptGoals = goals.filter(g => g.department_id === dept.id || g.department_id === null)
    let env_score = 100
    if (deptGoals.length > 0) {
      let deductions = 0
      deptGoals.forEach(g => {
        const ratio = g.current_value / g.target_value
        if (ratio > 1.0) {
          deductions += Math.min(30, (ratio - 1.0) * 30)
        }
      })
      env_score = Math.max(0, 100 - deductions)
    } else {
      env_score = 70 // default neutral state
    }

    // 2. Social Score (CSR rate + Diversity + Training rate)
    const deptEmpCount = Math.max(1, dept.employee_count)
    const deptCSRCount = participations.filter(p => p.employee?.department_id === dept.id).length
    const csrRate = Math.min(1.0, deptCSRCount / deptEmpCount)
    const trainingRate = 0.85 // default mock rate
    const diversity = 75 // default diversity percentage

    const social_score = (csrRate * 40) + (trainingRate * 30) + (diversity * 0.3)

    // 3. Governance Score (Policy ack rate + Audits completion rate - Penalties)
    let policyRate = 1.0
    if (policies.length > 0) {
      const ackCount = acknowledgements.filter(a => {
        const u = get<Profile[]>(KEYS.users).find(usr => usr.id === a.employee_id)
        return u?.department_id === dept.id
      }).length
      policyRate = Math.min(1.0, ackCount / (deptEmpCount * policies.length))
    }

    const deptAudits = audits.filter(a => a.department_id === dept.id)
    const completedAudits = deptAudits.filter(a => a.status === 'completed').length
    const auditRate = deptAudits.length > 0 ? (completedAudits / deptAudits.length) : 1.0

    let penalties = 0
    const deptIssues = issues.filter(i => i.department_id === dept.id)
    deptIssues.forEach(i => {
      if (i.severity === 'critical') penalties += 15
      else if (i.severity === 'high') penalties += 10
      else if (i.severity === 'medium') penalties += 5
      else if (i.severity === 'low') penalties += 2
      
      // Additional penalty for overdue
      const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'resolved'
      if (isOverdue) penalties += 5
    })

    const gov_score = Math.max(0, (policyRate * 40) + (auditRate * 30) + 30 - penalties)

    // 4. Combined Weight Score
    const total_score = (env_score * org.env_weight / 100) +
                        (social_score * org.social_weight / 100) +
                        (gov_score * org.gov_weight / 100)

    newScores.push({
      id: `score-${dept.id}-${Date.now()}`,
      org_id: 'org-greentech-123',
      department_id: dept.id,
      env_score: parseFloat(env_score.toFixed(1)),
      social_score: parseFloat(social_score.toFixed(1)),
      gov_score: parseFloat(gov_score.toFixed(1)),
      total_score: parseFloat(total_score.toFixed(1)),
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      calculated_at: new Date().toISOString()
    })
  })

  set(KEYS.scores, newScores)
}
