/**
 * EcoSphere AI — Record History Drawer (CSRD Audit Trail)
 *
 * Displays the immutable historical audit trail of a specific record,
 * showing who created it, modified it, and when, with side-by-side diffs.
 * Fully supports mock mode and live Supabase mode.
 *
 * @module components/shared/RecordHistory
 */

import { useState, useEffect } from 'react'
import { dbService } from '@/lib/dbService'
import { supabase } from '@/lib/supabase'
import { X, Clock, User, ShieldAlert, ArrowRight, CornerDownRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface RecordHistoryProps {
  tableName: string
  recordId: string
  isOpen: boolean
  onClose: () => void
}

export function RecordHistory({ tableName, recordId, isOpen, onClose }: RecordHistoryProps) {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !recordId) return

    async function loadHistory() {
      setIsLoading(true)
      setError(null)

      try {
        const isPlaceholder = import.meta.env.VITE_SUPABASE_URL === undefined ||
                              import.meta.env.VITE_SUPABASE_URL === '' ||
                              import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project')

        if (isPlaceholder) {
          // Mock mode: Filter auditEvents locally
          const localEvents = dbService.getAuditEvents().filter(
            e => e.table_name === tableName && String(e.record_id) === String(recordId)
          )
          setEvents(localEvents)
        } else {
          // Live Supabase mode
          const { data, error: err } = await supabase
            .from('audit_events')
            .select('*')
            .eq('table_name', tableName)
            .eq('record_id', recordId)
            .order('created_at', { ascending: false })

          if (err) throw err
          setEvents(data || [])
        }
      } catch (err: any) {
        console.error('Failed to load record history:', err)
        setError(err.message || 'Failed to fetch history')
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [tableName, recordId, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Record History
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable CSRD compliance audit trail for {tableName}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Loading audit records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">Error Loading Audit Trail</p>
                <p className="text-xs opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl">
              <Clock className="w-8 h-8 text-muted-foreground/35 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No events logged yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px] mx-auto">
                Any modifications to this record will appear here.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-border ml-3.5 pl-6 space-y-8">
              {events.map((event) => {
                const isUpdate = event.event_type === 'UPDATE'
                const isInsert = event.event_type === 'INSERT'
                const isDelete = event.event_type === 'DELETE'

                return (
                  <div key={event.id} className="relative">
                    {/* Node Dot */}
                    <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center
                      ${isInsert ? 'bg-green-500' : isUpdate ? 'bg-amber-500' : 'bg-red-500'}`} 
                    />

                    {/* Meta info */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider
                          ${isInsert ? 'bg-green-500/10 text-green-600' : isUpdate ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}
                        >
                          {event.event_type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(event.created_at)} at {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* User details */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mt-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {event.user_email}
                        <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {event.user_role}
                        </span>
                      </div>

                      {/* Changes breakdown */}
                      {isUpdate && event.changed_fields && (
                        <div className="mt-3 bg-muted/15 border border-border/60 rounded-xl p-3 space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3 text-amber-500" />
                            Modified Fields:
                          </p>
                          {event.changed_fields.map((field: string) => {
                            const beforeVal = event.before_data?.[field]
                            const afterVal = event.after_data?.[field]
                            return (
                              <div key={field} className="text-xs grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <span className="font-mono text-[11px] bg-muted/40 px-1 py-0.5 rounded border border-border/40 text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                  {field}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="font-semibold text-foreground text-left overflow-hidden text-ellipsis whitespace-nowrap">
                                  {JSON.stringify(beforeVal)} <span className="font-normal text-muted-foreground text-[10px]">to</span> {JSON.stringify(afterVal)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Metadata IP/UA */}
                      <div className="mt-2 text-[10px] text-muted-foreground flex gap-3">
                        <span>IP: {event.ip_address || '127.0.0.1'}</span>
                        <span>UA: {event.user_agent ? (event.user_agent.split(' ')[0] ?? 'Browser') : 'Agent'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
