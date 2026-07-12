import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Leaf, Users, Shield, Zap, TrendingUp, TrendingDown, Minus,
  Award, AlertTriangle, CheckCircle2, Clock, RefreshCw, ArrowRight,
  Activity, Target, Building2
} from 'lucide-react'
import { ScoreBadge, ScorePill } from '@/components/shared/ScoreBadge'
import { useESGScores } from '@/hooks/useESGScores'
import { dbService } from '@/lib/dbService'
import { formatEmission, relativeDate } from '@/lib/esgUtils'

// ─── Quick actions ────────────────────────────────────────────────────────────
const quickActions = [
  { label: 'Log Emission',     href: '/environmental', icon: Leaf,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Join CSR Activity', href: '/social',        icon: Users,   color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  { label: 'Review Policy',    href: '/governance',     icon: Shield,  color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  { label: 'View Challenges',  href: '/gamification',   icon: Zap,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
]

// ─── StatCard component ───────────────────────────────────────────────────────
function StatCard({
  label, value, delta, icon: Icon, color, bg, subtitle
}: {
  label: string; value: string | number; delta?: number;
  icon: React.ElementType; color: string; bg: string; subtitle?: string
}) {
  const DeltaIcon = delta === undefined ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaColor = delta === undefined ? 'text-muted-foreground' : delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground'

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-bold mt-0.5 group-hover:text-white transition-colors">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { scores, deptScores, loading, refresh } = useESGScores()
  
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const issues = useMemo(() => dbService.getComplianceIssues(), [refreshKey])
  const goals = useMemo(() => dbService.getGoals(), [refreshKey])
  const csrActivities = useMemo(() => dbService.getCSRActivities(), [refreshKey])
  const challenges = useMemo(() => dbService.getChallenges(), [refreshKey])
  const txs = useMemo(() => dbService.getCarbonTransactions(), [refreshKey])
  const [refreshing, setRefreshing] = useState(false)

  const openIssues = useMemo(() => issues.filter((i: any) => i.status !== 'resolved').length, [issues])
  const criticalIssues = useMemo(() => issues.filter((i: any) => i.severity === 'critical' && i.status !== 'resolved').length, [issues])
  const activeGoals = useMemo(() => goals.filter((g: any) => g.status === 'active').length, [goals])
  const activeCSR = useMemo(() => csrActivities.filter((a: any) => a.status === 'active').length, [csrActivities])
  const activeChallenges = useMemo(() => challenges.filter((c: any) => c.status === 'active').length, [challenges])
  const totalEmissions = useMemo(() => txs.reduce((s: number, t: any) => s + t.calculated_emission_kg, 0), [txs])

  const radarData = useMemo(() => {
    return deptScores.slice(0, 5).map(d => ({
      dept: d.department?.name?.split(' ')[0] ?? 'Dept',
      Environmental: Math.round(d.env_score),
      Social: Math.round(d.social_score),
      Governance: Math.round(d.gov_score),
    }))
  }, [deptScores])

  const trendData = useMemo(() => {
    const composite = scores?.composite ?? 70
    const env = scores?.env ?? 70
    const social = scores?.social ?? 70
    const gov = scores?.gov ?? 70
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
    return months.map((month, idx) => {
      const step = (5 - idx) * 1.5
      return {
        month,
        env: Math.max(0, Math.round((env - step) * 10) / 10),
        social: Math.max(0, Math.round((social - step) * 10) / 10),
        gov: Math.max(0, Math.round((gov - step) * 10) / 10),
        composite: Math.max(0, Math.round((composite - step) * 10) / 10),
      }
    })
  }, [scores])

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 600))
    refresh()
    setRefreshKey(prev => prev + 1)
    setRefreshing(false)
  }

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    refresh()
    setRefreshKey(prev => prev + 1)
  }, [refresh])

  return (
    <div className="space-y-6 animate-fade-in pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{greeting}, {currentUser.full_name.split(' ')[0]} 👋</h2>
          <p className="text-muted-foreground text-sm mt-1">
            <Building2 className="inline w-3.5 h-3.5 mr-1 mb-0.5" />
            {org.name} &mdash; ESG Overview
          </p>
        </div>
        <button
          id="dashboard-refresh-btn"
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Critical alert banner ── */}
      {criticalIssues > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{criticalIssues} critical compliance issue{criticalIssues > 1 ? 's' : ''}</span>
            {' '}require immediate attention.
          </p>
          <a href="/governance" className="ml-auto text-xs underline whitespace-nowrap hover:no-underline">View Issues</a>
        </div>
      )}

      {/* ── Composite Score + Module scores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Composite ring */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
          {loading ? (
            <div className="w-24 h-24 rounded-full border-4 border-white/10 animate-pulse" />
          ) : (
            <ScoreBadge score={scores?.composite ?? 0} label="Composite ESG Score" size="lg" />
          )}
          <div className="flex gap-2 flex-wrap justify-center">
            <ScorePill score={scores?.env ?? 0} label="E" />
            <ScorePill score={scores?.social ?? 0} label="S" />
            <ScorePill score={scores?.gov ?? 0} label="G" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Weights: E {org.env_weight}% · S {org.social_weight}% · G {org.gov_weight}%
          </p>
        </div>

        {/* Stat cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="CO₂ Emissions" value={formatEmission(totalEmissions)} icon={Leaf} color="text-emerald-400" bg="bg-emerald-500/10" delta={-3.2} subtitle="vs last month" />
          <StatCard label="Open Issues" value={openIssues} icon={AlertTriangle} color="text-orange-400" bg="bg-orange-500/10" delta={openIssues > 0 ? 5.1 : -10} subtitle={`${criticalIssues} critical`} />
          <StatCard label="Active Goals" value={activeGoals} icon={Target} color="text-blue-400" bg="bg-blue-500/10" subtitle="sustainability targets" />
          <StatCard label="CSR Activities" value={activeCSR} icon={Users} color="text-purple-400" bg="bg-purple-500/10" delta={2.0} subtitle="open for joining" />
          <StatCard label="Challenges" value={activeChallenges} icon={Zap} color="text-yellow-400" bg="bg-yellow-500/10" subtitle="active this month" />
          <StatCard label="Dept Scores" value={deptScores.length} icon={Activity} color="text-teal-400" bg="bg-teal-500/10" subtitle="departments tracked" />
        </div>
      </div>

      {/* ── Trend chart + Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-month trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">ESG Score Trend</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="envGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="govGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 85]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="env" stroke="#34d399" fill="url(#envGrad)" strokeWidth={2} name="Environmental" dot={false} />
              <Area type="monotone" dataKey="social" stroke="#818cf8" fill="url(#socGrad)" strokeWidth={2} name="Social" dot={false} />
              <Area type="monotone" dataKey="gov" stroke="#fbbf24" fill="url(#govGrad)" strokeWidth={2} name="Governance" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department radar */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Department Radar</h3>
              <p className="text-xs text-muted-foreground">E / S / G by dept</p>
            </div>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <PolarGrid stroke="#ffffff15" />
                <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Radar name="Env" dataKey="Environmental" stroke="#34d399" fill="#34d399" fillOpacity={0.15} />
                <Radar name="Social" dataKey="Social" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} />
                <Radar name="Gov" dataKey="Governance" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.15} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">No dept scores yet</div>
          )}
        </div>
      </div>

      {/* ── Department bar chart ── */}
      {deptScores.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Department ESG Scores</h3>
              <p className="text-xs text-muted-foreground">Current period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deptScores.map(d => ({
              name: d.department?.code ?? d.department_id.slice(0, 4).toUpperCase(),
              Env: Math.round(d.env_score),
              Social: Math.round(d.social_score),
              Gov: Math.round(d.gov_score),
            }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Env" fill="#34d399" radius={[2, 2, 0, 0]} maxBarSize={20} />
              <Bar dataKey="Social" fill="#818cf8" radius={[2, 2, 0, 0]} maxBarSize={20} />
              <Bar dataKey="Gov" fill="#fbbf24" radius={[2, 2, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Quick Actions + Goals progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, href, icon: Icon, color, bg }) => (
              <a
                key={label}
                href={href}
                id={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-white/20 hover:bg-white/5 transition-all group"
              >
                <div className={`p-2 rounded-md ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-sm font-medium">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>

        {/* Goals snapshot */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Goal Progress</h3>
            <a href="/environmental" className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors">View all →</a>
          </div>
          <div className="space-y-3">
            {goals.filter((g: any) => g.status === 'active').slice(0, 4).map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              const isOnTrack = pct >= 40
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate max-w-[180px]">{goal.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOnTrack
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <Clock className="w-3 h-3 text-orange-400" />}
                      <span className={isOnTrack ? 'text-emerald-400' : 'text-orange-400'}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {goal.current_value} / {goal.target_value} {goal.unit} &middot; Due {relativeDate(goal.deadline)}
                  </p>
                </div>
              )
            })}
            {goals.filter((g: any) => g.status === 'active').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active goals</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Awards & Badges earned ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            Your Green Wallet
          </h3>
          <a href="/gamification" className="text-xs text-muted-foreground hover:text-yellow-400 transition-colors">Full wallet →</a>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{currentUser.total_xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{currentUser.total_points.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <p className="text-xs text-muted-foreground">
            Join ESG challenges, log activities, and sign policies to earn XP and redeem rewards from the catalog.
          </p>
        </div>
      </div>

    </div>
  )
}
