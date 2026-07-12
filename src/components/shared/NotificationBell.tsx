import { useState, useMemo } from 'react'
import { Bell, X, AlertTriangle, Target, Clock, CheckCircle2 } from 'lucide-react'
import { dbService } from '@/lib/dbService'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  time: string
}

const TYPE_STYLES = {
  critical: { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'    },
  warning:  { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  info:     { icon: Target,        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'   },
  success:  { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'},
}

export function NotificationBell() {
  const [open,    setOpen]    = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const allNotifications = useMemo<Notification[]>(() => {
    const notifs: Notification[] = []

    // Overdue compliance issues → critical
    const issues = dbService.getComplianceIssues().filter(i => i.status !== 'resolved')
    const overdue = issues.filter(i => new Date(i.due_date) < new Date())
    overdue.forEach(i => {
      notifs.push({
        id: `issue-${i.id}`,
        type: 'critical',
        title: 'Overdue Compliance Issue',
        message: `"${i.title}" was due ${new Date(i.due_date).toLocaleDateString()}. Governance score is penalized.`,
        time: 'Overdue',
      })
    })

    // Goals at risk → warning
    const goals = dbService.getGoals()
    goals.forEach(g => {
      const progress = g.current_value / g.target_value
      const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
      if (daysLeft > 0 && daysLeft < 30 && progress < 0.7) {
        notifs.push({
          id: `goal-${g.id}`,
          type: 'warning',
          title: 'Goal At Risk',
          message: `"${g.title}" is ${Math.round(progress * 100)}% complete with ${daysLeft} days remaining.`,
          time: `${daysLeft}d left`,
        })
      }
    })

    // Pending redemptions → info
    const redemptions = dbService.getRedemptions().filter(r => r.status === 'pending')
    if (redemptions.length > 0) {
      notifs.push({
        id: 'redemptions',
        type: 'info',
        title: 'Pending Reward Redemptions',
        message: `${redemptions.length} employee reward request${redemptions.length > 1 ? 's' : ''} waiting for fulfillment in Settings.`,
        time: 'Pending',
      })
    }

    // New users → info
    const users = dbService.getProfiles()
    if (users.length > 3) {
      notifs.push({
        id: 'users-info',
        type: 'success',
        title: 'Team Growing',
        message: `${users.length} team members are active in your ESG workspace.`,
        time: 'Now',
      })
    }

    return notifs
  }, [])

  const visible = allNotifications.filter(n => !dismissed.has(n.id))
  const count = visible.length

  const dismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl z-20 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Notifications</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    {count} active
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Notification list */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {visible.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">All clear!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No issues or pending actions.</p>
                </div>
              ) : (
                visible.map(n => {
                  const { icon: Icon, color, bg, border } = TYPE_STYLES[n.type]
                  return (
                    <div key={n.id} className={cn('flex gap-3 p-4 hover:bg-muted/30 transition-colors', border, 'border-l-2')}>
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', bg)}>
                        <Icon className={cn('w-3.5 h-3.5', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground leading-tight">{n.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{n.message}</p>
                      </div>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {visible.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                <button
                  onClick={() => setDismissed(new Set(allNotifications.map(n => n.id)))}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dismiss all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
