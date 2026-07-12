import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Leaf,
  Users,
  Shield,
  Trophy,
  Zap,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { dbService } from '@/lib/dbService'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useOrgRealtimeSync } from '@/hooks/useOrgRealtimeSync'
import { LiveIndicator } from '@/components/shared/LiveIndicator'
import { useToast } from '@/contexts/ToastContext'

const navItems = [
  { to: '/app/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/mission-control', icon: Zap,            label: 'Mission Control' },
  { to: '/app/environmental',  icon: Leaf,            label: 'Environmental' },
  { to: '/app/social',         icon: Users,           label: 'Social' },
  { to: '/app/governance',     icon: Shield,          label: 'Governance' },
  { to: '/app/gamification',   icon: Trophy,          label: 'Gamification' },
  { to: '/app/reports',        icon: BarChart3,       label: 'Reports' },
  { to: '/app/settings',       icon: Settings,        label: 'Settings' },
]

const AVAILABLE_TENANTS = [
  { name: 'GreenTech Corporation',  plan: 'Enterprise',    admin: 'admin@greentech.demo'       },
  { name: 'EcoSphere EMEA Ltd',     plan: 'Professional',  admin: 'emea-mgr@ecosphere.demo'    },
  { name: 'Sunrise Ventures',       plan: 'Standard',      admin: 'ventures@sunrise.demo'      },
]

const PLAN_COLORS: Record<string, string> = {
  Enterprise:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Professional: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Standard:     'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export function AppShell() {
  const [collapsed,          setCollapsed]          = useState(false)
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false)
  const [userMenuOpen,       setUserMenuOpen]       = useState(false)
  const location = useLocation()

  const currentUser = dbService.getCurrentUser()
  const org         = dbService.getOrganization()

  const { toast } = useToast()
  const [realtimeEnabled, setRealtimeEnabled] = useState(() => {
    const saved = localStorage.getItem('ecosphere-realtime-sync')
    return saved === null ? true : saved === 'true'
  })

  // Synchronise realtime sync settings across tabs/components
  useEffect(() => {
    const syncRealtime = () => {
      const saved = localStorage.getItem('ecosphere-realtime-sync')
      setRealtimeEnabled(saved === null ? true : saved === 'true')
    }
    window.addEventListener('storage', syncRealtime)
    window.addEventListener('ecosphere-settings-realtime-toggle', syncRealtime)
    return () => {
      window.removeEventListener('storage', syncRealtime)
      window.removeEventListener('ecosphere-settings-realtime-toggle', syncRealtime)
    }
  }, [])

  const { status: realtimeStatus } = useOrgRealtimeSync({
    orgId: org?.id ?? null,
    enabled: realtimeEnabled,
    onNewEmission: (tx) => {
      toast(
        'info',
        'New Emission Recorded',
        `New emission recorded by ${tx.department?.name || 'Company-Wide'} — ${(tx.calculated_emission_kg / 1000).toFixed(2)} tCO2e`
      )
      // Custom event for animating/pulsing Environmental Score card on the dashboard
      window.dispatchEvent(new CustomEvent('ecosphere-new-emission', { detail: tx }))
    },
  })

  const userInitials = currentUser.full_name
    ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const activeTenant = AVAILABLE_TENANTS.find(t => t.name === org.name) ?? AVAILABLE_TENANTS[0]

  const handleSwitchTenant = (tenant: typeof AVAILABLE_TENANTS[0]) => {
    dbService.updateOrganization({ ...org, name: tenant.name, notify_email_admin: tenant.admin })
    setTenantDropdownOpen(false)
    window.location.reload()
  }

  const currentNav = navItems.find(n => location.pathname.startsWith(n.to))

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          'relative flex flex-col border-r border-white/5 sidebar-gradient transition-all duration-300 ease-in-out shrink-0',
          collapsed ? 'w-[62px]' : 'w-[230px]'
        )}
      >
        {/* Logo Block */}
        <div className="flex h-[60px] items-center px-4 border-b border-white/5 shrink-0">
          {collapsed ? (
            <img
              src="/logo-appicon.png"
              alt="EcoSphere"
              className="w-8 h-8 object-contain rounded-xl mx-auto"
            />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo-appicon.png"
                alt="EcoSphere"
                className="w-8 h-8 object-contain rounded-xl shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm text-white tracking-tight leading-none">EcoSphere</p>
                <p className="text-[10px] text-white/40 mt-0.5 font-medium">ESG Mission Control</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-white/10 text-white nav-active-glow'
                    : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r-full" />
                  )}
                  <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/70')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Row */}
        <div className="shrink-0 px-2 pb-3 pt-2 border-t border-white/5 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2.5 rounded-xl bg-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] font-bold text-emerald-400 shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white/80 truncate leading-none">{currentUser.full_name}</p>
                <p className="text-[10px] text-white/35 mt-0.5 truncate capitalize">{currentUser.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-white/30 hover:bg-white/5 hover:text-white/60 transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <header className="h-[60px] border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 z-10 shrink-0">

          {/* Left: breadcrumb + tenant switcher */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-foreground">
              {currentNav?.label ?? 'EcoSphere AI'}
            </h1>

            <span className="text-border select-none">╱</span>

            {/* Tenant switcher */}
            <div className="relative">
              <button
                onClick={() => { setTenantDropdownOpen(v => !v); setUserMenuOpen(false) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs font-medium text-foreground transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="max-w-[130px] truncate">{org.name}</span>
                <span className={cn('px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider', PLAN_COLORS[activeTenant.plan])}>
                  {activeTenant.plan}
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', tenantDropdownOpen && 'rotate-180')} />
              </button>

              {tenantDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTenantDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-border bg-card shadow-2xl p-2 z-20 animate-fade-in">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-3 py-2 tracking-widest">Switch Workspace</p>
                    <div className="space-y-1">
                      {AVAILABLE_TENANTS.map(tenant => {
                        const isActive = org.name === tenant.name
                        return (
                          <button
                            key={tenant.name}
                            onClick={() => handleSwitchTenant(tenant)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all',
                              isActive
                                ? 'bg-primary/8 border border-primary/20'
                                : 'hover:bg-muted'
                            )}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{tenant.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{tenant.admin}</p>
                            </div>
                            <span className={cn('ml-2 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0', PLAN_COLORS[tenant.plan])}>
                              {tenant.plan}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: theme + notifications + user avatar */}
          <div className="flex items-center gap-1.5">
            <LiveIndicator status={realtimeStatus} className="mr-2" />
            <ThemeToggle compact />
            <div className="w-px h-5 bg-border mx-0.5" />
            <NotificationBell />
            <div
              className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary cursor-pointer hover:bg-primary/20 transition-colors"
              title={currentUser.full_name}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
