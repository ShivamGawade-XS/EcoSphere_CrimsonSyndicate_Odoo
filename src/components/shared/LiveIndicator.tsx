/**
 * LiveIndicator — Supabase Realtime connection status badge
 *
 * Shows a coloured pulsing dot with a status label.
 * Three states:
 *   • connected    → green pulse + "Live"
 *   • reconnecting → amber pulse + "Reconnecting…"
 *   • offline      → gray dot   + "Offline"
 */

import { cn } from '@/lib/utils'
import type { ConnectionStatus } from '@/hooks/useOrgRealtimeSync'

interface LiveIndicatorProps {
  status: ConnectionStatus
  className?: string
}

const STATE_CONFIG: Record<ConnectionStatus, {
  dot:   string
  pulse: string
  label: string
}> = {
  connected: {
    dot:   'bg-emerald-400',
    pulse: 'animate-ping bg-emerald-400',
    label: 'Live',
  },
  reconnecting: {
    dot:   'bg-amber-400',
    pulse: 'animate-ping bg-amber-400',
    label: 'Reconnecting…',
  },
  offline: {
    dot:   'bg-slate-500',
    pulse: '',
    label: 'Offline',
  },
}

export function LiveIndicator({ status, className }: LiveIndicatorProps) {
  const { dot, pulse, label } = STATE_CONFIG[status]

  return (
    <div
      className={cn('flex items-center gap-1.5 select-none', className)}
      title={`Realtime sync: ${label}`}
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      {/* Pulsing dot container */}
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              pulse
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>

      {/* Status label */}
      <span
        className={cn(
          'text-xs font-medium',
          status === 'connected'    ? 'text-emerald-400' :
          status === 'reconnecting' ? 'text-amber-400'   :
                                     'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </div>
  )
}
