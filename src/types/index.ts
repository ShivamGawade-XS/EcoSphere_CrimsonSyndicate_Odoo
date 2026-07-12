// ─── Core Entity Types ────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'executive' | 'esg_manager' | 'dept_head' | 'employee'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  total_xp: number
  total_points: number
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  env_weight: number
  social_weight: number
  gov_weight: number
  auto_emission_calc: boolean
  evidence_required: boolean
  badge_auto_award: boolean
  notify_in_app: boolean
  notify_email: boolean
  notify_email_admin: string | null
  policy_reminder_days: number
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  parent_id: string | null
  head_id: string | null
  employee_count: number
  status: 'active' | 'inactive'
  org_id: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: 'csr_activity' | 'challenge'
  status: 'active' | 'inactive'
  org_id: string
}

// ─── Environmental Types ──────────────────────────────────────────────────────

export type EmissionActivityType = 'purchase' | 'manufacturing' | 'expense' | 'fleet' | 'other'

export interface EmissionFactor {
  id: string
  name: string
  activity_type: EmissionActivityType
  factor_value: number
  unit: string
  source: string | null
  org_id: string
  created_at: string
}

export interface CarbonTransaction {
  id: string
  department_id: string
  emission_factor_id: string
  quantity: number
  calculated_emission_kg: number
  auto_calculated: boolean
  source_type: EmissionActivityType
  date: string
  notes: string | null
  org_id: string
  created_at: string
  // joins
  department?: Department
  emission_factor?: EmissionFactor
}

export interface EnvironmentalGoal {
  id: string
  title: string
  description: string | null
  department_id: string | null
  target_value: number
  current_value: number
  unit: string
  start_date: string
  deadline: string
  status: 'active' | 'completed' | 'missed' | 'draft'
  org_id: string
  created_at: string
}

// ─── Social Types ─────────────────────────────────────────────────────────────

export interface CSRActivity {
  id: string
  title: string
  category_id: string | null
  date: string
  points_reward: number
  description: string | null
  max_participants: number | null
  department_id: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  org_id: string
  created_at: string
}

export interface EmployeeParticipation {
  id: string
  employee_id: string
  activity_id: string
  proof_url: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  points_earned: number
  completion_date: string | null
  notes: string | null
  org_id: string
  created_at: string
  // joins
  employee?: Profile
  activity?: CSRActivity
}

// ─── Governance Types ─────────────────────────────────────────────────────────

export interface ESGPolicy {
  id: string
  title: string
  description: string | null
  category: 'environmental' | 'social' | 'governance'
  version: string
  effective_date: string
  review_date: string | null
  status: 'draft' | 'active' | 'archived'
  document_url: string | null
  org_id: string
  created_at: string
}

export interface PolicyAcknowledgement {
  id: string
  policy_id: string
  employee_id: string
  acknowledged_at: string
  org_id: string
}

export interface Audit {
  id: string
  title: string
  department_id: string
  auditor_id: string | null
  scope: string | null
  scheduled_date: string
  findings: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  org_id: string
  created_at: string
}

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'overdue'

export interface ComplianceIssue {
  id: string
  title: string
  description: string | null
  severity: IssueSeverity
  status: IssueStatus
  owner_id: string           // NON-NULLABLE — required
  due_date: string           // NON-NULLABLE — required
  department_id: string | null
  audit_id: string | null
  resolution_notes: string | null
  org_id: string
  created_at: string
  updated_at: string
  // joins
  owner?: Profile
  department?: Department
}

// ─── Gamification Types ───────────────────────────────────────────────────────

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type ChallengeStatus = 'draft' | 'active' | 'under_review' | 'completed' | 'archived'

export interface Challenge {
  id: string
  title: string
  description: string | null
  category_id: string | null
  xp_reward: number
  difficulty: ChallengeDifficulty
  evidence_required: boolean
  deadline: string | null
  department_id: string | null
  status: ChallengeStatus
  org_id: string
  created_at: string
}

export interface ChallengeParticipation {
  id: string
  challenge_id: string
  employee_id: string
  progress: number
  proof_url: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  xp_awarded: number
  notes: string | null
  org_id: string
  created_at: string
}

export type BadgeUnlockRuleType = 'xp_threshold' | 'challenges_completed' | 'csr_activities_completed'

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string
  unlock_rule_type: BadgeUnlockRuleType
  unlock_rule_value: number
  org_id: string
  created_at: string
}

export interface BadgeAward {
  id: string
  badge_id: string
  employee_id: string
  awarded_at: string
  awarded_by: string | null  // null = auto-awarded
  org_id: string
  badge?: Badge
}

export interface Reward {
  id: string
  name: string
  description: string | null
  points_required: number
  stock: number
  status: 'active' | 'inactive'
  org_id: string
  created_at: string
}

export interface RewardRedemption {
  id: string
  reward_id: string
  employee_id: string
  status: 'pending' | 'fulfilled' | 'cancelled'
  redeemed_at: string
  fulfilled_at: string | null
  org_id: string
  reward?: Reward
  employee?: Profile
}

// ─── Score Types ──────────────────────────────────────────────────────────────

export interface DepartmentScore {
  id: string
  department_id: string
  env_score: number
  social_score: number
  gov_score: number
  total_score: number
  period_start: string
  period_end: string
  org_id: string
  calculated_at: string
  department?: Department
}

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationType =
  | 'compliance_issue_created'
  | 'csr_approved'
  | 'csr_rejected'
  | 'challenge_approved'
  | 'challenge_rejected'
  | 'policy_reminder'
  | 'badge_unlocked'
  | 'reward_redeemed'
  | 'overdue_issue'

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  action_url: string | null
  org_id: string
  created_at: string
}

// ─── XP Transaction Types ─────────────────────────────────────────────────────

export interface XPTransaction {
  id: string
  employee_id: string
  amount: number
  source_type: 'challenge' | 'csr_activity' | 'badge' | 'manual'
  source_id: string | null
  description: string
  org_id: string
  created_at: string
}

// ─── Training & Development Types ─────────────────────────────────────────────

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'failed'

export interface TrainingRecord {
  id: string
  employee_id: string
  department_id: string | null
  title: string
  provider: string | null
  category: 'safety' | 'compliance' | 'technical' | 'soft_skills' | 'esg_awareness'
  duration_hours: number
  completion_date: string | null
  status: TrainingStatus
  score: number | null        // 0-100 if assessed
  certificate_url: string | null
  org_id: string
  created_at: string
  // joins
  employee?: Profile
  department?: Department
}

// ─── Supply Chain & Supplier Scorecard Types ──────────────────────────────────
export interface SupplierRecord {
  id: string
  name: string
  category: string
  country: string
  envScore: number
  socialScore: number
  govScore: number
  overallScore: number
  riskLevel: 'low' | 'medium' | 'high'
  lastAudit: string
  certifications: string[]
}

// ─── Materiality Matrix Types ─────────────────────────────────────────────────
export interface MaterialityTopic {
  id: string
  name: string
  category: 'environmental' | 'social' | 'governance'
  stakeholderImpact: number // 1 to 5
  businessImpact: number // 1 to 5
  description: string
}

