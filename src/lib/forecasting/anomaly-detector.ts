/**
 * EcoSphere AI — Anomaly Detector
 *
 * Detects unusual ESG score patterns using a rolling Z-score approach.
 * Any data point more than 2 standard deviations from the rolling 3-period
 * mean is flagged as an anomaly.
 *
 * @module forecasting/anomaly-detector
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Anomaly {
  index:    number
  date:     string
  value:    number
  expected: number
  zScore:   number
  severity: 'warning' | 'critical'
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[]
  stats: {
    mean:   number
    stdDev: number
    count:  number
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect anomalies in an ESG time series using a rolling Z-score.
 *
 * @param scores - Array of score values (oldest first)
 * @param dates  - Corresponding date strings (same length as scores)
 * @param windowSize - Rolling window size for local mean/stddev (default 3)
 * @param warnThreshold  - Z-score threshold for 'warning' (default 2.0)
 * @param critThreshold  - Z-score threshold for 'critical' (default 3.0)
 */
export function detectAnomalies(
  scores: number[],
  dates: string[],
  windowSize = 3,
  warnThreshold = 2.0,
  critThreshold = 3.0
): AnomalyDetectionResult {
  const anomalies: Anomaly[] = []

  if (scores.length < windowSize + 1) {
    const globalMean = mean(scores)
    const globalStd  = stdDev(scores, globalMean)
    return {
      anomalies: [],
      stats: { mean: Math.round(globalMean * 10) / 10, stdDev: Math.round(globalStd * 100) / 100, count: 0 },
    }
  }

  for (let i = windowSize; i < scores.length; i++) {
    const window = scores.slice(i - windowSize, i)
    const localMean = mean(window)
    const localStd  = stdDev(window, localMean)

    if (localStd < 1e-9) continue // no variance — skip

    const zScore = (scores[i] - localMean) / localStd
    const absZ   = Math.abs(zScore)

    if (absZ >= warnThreshold) {
      anomalies.push({
        index:    i,
        date:     dates[i] ?? `Period ${i + 1}`,
        value:    Math.round(scores[i] * 10) / 10,
        expected: Math.round(localMean * 10) / 10,
        zScore:   Math.round(zScore * 100) / 100,
        severity: absZ >= critThreshold ? 'critical' : 'warning',
      })
    }
  }

  const globalMean = mean(scores)
  const globalStd  = stdDev(scores, globalMean)

  return {
    anomalies,
    stats: {
      mean:   Math.round(globalMean * 10) / 10,
      stdDev: Math.round(globalStd * 100) / 100,
      count:  anomalies.length,
    },
  }
}
