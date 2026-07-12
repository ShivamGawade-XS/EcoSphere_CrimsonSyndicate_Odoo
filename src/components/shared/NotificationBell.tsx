import { useState, useRef, useEffect } from 'react'
import { Bell, BellRing, CheckCheck, X, Info, Trophy, AlertCircle, CheckCircle } from 'lucide-react'
import { useNotifications } from '@/hooks/useESGScores'
import type { Notification, NotificationType } from '@/types'

const typeIcon: Record<NotificationType, React.ReactNode> = {
  compliance_issue_created: <AlertCircle className="w-4 h-4 text-red-400" />,
  csr_approved:             <CheckCircle className="w-4 h-4 text-emerald-400" />,
  csr_rejected:             <X className="w-4 h-4 text-red-400" />,
  challenge_approved:       <CheckCircle className="w-4 h-4 text-emerald-400" />,
  challenge_rejected:       <X className="w-4 h-4 text-red-400" />,
  policy_reminder:          <Info className="w-4 h-4 text-blue-400" />,
  badge_unlocked:           <Trophy className="w-4 h-4 text-yellow-400" />,
  reward_redeemed:          <CheckCircle className="w-4 h-4 text-purple-400" />,
  overdue_issue:            <AlertCircle className="w-4 h-4 text-orange-400" />,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors ${!n.read ? 'bg-emerald-500/5' : ''}`}
      onClick={() => onRead(n.id)}
    >
      <div className="mt-0.5 shrink-0">{typeIcon[n.type] ?? <Info className="w-4 h-4" />}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>
          {n.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />}
    </div>
  )
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <NotificationItem key={n.id} n={n} onRead={markRead} />
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="px-4 py-2 border-t border-border text-center text-xs text-muted-foreground">
              Showing 10 of {notifications.length} notifications
            </div>
          )}
        </div>
      )}
    </div>
  )
}
