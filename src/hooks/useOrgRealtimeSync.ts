/**
 * useOrgRealtimeSync — Org-scoped Supabase Realtime orchestrator
 *
 * Subscribes to all ESG-relevant tables for the current org and:
 * - Invalidates the correct TanStack Query caches on change
 * - Fires toast notifications for key events (e.g. new emissions)
 * - Exposes connection state for the LiveIndicator component
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { RealtimeChannel } from '@supabase/supabase-js'

const IS_MOCK_MODE = !import.meta.env.VITE_SUPABASE_URL

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline'

export interface OrgRealtimeSyncOptions {
  orgId:   string | null
  enabled: boolean
  onNewEmission?: (row: {
    calculated_emission_kg: number
    department?: { name: string }
    source_type: string
  }) => void
}

/**
 * Subscribes to all tables that contribute to the ESG score for `orgId`.
 * In mock mode this immediately returns `{ status: 'offline' }`.
 *
 * @returns `{ status }` — use with LiveIndicator
 */
export function useOrgRealtimeSync({
  orgId,
  enabled,
  onNewEmission,
}: OrgRealtimeSyncOptions): { status: ConnectionStatus } {
  const [status, setStatus] = useState<ConnectionStatus>(IS_MOCK_MODE ? 'offline' : 'reconnecting')
  const presenceChannelRef   = useRef<RealtimeChannel | null>(null)

  // ── Presence / heartbeat channel to derive connection status ──────────────
  useEffect(() => {
    if (IS_MOCK_MODE || !enabled || !orgId) {
      setStatus('offline')
      return
    }

    const ch = supabase.channel(`ecosphere:presence:${orgId}`)
      .on('system' as any, { event: 'connected' }, () => setStatus('connected'))
      .on('system' as any, { event: 'disconnected' }, () => setStatus('reconnecting'))
      .subscribe((st) => {
        if (st === 'SUBSCRIBED')    setStatus('connected')
        if (st === 'CHANNEL_ERROR') setStatus('reconnecting')
        if (st === 'CLOSED')        setStatus('offline')
      })

    presenceChannelRef.current = ch

    return () => {
      supabase.removeChannel(ch)
      presenceChannelRef.current = null
      setStatus('offline')
    }
  }, [orgId, enabled])

  // ── carbon_transactions ────────────────────────────────────────────────────
  useRealtimeSubscription({
    table:          'carbon_transactions',
    filter:         orgId ? `org_id=eq.${orgId}` : undefined,
    enabled:        enabled && !!orgId,
    invalidateKeys: [['emissions', orgId ?? '']],
    onInsert:       onNewEmission
      ? (row: any) => onNewEmission({
          calculated_emission_kg: row.calculated_emission_kg ?? 0,
          department: row.department,
          source_type: row.source_type ?? 'Unknown',
        })
      : undefined,
  })

  // ── compliance_issues ──────────────────────────────────────────────────────
  useRealtimeSubscription({
    table:          'compliance_issues',
    filter:         orgId ? `org_id=eq.${orgId}` : undefined,
    enabled:        enabled && !!orgId,
    invalidateKeys: [['governance', orgId ?? '']],
  })

  // ── csr_activities ─────────────────────────────────────────────────────────
  useRealtimeSubscription({
    table:          'csr_activities',
    filter:         orgId ? `org_id=eq.${orgId}` : undefined,
    enabled:        enabled && !!orgId,
    invalidateKeys: [['social', orgId ?? '']],
  })

  // ── policy_acknowledgements ────────────────────────────────────────────────
  useRealtimeSubscription({
    table:          'policy_acknowledgements',
    filter:         orgId ? `org_id=eq.${orgId}` : undefined,
    enabled:        enabled && !!orgId,
    invalidateKeys: [['governance', 'policies', orgId ?? '']],
  })

  // ── xp_transactions (gamification leaderboard) ────────────────────────────
  useRealtimeSubscription({
    table:          'xp_transactions',
    filter:         orgId ? `org_id=eq.${orgId}` : undefined,
    enabled:        enabled && !!orgId,
    invalidateKeys: [['leaderboard', orgId ?? '']],
  })

  return { status }
}
