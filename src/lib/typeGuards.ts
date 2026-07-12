/**
 * Runtime type guard utilities for ESG domain types.
 * Useful for validating data coming from CSV imports or external APIs.
 */
import type { IssueSeverity, IssueStatus, TrainingStatus, UserRole } from '@/types'

export const VALID_SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low']
export const VALID_ISSUE_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved', 'overdue']
export const VALID_TRAINING_STATUSES: TrainingStatus[] = ['not_started', 'in_progress', 'completed', 'failed']
export const VALID_ROLES: UserRole[] = ['admin', 'executive', 'esg_manager', 'dept_head', 'employee']

export function isValidSeverity(v: string): v is IssueSeverity {
  return VALID_SEVERITIES.includes(v as IssueSeverity)
}

export function isValidIssueStatus(v: string): v is IssueStatus {
  return VALID_ISSUE_STATUSES.includes(v as IssueStatus)
}

export function isValidTrainingStatus(v: string): v is TrainingStatus {
  return VALID_TRAINING_STATUSES.includes(v as TrainingStatus)
}

export function isValidRole(v: string): v is UserRole {
  return VALID_ROLES.includes(v as UserRole)
}

/** Parse a CSV row value to a number, returning null if invalid */
export function parseNumber(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v.trim())
  return isNaN(n) ? null : n
}

/** Parse a CSV date string, returning null if invalid ISO format */
export function parseDate(v: string | undefined): string | null {
  if (!v || !v.trim()) return null
  const d = new Date(v.trim())
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}
