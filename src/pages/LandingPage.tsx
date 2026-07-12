import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Leaf, BarChart3, Shield, Zap, Users, Globe,
  ArrowRight, CheckCircle, Star, Play, TrendingUp,
  Lock, RefreshCw, Sparkles, Menu, X, ChevronRight,
  AlertTriangle, Activity, FileText, Target
} from 'lucide-react'

/* ─── Animated number counter ───────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        const t0 = performance.now()
        const dur = 1800
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1)
          setV(Math.round((1 - Math.pow(1 - p, 4)) * to))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.4 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>
}

/* ─── Thin divider ───────────────────────────────────────────────── */
const Hr = () => <div className="h-px bg-white/[0.06] w-full" />

/* ─── Logo mark ──────────────────────────────────────────────────── */
function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs'
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`${s} bg-emerald-500 rounded-[9px] flex items-center justify-center font-black text-white shrink-0`}>
        E
      </div>
      <span className="font-bold text-white tracking-tight">
        EcoSphere<span className="text-emerald-400 font-black">AI</span>
      </span>
    </div>
  )
}

/* ─── Tag badge ──────────────────────────────────────────────────── */
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400 mb-5">
      <span className="w-4 h-px bg-emerald-400" />
      {children}
      <span className="w-4 h-px bg-emerald-400" />
    </span>
  )
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Lock scroll when demo modal open
  useEffect(() => {
    document.body.style.overflow = demoOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [demoOpen])

  return (
    <div className="bg-[#07090f] text-white min-h-screen overflow-x-hidden font-sans antialiased">

      {/* ══════════════════════ NAVBAR ══════════════════════════════ */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled ? 'border-b border-white/[0.06] bg-[#07090f]/95 backdrop-blur-md' : ''
      }`}>
        <nav className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-7 text-sm">
            {['Features', 'Pricing', 'Docs', 'Blog'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="text-[#8b9ab0] hover:text-white transition-colors duration-150 font-medium">
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-[#8b9ab0] hover:text-white text-sm font-medium transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/login"
              className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg transition-colors duration-150">
              Get started
            </Link>
          </div>

          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden text-[#8b9ab0] hover:text-white p-1">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#07090f] px-6 py-5 space-y-4">
            {['Features', 'Pricing', 'Docs', 'Blog'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className="block text-[#8b9ab0] hover:text-white text-sm font-medium">
                {l}
              </a>
            ))}
            <Hr />
            <div className="flex flex-col gap-2 pt-1">
              <Link to="/login" className="text-sm text-center py-2.5 text-[#8b9ab0]">Sign in</Link>
              <Link to="/login" className="text-sm text-center font-semibold bg-emerald-500 text-white py-2.5 rounded-lg">
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════ HERO ════════════════════════════════ */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Subtle background radial — one, not ten */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
          <div className="w-[900px] h-[500px] bg-emerald-500/[0.07] rounded-full blur-[120px] -translate-y-1/3" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-[#8b9ab0]">
              GRI 2021 · CSRD · BRSR · TCFD — all in one platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[52px] md:text-[72px] font-black leading-[1.02] tracking-[-0.04em] mb-6">
            <span className="text-white">ESG reporting </span>
            <br className="hidden md:block" />
            <span className="text-white">that actually </span>
            <span className="text-emerald-400">works.</span>
          </h1>

          <p className="text-[#8b9ab0] text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Connect your operations, get GRI-aligned scores automatically, ask an AI
            anything about your data, and ship compliance reports in hours — not weeks.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-150 text-sm">
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
            <button
              onClick={() => setDemoOpen(true)}
              className="group w-full sm:w-auto flex items-center justify-center gap-2 border border-white/[0.12] hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.07] text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-150 text-sm">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white ml-0.5" />
              </div>
              Watch demo
            </button>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-xs text-[#4a5568] font-medium">
            No credit card · Free 14-day trial · Setup in under 20 minutes
          </p>
        </div>

        {/* ── Dashboard Mockup ─── */}
        <div className="relative max-w-5xl mx-auto mt-20">
          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#07090f] to-transparent z-10 pointer-events-none" />

          <div className="rounded-2xl border border-white/[0.08] bg-[#0d1117] overflow-hidden shadow-2xl shadow-black/60">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0a0e14]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28ca41]" />
              <div className="flex-1 mx-4 bg-white/[0.05] rounded-md px-3 py-1 text-[11px] text-[#4a5568] font-mono tracking-tight">
                app.ecosphere.ai/dashboard
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-[#4a5568]">Live</span>
              </div>
            </div>

            {/* Mock app interior */}
            <div className="flex h-[400px] overflow-hidden">
              {/* Sidebar */}
              <div className="w-[180px] border-r border-white/[0.06] bg-[#090c12] px-3 py-4 shrink-0 hidden md:flex flex-col gap-0.5">
                <div className="px-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-[8px] font-black text-white">E</div>
                    <span className="text-[11px] font-bold text-white">EcoSphere</span>
                  </div>
                </div>
                {[
                  { icon: BarChart3, label: 'Dashboard', active: true },
                  { icon: Leaf, label: 'Environmental', active: false },
                  { icon: Users, label: 'Social', active: false },
                  { icon: Shield, label: 'Governance', active: false },
                  { icon: Zap, label: 'Mission Control', active: false },
                  { icon: FileText, label: 'Reports', active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div key={label} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-default ${
                    active ? 'bg-emerald-500/15 text-emerald-400' : 'text-[#4a5568]'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="flex-1 p-5 overflow-hidden bg-[#0d1117]">
                {/* Top row: score + 3 metrics */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {/* ESG Score */}
                  <div className="col-span-1 bg-[#0a0e14] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#10b981" strokeWidth="6"
                          strokeDasharray="163" strokeDashoffset="34" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[15px] font-black text-white">79</span>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-[#4a5568] font-bold">ESG Score</span>
                    <span className="text-[10px] text-emerald-400 font-bold">+4.2 ↑</span>
                  </div>

                  {/* 3 mini metrics */}
                  {[
                    { label: 'Emissions', val: '2,847', unit: 'tCO₂', delta: '−12%', good: true },
                    { label: 'Training', val: '87', unit: '%', delta: '+8pts', good: true },
                    { label: 'Compliance', val: '96', unit: '%', delta: '+3pts', good: true },
                  ].map(m => (
                    <div key={m.label} className="bg-[#0a0e14] border border-white/[0.06] rounded-xl p-4">
                      <p className="text-[9px] uppercase tracking-widest text-[#4a5568] font-bold mb-2">{m.label}</p>
                      <p className="text-xl font-black text-white leading-none">{m.val}<span className="text-xs text-[#4a5568] font-medium ml-0.5">{m.unit}</span></p>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-1.5">{m.delta} vs last month</p>
                    </div>
                  ))}
                </div>

                {/* Bottom row: chart + activity */}
                <div className="grid grid-cols-3 gap-3 h-[220px]">
                  {/* Trend chart */}
                  <div className="col-span-2 bg-[#0a0e14] border border-white/[0.06] rounded-xl p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-semibold text-white">ESG Score Trend</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">2025</span>
                    </div>
                    <div className="flex-1 flex items-end gap-1">
                      {[62,65,64,67,70,68,74,71,76,73,77,79].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm"
                          style={{
                            height: `${(h / 79) * 100}%`,
                            background: i === 11 ? '#10b981' : i >= 8 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'
                          }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => (
                        <span key={m} className="flex-1 text-center text-[8px] text-[#2d3748]">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div className="bg-[#0a0e14] border border-white/[0.06] rounded-xl p-4 overflow-hidden">
                    <p className="text-[11px] font-semibold text-white mb-3">Recent Activity</p>
                    <div className="space-y-2.5">
                      {[
                        { dot: 'bg-emerald-400', text: 'GRI 302 report generated' },
                        { dot: 'bg-amber-400', text: 'Oct emission spike flagged' },
                        { dot: 'bg-blue-400', text: 'Training batch completed' },
                        { dot: 'bg-violet-400', text: 'Audit #14 passed' },
                        { dot: 'bg-emerald-400', text: 'AI Copilot query processed' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${a.dot} mt-1 shrink-0`} />
                          <span className="text-[10px] text-[#4a5568] leading-tight">{a.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ LOGOS / TRUST ═══════════════════════ */}
      <section className="py-14 px-6 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[11px] uppercase tracking-widest text-[#2d3748] font-semibold mb-8">
            Trusted by sustainability teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {['GreenTech Mfg.', 'BioSynth Labs', 'Sunrise Ventures', 'InfraCore Ltd.', 'Apex Energy', 'Celero Capital'].map(co => (
              <span key={co} className="text-[#2d3748] hover:text-[#4a5568] text-sm font-semibold tracking-tight transition-colors duration-150 cursor-default">
                {co}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS ════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 text-center">
          {[
            { n: 94, s: '%', label: 'Reporting accuracy' },
            { n: 2400, s: '+', label: 'Organizations' },
            { n: 63, s: '%', label: 'Avg emission reduction' },
            { n: 18, s: 'min', label: 'Average setup time' },
          ].map(({ n, s, label }) => (
            <div key={label}>
              <p className="text-[42px] font-black tracking-tight text-white leading-none mb-2">
                <Counter to={n} suffix={s} />
              </p>
              <p className="text-sm text-[#4a5568] font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ FEATURES ═════════════════════════════ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <Tag>Platform</Tag>
            <h2 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.05] text-white max-w-xl">
              Everything ESG.<br />Nothing unnecessary.
            </h2>
            <p className="mt-4 text-[#4a5568] text-base max-w-lg leading-relaxed">
              A focused set of tools covering every ESG pillar — built for teams who need
              accurate reporting, not another dashboard to ignore.
            </p>
          </div>

          {/* Feature grid — 2 col list style, not gradient cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
            {[
              {
                icon: Leaf, title: 'Carbon & Emissions',
                desc: 'Scope 1, 2 & 3 tracking with GHG Protocol categorization. Monthly trends, department-level breakdowns, offset management.',
                tag: 'Environmental'
              },
              {
                icon: Users, title: 'Social Impact',
                desc: 'CSR campaign tracking, training completion rates, diversity indices, and employee engagement — unified in one view.',
                tag: 'Social'
              },
              {
                icon: Shield, title: 'Governance & Audit',
                desc: 'Policy acknowledgment workflows, compliance issue queues, audit logs with tamper-evidence SHA hashing, CSRD trail.',
                tag: 'Governance'
              },
              {
                icon: Sparkles, title: 'AI ESG Copilot',
                desc: 'Ask plain-English questions. Get answers grounded in your actual org data — GRI citations included. Powered by Groq.',
                tag: 'AI'
              },
              {
                icon: Activity, title: 'Forecasting & Anomalies',
                desc: 'Holt-Winters time-series forecasting with 90% confidence bands. Auto-detect emission spikes before they become violations.',
                tag: 'Analytics'
              },
              {
                icon: Globe, title: 'Odoo ERP Integration',
                desc: 'Bi-directional sync via JSON-RPC. Purchases, inventory, HR records automatically mapped to ESG data points.',
                tag: 'Integrations'
              },
            ].map(({ icon: Icon, title, desc, tag }, i) => (
              <div key={title} className={`bg-[#0a0e14] p-7 group hover:bg-[#0d1117] transition-colors duration-150 ${
                i === 0 ? 'rounded-tl-2xl' : i === 1 ? 'rounded-tr-2xl' : i === 4 ? 'rounded-bl-2xl' : i === 5 ? 'rounded-br-2xl' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 border border-white/[0.08] rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#8b9ab0]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2d3748]">{tag}</span>
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ HOW IT WORKS ════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <Tag>Process</Tag>
            <h2 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.05] text-white max-w-xl">
              Live in under<br />20 minutes.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                n: '01', title: 'Connect your data',
                desc: 'Sync with Odoo, upload a CSV, or use our pre-loaded GreenTech demo to start immediately. No engineering required.'
              },
              {
                n: '02', title: 'Scores computed automatically',
                desc: 'Our engine calculates weighted E, S, G sub-scores aligned to GRI 2021. Every metric is traceable to a source record.'
              },
              {
                n: '03', title: 'Report, simulate, improve',
                desc: 'Export GRI or CSRD-ready PDFs. Run What-If simulations before committing budget. Gamify your teams with leaderboards.'
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="relative">
                <p className="text-[64px] font-black text-white/[0.04] leading-none mb-4 select-none">{n}</p>
                <h3 className="text-white font-bold text-lg mb-2 -mt-3">{title}</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ TESTIMONIALS ════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <Tag>Testimonials</Tag>
            <h2 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.05] text-white max-w-xl">
              ESG teams love it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "Transformed our ESG reporting from a 3-week manual ordeal into a real-time dashboard. Our CSRD submission was ready in hours.",
                name: "Priya Nair", role: "Chief Sustainability Officer", co: "Infra Solutions Ltd."
              },
              {
                quote: "The AI Copilot answered GRI 302 questions using our actual data. It's like having a $500/hr consultant on call, permanently.",
                name: "Rahul Mehta", role: "ESG Manager", co: "BioTech Pvt Ltd."
              },
              {
                quote: "The gamification leaderboard created a genuine culture shift. Manufacturing now competes on sustainability, not just output.",
                name: "Anjali Sharma", role: "Head of HR", co: "GreenTech Manufacturing"
              },
            ].map(({ quote, name, role, co }) => (
              <div key={name} className="border border-white/[0.08] rounded-2xl p-7 hover:border-white/[0.14] transition-colors duration-150">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[#8b9ab0] text-sm leading-relaxed mb-6">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                    {name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{name}</p>
                    <p className="text-[#2d3748] text-xs">{role} · {co}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ PRICING ═════════════════════════════ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <Tag>Pricing</Tag>
            <h2 className="text-[38px] md:text-[48px] font-black tracking-tight leading-[1.05] text-white max-w-xl">
              Simple, transparent<br />pricing.
            </h2>
            <p className="mt-4 text-[#4a5568] text-base">
              No hidden fees. No per-report charges. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter', price: 'Free', sub: 'For small teams getting started.',
                features: ['Up to 50 employees', 'E, S, G dashboard', 'CSV import', 'GRI PDF export', '2 admin seats'],
                highlight: false, cta: 'Start for free'
              },
              {
                name: 'Growth', price: '₹4,999', sub: 'For teams serious about ESG.',
                features: ['Up to 500 employees', 'AI ESG Copilot', 'Odoo ERP sync', 'Holt-Winters forecasting', 'CSRD audit trail', 'What-If simulator', 'Unlimited seats'],
                highlight: true, cta: 'Start 14-day trial'
              },
              {
                name: 'Enterprise', price: 'Custom', sub: 'For large organisations.',
                features: ['Unlimited employees', 'Custom GRI mapping', 'SSO / SAML', 'Dedicated CSM', 'On-prem option', '99.9% SLA'],
                highlight: false, cta: 'Contact sales'
              },
            ].map(({ name, price, sub, features, highlight, cta }) => (
              <div key={name} className={`relative rounded-2xl p-7 flex flex-col border transition-colors duration-150 ${
                highlight
                  ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                  : 'border-white/[0.08] hover:border-white/[0.14]'
              }`}>
                {highlight && (
                  <div className="absolute -top-3 left-6 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-[#4a5568] mb-1">{name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{price}</span>
                    {price !== 'Free' && price !== 'Custom' && <span className="text-[#4a5568] text-sm">/mo</span>}
                  </div>
                  <p className="text-[#4a5568] text-xs mt-1.5">{sub}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-7">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#8b9ab0]">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/login" className={`text-center py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                  highlight
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
                }`}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ COMPLIANCE STRIP ════════════════════ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Lock, label: 'SOC 2 Type II', desc: 'End-to-end encryption, audit logging, access controls reviewed annually.' },
            { icon: RefreshCw, label: 'Framework-aligned', desc: 'Built-in GRI 2021, BRSR, CSRD, and TCFD mapping — no manual translation.' },
            { icon: Globe, label: 'GDPR compliant', desc: 'Data residency in IN / EU / US. Full data export and right-to-delete.' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-4 p-5 border border-white/[0.06] rounded-xl">
              <div className="w-8 h-8 border border-white/[0.08] rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#4a5568]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-1">{label}</p>
                <p className="text-[#2d3748] text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Hr />

      {/* ══════════════════════ FINAL CTA ════════════════════════════ */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[42px] md:text-[56px] font-black tracking-tight leading-[1.02] text-white mb-5">
            Start reporting.<br />Start improving.
          </h2>
          <p className="text-[#4a5568] text-base mb-10 max-w-md mx-auto">
            Join thousands of ESG teams who replaced spreadsheets and consultants
            with EcoSphere AI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/login"
              className="group flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-150 text-sm">
              Get started — it's free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border border-white/[0.1] hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07] text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-150 text-sm">
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ═══════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
            <div className="max-w-[220px]">
              <Logo />
              <p className="mt-4 text-[#2d3748] text-xs leading-relaxed">
                AI-powered ESG management. GRI 2021, CSRD, and BRSR ready.
                Built for Odoo Hackathon 2026.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6">
              {[
                { h: 'Product', links: ['Features', 'Pricing', 'Roadmap', 'Changelog', 'Status'] },
                { h: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
                { h: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR', 'Cookies'] },
              ].map(col => (
                <div key={col.h}>
                  <p className="text-white text-xs font-bold mb-3">{col.h}</p>
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l}>
                        <a href="#" className="text-[#2d3748] hover:text-[#4a5568] text-xs transition-colors duration-100">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <Hr />
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6">
            <p className="text-[#1a2030] text-xs">© 2026 EcoSphere AI · Team CrimsonSyndicate · Odoo Hackathon 2026</p>
            <p className="text-[#1a2030] text-xs">Made with care in India 🇮🇳</p>
          </div>
        </div>
      </footer>

      {/* ══════════════════════ DEMO MODAL ════════════════════════════ */}
      {demoOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setDemoOpen(false)}
        >
          <div
            className="bg-[#0d1117] border border-white/[0.1] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-white/[0.05] border border-white/[0.1] rounded-xl flex items-center justify-center mx-auto mb-5">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Interactive demo</h3>
            <p className="text-[#4a5568] text-sm leading-relaxed mb-6">
              Sign in with the GreenTech Manufacturing demo account to explore a fully pre-loaded ESG workspace.
            </p>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150 w-full"
            >
              Open live demo <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => setDemoOpen(false)}
              className="mt-4 text-[#2d3748] hover:text-[#4a5568] text-xs transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
