/**
 * ESG Utility Helpers
 * Shared calculation and formatting utilities used across all ESG modules.
 */

// ─── Number & Score Formatters ────────────────────────────────────────────────

/** Format a kg CO₂ value to human-readable string (kg or tonnes) */
export function formatEmission(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t CO₂e`
  return `${kg.toFixed(1)} kg CO₂e`
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Round to N decimal places */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/** Format a score (0-100) with a color class for severity indication */
export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

/** Format a percentage delta with sign */
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}%`
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

/** ISO date string (YYYY-MM-DD) from a Date object */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Days remaining until a deadline; negative means overdue */
export function daysUntil(deadline: string): number {
  const now = new Date()
  const due = new Date(deadline)
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** Return whether a deadline string is past */
export function isOverdue(deadline: string): boolean {
  return daysUntil(deadline) < 0
}

/** Human-readable relative date label */
export function relativeDate(dateStr: string): string {
  const days = daysUntil(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0) return `In ${days} days`
  return `${Math.abs(days)} days ago`
}

// ─── ESG Score Utilities ──────────────────────────────────────────────────────

/**
 * Compute a weighted ESG composite score.
 * Weights must sum to 1.0 (or will be normalized automatically).
 */
export function compositeScore(
  env: number,
  social: number,
  gov: number,
  weights: { env: number; social: number; gov: number } = { env: 0.4, social: 0.35, gov: 0.25 }
): number {
  const total = weights.env + weights.social + weights.gov
  const w = {
    env: weights.env / total,
    social: weights.social / total,
    gov: weights.gov / total,
  }
  return round(env * w.env + social * w.social + gov * w.gov)
}

/** Map a 0-100 score to a letter grade */
export function letterGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

// ─── Array Utilities ──────────────────────────────────────────────────────────

/** Group an array of objects by a key */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

/** Sum a numeric field across an array */
export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0)
}

/** Average a numeric field across an array (returns 0 for empty arrays) */
export function avgBy<T>(arr: T[], key: keyof T): number {
  if (arr.length === 0) return 0
  return sumBy(arr, key) / arr.length
}

/** Unique values from an array */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

/** Generate a pseudo-random ID (crypto-quality not required for client-side demo) */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
