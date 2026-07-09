import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`
  return n.toFixed(decimals)
}

export function formatCO2(kgCO2: number): string {
  if (kgCO2 >= 1000) {
    return `${(kgCO2 / 1000).toFixed(2)} tCO₂e`
  }
  return `${kgCO2.toFixed(1)} kgCO₂e`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diff = (new Date(date).getTime() - Date.now()) / 1000

  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second')
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-950/30'
    case 'high': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/30'
    case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30'
    case 'low': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30'
    default: return 'text-muted-foreground bg-muted'
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

export function calculateLinearForecast(
  values: number[],
  periods: number
): number[] {
  const n = values.length
  if (n < 2) return Array(periods).fill(values[0] ?? 0)

  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  return Array.from({ length: periods }, (_, i) =>
    Math.max(0, Math.min(100, intercept + slope * (n + i)))
  )
}
