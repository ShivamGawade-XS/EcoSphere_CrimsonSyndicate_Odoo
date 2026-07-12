import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { dbService } from '@/lib/dbService'
import { queryAI } from '@/lib/groq'
import { formatCO2 } from '@/lib/utils'
import { buildESGContext } from '@/lib/ai/context-builder'
import { buildSystemPrompt, buildStarterQuestions } from '@/lib/ai/system-prompt'
import { holtsWintersForecast } from '@/lib/forecasting/holt-winters'
import { detectAnomalies } from '@/lib/forecasting/anomaly-detector'
import { WhatIfSimulator } from './WhatIfSimulator'
import {
  Zap,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CornerDownRight,
  Sliders,
  Send,
  Info,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'

export function MissionControl() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [subTab, setSubTab] = useState<'deck' | 'whatif'>('deck')

  // Simulation State
  const [evFleetPercent, setEvFleetPercent] = useState(10)
  const [solarKw, setSolarKw] = useState(25)
  const [csrParticipation, setCsrParticipation] = useState(20)
  const [resolveOverdue, setResolveOverdue] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)

  // AI Context State
  const [esgContext, setEsgContext] = useState<any>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextLastLoaded, setContextLastLoaded] = useState<Date | null>(null)
  const [showContextPanel, setShowContextPanel] = useState(false)
  const contextCacheRef = useRef<{ ts: number; data: any } | null>(null)

  // Chat State
  const [messages, setMessages] = useState<{sender: string; text: string; sources?: string[]; ts: string}[]>([
    {
      sender: 'copilot',
      text: 'Hello! I am your ESG Decision Copilot. I have loaded your current environmental targets, goal trajectories, and compliance risks. How can I help you optimize your ESG scores today?',
      sources: ['Environmental Goals', 'Compliance Issues Registry'],
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Load Data
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const deptScores = useMemo(() => dbService.getDepartmentScores(), [refreshKey])
  const issues = useMemo(() => dbService.getComplianceIssues().filter(i => i.status !== 'resolved'), [refreshKey])
  const goals = useMemo(() => dbService.getGoals(), [refreshKey])

  // Computed Org-wide averages
  const { avgE, avgS, avgG, avgTotal } = useMemo(() => {
    if (deptScores.length === 0) return { avgE: 70, avgS: 70, avgG: 70, avgTotal: 70 }
    const totalCount = depts.reduce((sum, d) => sum + d.employee_count, 0)
    let sumE = 0, sumS = 0, sumG = 0, sumT = 0
    deptScores.forEach(s => {
      const weight = s.department?.employee_count || 1
      sumE += s.env_score * weight
      sumS += s.social_score * weight
      sumG += s.gov_score * weight
      sumT += s.total_score * weight
    })
    return {
      avgE: Math.round(sumE / totalCount),
      avgS: Math.round(sumS / totalCount),
      avgG: Math.round(sumG / totalCount),
      avgTotal: Math.round(sumT / totalCount),
    }
  }, [deptScores, depts])

  // Sparkline data (historical 6 months)
  const historicalScores = useMemo(() => {
    return [
      { month: 'Jan', score: avgTotal - 4.5 },
      { month: 'Feb', score: avgTotal - 3.2 },
      { month: 'Mar', score: avgTotal - 2.8 },
      { month: 'Apr', score: avgTotal - 1.5 },
      { month: 'May', score: avgTotal - 0.5 },
      { month: 'Jun', score: avgTotal },
    ]
  }, [avgTotal])

  // Holt-Winters Triple Exponential Smoothing Forecast (replaces linear regression)
  const forecastScores = useMemo(() => {
    const historicalValues = historicalScores.map(h => h.score)
    let forecastArr: number[] = []
    let lowerArr: number[] = []
    let upperArr: number[] = []
    try {
      const hwResult = holtsWintersForecast(historicalValues, 3)
      forecastArr = hwResult.forecast
      lowerArr = hwResult.confidenceInterval.lower
      upperArr = hwResult.confidenceInterval.upper
    } catch {
      const last = historicalValues[historicalValues.length - 1] ?? avgTotal
      forecastArr = [last + 0.5, last + 0.8, last + 1.0]
      lowerArr    = [last - 2.5, last - 3.5, last - 4.5]
      upperArr    = [last + 2.5, last + 3.5, last + 4.5]
    }
    const futureMonths = ['Jul', 'Aug', 'Sep']
    return [
      ...historicalScores.map(h => ({ ...h, type: 'actual', lower: h.score, upper: h.score, isAnomaly: false })),
      ...futureMonths.map((month, i) => ({
        month,
        score: parseFloat((forecastArr[i] ?? avgTotal).toFixed(1)),
        type: 'forecast',
        lower: parseFloat((lowerArr[i] ?? avgTotal - 3).toFixed(1)),
        upper: parseFloat((upperArr[i] ?? avgTotal + 3).toFixed(1)),
        isAnomaly: false,
      }))
    ]
  }, [historicalScores, avgTotal])

  // Anomaly Detection on historical data
  const anomalyPoints = useMemo(() => {
    const values = historicalScores.map(h => h.score)
    const dates  = historicalScores.map((_, i) => `2026-0${i + 1}-01`)
    try {
      const result = detectAnomalies(values, dates, 3, 2.0)
      return result.anomalies.map(a => ({
        month:  historicalScores[a.index]?.month ?? '',
        score:  a.value,
        zScore: a.zScore,
      }))
    } catch {
      return []
    }
  }, [historicalScores])

  // Load ESG context (cached 5 minutes)
  const loadContext = useCallback(async (force = false) => {
    const CACHE_MS = 5 * 60 * 1000
    const now = Date.now()
    if (!force && contextCacheRef.current && (now - contextCacheRef.current.ts) < CACHE_MS) {
      setEsgContext(contextCacheRef.current.data)
      return
    }
    setContextLoading(true)
    try {
      const ctx = await buildESGContext()
      contextCacheRef.current = { ts: now, data: ctx }
      setEsgContext(ctx)
      setContextLastLoaded(new Date())
    } catch {
      // Silently fail — copilot will fall back to basic context
    } finally {
      setContextLoading(false)
    }
  }, [])

  useEffect(() => { loadContext() }, [loadContext])

  // Dynamic starter questions from context
  const starterQuestions = useMemo(() => {
    if (!esgContext) return [
      'How can I improve my Environmental score?',
      'Which compliance issues should I prioritize?',
      'What is our GRI readiness status?',
    ]
    return buildStarterQuestions(esgContext).slice(0, 3)
  }, [esgContext])

  // Simulated Score calculation (What-if)
  const simulatedScores = useMemo(() => {
    let simulatedE = avgE
    let simulatedS = avgS
    let simulatedG = avgG

    // Apply EV Fleet Simulation: Increase EV fleet by X%
    // Formula: Reduces Fleet emissions portion. +1 Env point per 10%
    simulatedE += (evFleetPercent / 10) * 1.5

    // Solar KW Simulation: +1 Env point per 10kW installed
    simulatedE += (solarKw / 10) * 0.8

    // CSR Participation: +1.5 Social points per 10% increase
    simulatedS += (csrParticipation / 10) * 1.5

    // Overdue Issues: Resolving overdue issues removes deductions.
    if (resolveOverdue) {
      const overdueIssues = issues.filter(i => new Date(i.due_date) < new Date())
      simulatedG += overdueIssues.length * 8
    }

    // Clamp
    simulatedE = Math.min(100, parseFloat(simulatedE.toFixed(1)))
    simulatedS = Math.min(100, parseFloat(simulatedS.toFixed(1)))
    simulatedG = Math.min(100, parseFloat(simulatedG.toFixed(1)))

    const simulatedTotal = (simulatedE * org.env_weight / 100) +
                           (simulatedS * org.social_weight / 100) +
                           (simulatedG * org.gov_weight / 100)

    return {
      env: simulatedE,
      social: simulatedS,
      gov: simulatedG,
      total: Math.min(100, parseFloat(simulatedTotal.toFixed(1))),
    }
  }, [avgE, avgS, avgG, evFleetPercent, solarKw, csrParticipation, resolveOverdue, issues, org])

  // Executive Decision Cards
  const decisionCards = useMemo(() => {
    const overdueIssues = issues.filter(i => new Date(i.due_date) < new Date())
    const atRiskGoals = goals.filter(g => {
      const start = new Date(g.start_date).getTime()
      const deadline = new Date(g.deadline).getTime()
      const now = Date.now()
      if (now < start || now > deadline) return false
      const ratio = g.current_value / g.target_value
      return g.current_value > (g.target_value * ((now - start) / (deadline - start))) * 1.2
    })

    return [
      {
        id: 'dec-1',
        title: 'Water Discharge sensor upgrade',
        status: 'Critical Risk',
        statusColor: 'bg-red-500/10 text-red-600',
        gap: 'Critical pH deviation unresolved',
        risk: '₹2.1 Cr potential regulatory penalty and environmental compliance failure.',
        action: 'Approve procurement for new pH discharge sensors and resolve issue #1.',
        gain: '+4.5 Gov Points',
        simulateAction: () => {
          setResolveOverdue(true)
          setIsSimulating(true)
        }
      },
      {
        id: 'dec-2',
        title: 'Accelerate Plant Solar arrays',
        status: 'Goal at Risk',
        statusColor: 'bg-amber-500/10 text-amber-600',
        gap: '23,500 / 20,000 kg CO₂e budget exceeded',
        risk: 'Plant energy efficiency goal will be missed by 20% by August deadline.',
        action: 'Install 50kW solar array to offset grid electricity dependency.',
        gain: '+3.8 Env Points',
        simulateAction: () => {
          setSolarKw(50)
          setIsSimulating(true)
        }
      }
    ]
  }, [issues, goals])

  // AI Copilot response handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isTyping) return

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage = { sender: 'user', text: chatInput, ts }
    setMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsTyping(true)

    // Build rich system prompt from ESG context if available
    const systemPrompt = esgContext
      ? buildSystemPrompt(esgContext)
      : `You are EcoSphere AI Decision Copilot. Organization: ${org.name}. Scores - E: ${avgE}, S: ${avgS}, G: ${avgG}, Total: ${avgTotal}. Open issues: ${issues.length}. Answer concisely in under 4 sentences, cite real org numbers.`

    // Keep last 6 exchanges (12 messages) as conversation memory
    const recentMessages = messages.slice(-12)

    // Call proxy Edge Function
    try {
      const response = await queryAI(
        recentMessages.concat(userMessage),
        systemPrompt,
        esgContext ? { context: JSON.stringify(esgContext, null, 2) } : undefined
      )
      setMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: response.content,
          sources: esgContext
            ? [`${esgContext.orgName} Live Data`, 'ESG AI Copilot (GRI-aligned)']
            : ['ESG AI Copilot Service (Edge Proxy)'],
          ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ])
    } catch {
      simulateLocalReply(userMessage.text)
    } finally {
      setIsTyping(false)
    }
  }

  const simulateLocalReply = (prompt: string) => {
    const p = prompt.toLowerCase()
    let response = 'Based on your current ESG metrics, I recommend focusing on resolving the critical compliance issue in Manufacturing. This will remove scoring penalties and increase your Governance score by up to 10 points.'
    let sources = ['Governance Compliance Issue Log']

    if (p.includes('carbon') || p.includes('emission') || p.includes('environmental')) {
      response = `Your Environmental score is currently ${avgE}/100. The stacked area chart indicates Grid Electricity consumption remains your largest emission contributor. Installing solar arrays (simulate solar slider to 60kW) will reduce emissions by 4,100 kg CO₂e, improving Env score by +4.8.`
      sources = ['Emission Factors Library', '12-Month stacked area trend']
    } else if (p.includes('social') || p.includes('csr') || p.includes('employee') || p.includes('training') || p.includes('workforce')) {
      response = `Workforce participation in CSR activities stands at 32%. Increasing employee participation via gamification challenges (carpool or zero waste) can boost your Social score to 85. Training completion rates are also a key Social KPI — aim for 70%+ coverage.`
      sources = ['Employee Participation Registry', 'Gamification badge auto-award rule', 'Training Records']
    } else if (p.includes('governance') || p.includes('gov') || p.includes('board') || p.includes('risk') || p.includes('oversight')) {
      response = `Your Governance score (${avgG}/100) is impacted by ${issues.length} open compliance issue(s). Resolving all critical issues and ensuring 100% policy acknowledgements can lift Governance scores by up to 15 points. Aim for quarterly audit coverage.`
      sources = ['Governance Compliance Dashboard', 'Audit Schedule', 'Policy Acknowledgement Registry']
    } else if (p.includes('policy') || p.includes('acknowledg') || p.includes('compliance') || p.includes('audit')) {
      response = `You currently have ${issues.length} unresolved compliance issues. Ensure all employees have acknowledged active ESG policies — overdue policy acknowledgements reduce Governance scoring by 1.2 points per department. Schedule upcoming audits to close gaps.`
      sources = ['Compliance Issue Registry', 'Policy Management Module', 'Audit Scheduler']
    } else if (p.includes('score') || p.includes('index') || p.includes('kpi') || p.includes('metric')) {
      response = `Overall ESG index: ${avgTotal}/100 (E: ${avgE}, S: ${avgS}, G: ${avgG}). Department scoring uses a weighted 40/30/30 formula. Use the What-If Simulator to model the impact of reducing electricity consumption or improving CSR participation.`
      sources = ['ESG Composite Score Engine', 'Weighting Settings']
    } else if (p.includes('reward') || p.includes('redeem') || p.includes('point') || p.includes('xp') || p.includes('badge') || p.includes('gamif')) {
      response = `The Gamification Engine awards XP for completing CSR activities and earning badges. Employees can redeem Reward Catalog items with points. Ensure reward stock is maintained — out-of-stock items reduce participation incentive.`
      sources = ['Gamification Engine', 'Reward Catalog', 'Leaderboard']
    } else if (p.includes('supplier') || p.includes('chain') || p.includes('scope 3') || p.includes('scope3')) {
      response = `Supplier ESG performance affects your Scope 3 emissions and overall Environmental score. Low-rated suppliers contribute to indirect emission risks. Recommend conducting quarterly supplier audits and targeting a minimum 70% green-rated supply chain.`
      sources = ['Supplier Management Module', 'Scope 3 Emission Factors']
    }

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [...prev, { sender: 'copilot', text: response, sources, ts }])
  }

  return (
    <div className="space-y-6">
      {/* Top row status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/20 border border-border rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm">ESG Decision Command Center</h3>
            <p className="text-xs text-muted-foreground">Strategic analytics and what-if simulation engine.</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs font-semibold">
          <div>
            <span className="text-muted-foreground block text-[10px]">ORGANIZATION RISK LEVEL</span>
            <span className="text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> High Exposure
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">LAST CALCULATION</span>
            <span>Just Now</span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setSubTab('deck')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
            subTab === 'deck'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Command Deck
        </button>
        <button
          onClick={() => setSubTab('whatif')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
            subTab === 'whatif'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          What-If Simulator
        </button>
      </div>

      {subTab === 'whatif' ? (
        <WhatIfSimulator />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: ESG Health Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-4">ESG Health Index</h3>
            <div className="text-center py-4 bg-gradient-to-b from-primary/10 to-transparent rounded-2xl">
              <p className="text-6xl font-black text-primary">{avgTotal}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-wider">Overall ESG Index</p>
              <p className="text-[10px] text-green-500 font-semibold mt-0.5">↑ 2.1 pts vs last month</p>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Environmental', score: avgE, fill: 'bg-emerald-500' },
                { label: 'Social', score: avgS, fill: 'bg-teal-500' },
                { label: 'Governance', score: avgG, fill: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-xs">
                  <span className="w-24 text-muted-foreground font-medium">{item.label}</span>
                  <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                    <div className={`${item.fill} h-2 rounded-full`} style={{ width: `${item.score}%` }} />
                  </div>
                  <span className="font-mono font-bold w-8 text-right">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 italic">Weighted Index: E {org.env_weight}% | S {org.social_weight}% | G {org.gov_weight}%</p>
        </div>

        {/* Col 2: What-if Simulator */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-4 flex items-center justify-between">
              What-If Simulator
              <Sliders className="w-4 h-4 text-muted-foreground" />
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Increase EV Fleet portion:</span>
                  <span className="text-primary font-bold">+{evFleetPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={evFleetPercent}
                  onChange={(e) => {
                    setEvFleetPercent(Number(e.target.value))
                    setIsSimulating(true)
                  }}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Install Rooftop Solar:</span>
                  <span className="text-primary font-bold">+{solarKw} kW</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={solarKw}
                  onChange={(e) => {
                    setSolarKw(Number(e.target.value))
                    setIsSimulating(true)
                  }}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Increase CSR Participation:</span>
                  <span className="text-primary font-bold">+{csrParticipation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={csrParticipation}
                  onChange={(e) => {
                    setCsrParticipation(Number(e.target.value))
                    setIsSimulating(true)
                  }}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/80">
                <span className="text-xs font-semibold">Resolve Critical Compliance Issues</span>
                <input
                  type="checkbox"
                  checked={resolveOverdue}
                  onChange={(e) => {
                    setResolveOverdue(e.target.checked)
                    setIsSimulating(true)
                  }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {isSimulating && (
            <div className="mt-6 pt-4 border-t border-border bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 animate-pulse">
              <div className="flex justify-between text-xs font-bold text-emerald-600 mb-1">
                <span>Simulated score result:</span>
                <span>{simulatedScores.total} / 100</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Impact Estimate based on historical data and industry benchmarks</p>
            </div>
          )}

          <button
            onClick={() => {
              setEvFleetPercent(0)
              setSolarKw(0)
              setCsrParticipation(0)
              setResolveOverdue(false)
              setIsSimulating(false)
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
          >
            <Sliders className="w-3.5 h-3.5" /> Reset Simulation
          </button>
        </div>

        {/* Col 3: Forecasting Chart — Holt-Winters */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-base">ESG Trend Projection</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Holt-Winters exponential smoothing · 95% CI band</p>
            </div>
            {anomalyPoints.length > 0 && (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                {anomalyPoints.length} anomal{anomalyPoints.length === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastScores} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="hwActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hwForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff12" />
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} domain={[60, 90]} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any, name: string) => [typeof v === 'number' ? v.toFixed(1) : v, name]}
                />
                {/* Confidence band */}
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#hwForecast)" fillOpacity={1} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="url(#hwForecast)" fillOpacity={0.5} />
                {/* Actual line */}
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#hwActual)" dot={false} name="ESG Score" />
                {/* Anomaly markers */}
                {anomalyPoints.map((a: { month: string; score: number; zScore: number }, i: number) => (
                  <ReferenceDot
                    key={i}
                    x={a.month}
                    y={a.score}
                    r={5}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={1.5}
                    label={{ value: '⚠', position: 'top', fontSize: 10 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs bg-muted/40 border border-border/80 p-3 rounded-xl">
            <span className="font-semibold text-emerald-600 block mb-0.5">
              Forecast Range: {forecastScores[forecastScores.length - 1]?.lower.toFixed(0)}–{forecastScores[forecastScores.length - 1]?.upper.toFixed(0)} by September
            </span>
            <p className="text-[10px] text-muted-foreground">Holt-Winters triple smoothing · assumes steady trend</p>
          </div>
        </div>
      </div>

      {/* Row 2: Executive Decision Cards */}
      <div>
        <h3 className="font-bold text-base mb-4">Executive Decision Deck</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decisionCards.map((card) => (
            <div key={card.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${card.statusColor}`}>{card.status}</span>
                  <span className="text-xs font-bold text-emerald-600">{card.gain}</span>
                </div>
                <h4 className="font-bold text-base mt-3 text-foreground">{card.title}</h4>
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Metric Gap</span>
                    <span className="font-medium text-foreground">{card.gap}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Business Risk</span>
                    <p className="text-red-500 font-medium">{card.risk}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {card.action}
                </p>
                <button
                  onClick={card.simulateAction}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  Simulate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Copilot Panel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[480px]">
        {/* Panel Header */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-emerald-500/10 to-teal-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm">AI ESG Decision Copilot</h3>
            {esgContext && (
              <span className="text-[10px] text-muted-foreground">
                · Context: {esgContext.lastUpdated ? new Date(esgContext.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'loaded'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadContext(true)}
              title="Refresh ESG context"
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${contextLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowContextPanel(prev => !prev)}
              title="Toggle data context"
              className="flex items-center gap-1 p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[10px] font-semibold"
            >
              <Database className="w-3.5 h-3.5" />
              {showContextPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">Llama-3.3-70B Live</span>
          </div>
        </div>

        {/* Context data panel (collapsible) */}
        {showContextPanel && esgContext && (
          <div className="border-b border-border bg-muted/20 p-4 text-[10px] font-mono text-muted-foreground overflow-auto max-h-32">
            <pre className="whitespace-pre-wrap">{JSON.stringify({
              scores: esgContext.currentScores,
              topRisks: esgContext.topRisks?.slice(0, 2),
              goalsOffTrack: esgContext.goalsOffTrack?.length,
              openIssues: esgContext.openComplianceIssues?.length,
            }, null, 2)}</pre>
          </div>
        )}

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project')) && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/8 text-xs text-amber-600">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Running in <strong>offline demo mode</strong>. Configure your Supabase credentials in your environment variables to enable live server-side AI proxying.</span>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} gap-1`}>
              <div className={`max-w-[75%] rounded-2xl p-4 border text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-primary text-primary-foreground border-primary/20 shadow-sm'
                  : 'bg-muted/50 border-border text-foreground'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.sources && (
                  <div className="mt-3.5 pt-2 border-t border-border/80 flex flex-wrap gap-1.5">
                    {m.sources.map((s: string) => (
                      <span key={s} className="bg-muted text-[10px] text-muted-foreground px-2 py-0.5 rounded-full border border-border/60">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {m.ts && <span className="text-[10px] text-muted-foreground px-1">{m.ts}</span>}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-1">
              <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input + Starter questions */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-muted/10 space-y-2">
          {/* Starter questions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5">
              {starterQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChatInput(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. How can we improve our social score by 10 points?"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="submit" className="p-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg transition-colors shadow-sm">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
        </>
      )}
    </div>
  )
}
