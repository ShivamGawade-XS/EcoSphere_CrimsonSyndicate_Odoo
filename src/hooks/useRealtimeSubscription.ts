/**
 * useRealtimeSubscription — Generic Supabase Realtime channel hook
 *
 * Wraps the Supabase channel API with automatic lifecycle management.
 * In mock mode (placeholder Supabase URL) this hook is a no-op.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const IS_MOCK_MODE = !import.meta.env.VITE_SUPABASE_URL

export interface RealtimeSubscriptionOptions<T = Record<string, unknown>> {
  /** Database table to subscribe to */
  table:     string
  /** Optional Postgres filter, e.g. 'org_id=eq.abc123' */
  filter?:   string
  /** Called when a new row is inserted */
  onInsert?: (row: T) => void
  /** Called when an existing row is updated */
  onUpdate?: (row: T) => void
  /** Called when a row is deleted — `row` contains the old record */
  onDelete?: (row: T) => void
  /** Query keys to invalidate on any change event */
  invalidateKeys?: string[][]
  /** Set to false to temporarily disable the subscription */
  enabled?: boolean
}

/**
 * Subscribe to real-time changes on a Supabase table.
 *
 * @example
 * useRealtimeSubscription({
 *   table: 'carbon_transactions',
 *   filter: `org_id=eq.${orgId}`,
 *   onInsert: (row) => toast(`New emission: ${row.calculated_emission_kg} kg`),
 *   invalidateKeys: [['emissions', orgId]],
 * })
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  options: RealtimeSubscriptionOptions<T>
) {
  const {
    table,
    filter,
    onInsert,
    onUpdate,
    onDelete,
    invalidateKeys = [],
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const channelRef  = useRef<RealtimeChannel | null>(null)

  const invalidate = useCallback(() => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }, [queryClient, invalidateKeys])

  useEffect(() => {
    if (IS_MOCK_MODE || !enabled) return

    const channelName = `${table}:${filter ?? 'all'}`

    const channelConfig = supabase.channel(channelName).on(
      'postgres_changes' as any,
      {
        event:  '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload: any) => {
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload.new as T)
            invalidate()
            break
          case 'UPDATE':
            onUpdate?.(payload.new as T)
            invalidate()
            break
          case 'DELETE':
            onDelete?.(payload.old as T)
            invalidate()
            break
        }
      }
    )

    channelRef.current = channelConfig.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`[Realtime] Channel error on ${table}, will attempt reconnect.`)
        // Supabase client handles reconnection automatically
      }
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter, enabled, invalidate, onInsert, onUpdate, onDelete])
}
