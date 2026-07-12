/**
 * EcoSphere AI — Holt-Winters Triple Exponential Smoothing
 *
 * Implements additive Holt-Winters for ESG time series forecasting.
 * Auto-optimises α (level), β (trend), γ (seasonality) by minimising MSE
 * on the historical data via a grid search.
 *
 * Falls back to simple linear regression when < 6 data points are present.
 *
 * @module forecasting/holt-winters
 */

import { calculateLinearForecast } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HoltWintersResult {
  forecast: number[]
  confidenceInterval: {
    lower: number[]
    upper: number[]
  }
  accuracy: {
    mape: number  // Mean Absolute Percentage Error (%)
    rmse: number  // Root Mean Square Error
  }
  model: 'holt-winters' | 'linear-fallback'
  params: {
    alpha: number
    beta: number
    gamma: number
    period: number
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100) {
  return Math.min(Math.max(v, lo), hi)
}

/**
 * Run one pass of additive Holt-Winters smoothing.
 * Returns the fitted values (in-sample) and next `horizon` forecasts.
 */
function holtsWintersPass(
  data: number[],
  alpha: number,
  beta: number,
  gamma: number,
  period: number,
  horizon: number
): { fitted: number[]; forecast: number[] } {
  const n = data.length
  if (n < period * 2) {
    // Not enough data for full seasonality init — use naive
    const avg = data.reduce((a, b) => a + b, 0) / n
    return {
      fitted:   data.map(() => avg),
      forecast: Array(horizon).fill(avg),
    }
  }

  // Initialise level, trend, and seasonal indices
  let L = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  let T = 0
  for (let i = 0; i < period; i++) {
    T += (data[period + i] - data[i]) / period
  }
  T /= period

  const S: number[] = new Array(period)
  for (let i = 0; i < period; i++) {
    S[i] = data[i] / L
  }

  const fitted: number[] = []

  // Forward pass — update level, trend, seasonality
  for (let t = 0; t < n; t++) {
    const seasonalIdx = t % period
    const prevL = L
    const prevT = T
    const prevS = S[seasonalIdx]

    L = alpha * (data[t] - prevS) + (1 - alpha) * (prevL + prevT)
    T = beta  * (L - prevL)       + (1 - beta)  * prevT
    S[seasonalIdx] = gamma * (data[t] / L) + (1 - gamma) * prevS

    fitted.push((prevL + prevT) * S[seasonalIdx])
  }

  // Forecast next `horizon` periods
  const forecast: number[] = []
  for (let h = 1; h <= horizon; h++) {
    const seasonalIdx = (n + h - 1) % period
    forecast.push((L + T * h) * S[seasonalIdx])
  }

  return { fitted, forecast }
}

/** Compute MSE between actual and fitted values */
function mse(actual: number[], fitted: number[]): number {
  const n = Math.min(actual.length, fitted.length)
  if (n === 0) return Infinity
  return actual.slice(0, n).reduce((sum, v, i) => sum + (v - fitted[i]) ** 2, 0) / n
}

/** Compute MAPE (%) */
function mape(actual: number[], fitted: number[]): number {
  const n = Math.min(actual.length, fitted.length)
  if (n === 0) return Infinity
  const sum = actual.slice(0, n).reduce((s, v, i) => {
    if (Math.abs(v) < 1e-9) return s
    return s + Math.abs((v - fitted[i]) / v)
  }, 0)
  return (sum / n) * 100
}

/** Compute RMSE */
function rmse(actual: number[], fitted: number[]): number {
  return Math.sqrt(mse(actual, fitted))
}

/**
 * Grid-search α, β, γ over [0.1, 0.2, …, 0.9] to minimise MSE on `data`.
 * Returns the best params found.
 */
function optimiseParams(
  data: number[],
  period: number
): { alpha: number; beta: number; gamma: number } {
  const steps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
  let bestAlpha = 0.3, bestBeta = 0.1, bestGamma = 0.2, bestMse = Infinity

  for (const alpha of steps) {
    for (const beta of steps) {
      for (const gamma of steps) {
        const { fitted } = holtsWintersPass(data, alpha, beta, gamma, period, 0)
        const err = mse(data, fitted)
        if (err < bestMse) {
          bestMse = err
          bestAlpha = alpha
          bestBeta  = beta
          bestGamma = gamma
        }
      }
    }
  }

  return { alpha: bestAlpha, beta: bestBeta, gamma: bestGamma }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run Holt-Winters forecasting on ESG score history.
 *
 * @param historicalScores - Array of historical ESG scores (oldest first)
 * @param horizon          - Number of future periods to forecast (default 6)
 * @param period           - Seasonality period in data units (default 4 for quarterly pattern)
 */
export function holtsWintersForecast(
  historicalScores: number[],
  horizon = 6,
  period = 4
): HoltWintersResult {
  const data = historicalScores.filter(v => isFinite(v) && !isNaN(v))

  // ── Fall back to linear regression if insufficient data ──────────────────
  if (data.length < 6) {
    const linearForecast = calculateLinearForecast(data, horizon)
    const sigma = data.length >= 2
      ? Math.sqrt(data.reduce((s, v, i) => s + (v - (data[i - 1] ?? v)) ** 2, 0) / data.length)
      : 2

    return {
      forecast: linearForecast.map(v => Math.round(clamp(v) * 10) / 10),
      confidenceInterval: {
        lower: linearForecast.map((v, i) => Math.round(clamp(v - sigma * (i + 1)) * 10) / 10),
        upper: linearForecast.map((v, i) => Math.round(clamp(v + sigma * (i + 1)) * 10) / 10),
      },
      accuracy: { mape: 0, rmse: 0 },
      model:  'linear-fallback',
      params: { alpha: 0, beta: 0, gamma: 0, period },
    }
  }

  // ── Optimise smoothing parameters ────────────────────────────────────────
  const { alpha, beta, gamma } = optimiseParams(data, period)

  // ── Run final pass with optimal params ───────────────────────────────────
  const { fitted, forecast } = holtsWintersPass(data, alpha, beta, gamma, period, horizon)

  // ── Compute accuracy metrics ──────────────────────────────────────────────
  const accuracyMape = Math.round(mape(data, fitted) * 10) / 10
  const accuracyRmse = Math.round(rmse(data, fitted) * 100) / 100

  // ── Confidence intervals (widen with horizon) ─────────────────────────────
  const residuals = data.map((v, i) => v - fitted[i])
  const sigma = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)

  const lower = forecast.map((v, i) => Math.round(clamp(v - sigma * 1.96 * Math.sqrt(i + 1)) * 10) / 10)
  const upper = forecast.map((v, i) => Math.round(clamp(v + sigma * 1.96 * Math.sqrt(i + 1)) * 10) / 10)

  return {
    forecast:           forecast.map(v => Math.round(clamp(v) * 10) / 10),
    confidenceInterval: { lower, upper },
    accuracy:           { mape: accuracyMape, rmse: accuracyRmse },
    model:              'holt-winters',
    params:             { alpha, beta, gamma, period },
  }
}

/** Human-readable accuracy label based on MAPE */
export function accuracyLabel(mapeValue: number): string {
  if (mapeValue < 5)  return 'High accuracy'
  if (mapeValue < 10) return 'Medium accuracy'
  if (mapeValue < 20) return 'Low accuracy'
  return 'Insufficient data'
}

/** Determine top 3 forecast drivers based on score components */
export function getForecastDrivers(
  envScore: number,
  socScore: number,
  govScore: number
): Array<{ driver: string; impact: 'positive' | 'negative' | 'neutral'; description: string }> {
  const drivers = []

  if (envScore < 70) {
    drivers.push({
      driver: 'Environmental goals behind trajectory',
      impact: 'negative' as const,
      description: `Environmental score at ${envScore.toFixed(1)}/100 — goal gaps are the primary drag.`,
    })
  }

  if (govScore < 70) {
    drivers.push({
      driver: 'Unresolved compliance issues',
      impact: 'negative' as const,
      description: `Governance score at ${govScore.toFixed(1)}/100 — open issues are penalising the score.`,
    })
  }

  if (socScore >= 70) {
    drivers.push({
      driver: 'Strong social participation rate',
      impact: 'positive' as const,
      description: `Social score at ${socScore.toFixed(1)}/100 is providing a stabilising uplift.`,
    })
  }

  if (drivers.length === 0) {
    drivers.push({
      driver: 'Balanced ESG performance',
      impact: 'neutral' as const,
      description: 'All pillars are performing within acceptable ranges.',
    })
  }

  return drivers.slice(0, 3)
}
