import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Leaf, ArrowRight, Shield, BarChart3, Zap } from 'lucide-react'

const features = [
  { icon: Leaf,     label: 'Carbon Tracking',    desc: 'Scope 1, 2 & 3 emission logging' },
  { icon: Shield,   label: 'Governance Suite',   desc: 'Policies, audits & compliance'   },
  { icon: BarChart3,label: 'ESG Analytics',      desc: 'Real-time materiality insights'  },
  { icon: Zap,      label: 'Mission Control',    desc: 'AI-powered ESG action hub'       },
]

export function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[hsl(222,47%,6%)]">

      {/* ── Left hero panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12">
        {/* Gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 left-20 w-[350px] h-[350px] bg-green-600/8 rounded-full blur-[90px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-appicon.png" alt="EcoSphere" className="w-10 h-10 rounded-2xl object-contain" />
          <div>
            <p className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>EcoSphere</p>
            <p className="text-white/40 text-xs mt-0.5">ESG Mission Control</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Enterprise ESG,{' '}
              <span className="text-gradient">reimagined.</span>
            </h1>
            <p className="mt-4 text-white/55 text-lg leading-relaxed max-w-[400px]">
              The command center your sustainability team deserves. Track, report, and act on ESG data in real time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass rounded-2xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-white text-sm font-semibold leading-none">{label}</p>
                <p className="text-white/40 text-[11px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 flex items-center gap-4">
          {['ISO 14064 Aligned', 'GHG Protocol', 'GRI Standards', 'TCFD Ready'].map(badge => (
            <span key={badge} className="text-[10px] font-semibold text-white/30 border border-white/10 rounded-full px-2.5 py-1">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right login panel ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[hsl(222,47%,8%)] lg:rounded-l-[40px]" />

        <div className="relative z-10 w-full max-w-[380px] space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <img src="/logo-appicon.png" alt="EcoSphere" className="w-9 h-9 rounded-xl object-contain" />
            <div>
              <p className="text-white font-bold leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>EcoSphere</p>
              <p className="text-white/40 text-[11px] mt-0.5">ESG Mission Control</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Welcome back
            </h2>
            <p className="text-white/45 text-sm mt-1.5">Sign in to your workspace dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
                <button type="button" className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
              <label htmlFor="remember" className="text-xs text-white/40 cursor-pointer">Keep me signed in for 30 days</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-[11px] text-white/25">
              Demo workspace: <span className="text-white/45 font-mono">admin@greentech.demo</span>
            </p>
          </div>

          <div className="border-t border-white/6 pt-5 text-center">
            <p className="text-[11px] text-white/20">
              © 2026 EcoSphere AI · Enterprise ESG Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
