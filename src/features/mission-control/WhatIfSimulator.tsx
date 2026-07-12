import React, { useState, useMemo, useEffect } from 'react'
import { dbService } from '@/lib/dbService'
import { calculateFullScore, type ScoringInput } from '@/lib/scoring/engine'
import { queryAI } from '@/lib/groq'
import { useToast } from '@/contexts/ToastContext'
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Clock,
  Sparkles,
  Save,
  CheckCircle,
  Database
} from 'lucide-react'

export function WhatIfSimulator() {
  const { success, error: toastError } = useToast()
  const [refreshKey, setRefreshKey] = useState(0)

  // ─── Current State Data ───
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const profiles = useMemo(() => dbService.getProfiles(), [refreshKey])
  const rawGoals = useMemo(() => dbService.getGoals(), [refreshKey])
  const rawTxs = useMemo(() => dbService.getCarbonTransactions(), [refreshKey])
  const rawCSR = useMemo(() => dbService.getCSRActivities(), [refreshKey])
  const rawTraining = useMemo(() => dbService.getTrainingRecords(), [refreshKey])
  const rawAcks = useMemo(() => dbService.getAcknowledgements(), [refreshKey])
  const rawAudits = useMemo(() => dbService.getAudits(), [refreshKey])
  const rawIssues = useMemo(() => dbService.getComplianceIssues(), [refreshKey])

  // Get current calculations using engine
  const currentScoringInput = useMemo<ScoringInput>(() => {
    const activeCSR = rawCSR.filter(a => a.status === 'active')
    const participations = dbService.getCSRParticipations()
    const csrActivities = activeCSR.map(a => {
      const pCount = participations.filter(p => p.activity_id === a.id && p.approval_status === 'approved').length
      return {
        participants: pCount,
        totalEligible: a.max_participants ?? profiles.length,
        approved: true
      }
    })

    const trainingRecords = rawTraining.map(t => ({
      completed: t.status === 'completed',
      userId: t.employee_id
    }))

    const activePolicies = dbService.getPolicies().filter(p => p.status === 'active')
    const policies = activePolicies.map(p => {
      const ackedCount = rawAcks.filter(a => a.policy_id === p.id).length
      return {
        acknowledged: ackedCount,
        total: profiles.length,
        status: p.status as 'active' | 'draft' | 'archived'
      }
    })

    const audits = rawAudits.map(a => {
      const isCompleted = a.status === 'completed'
      return {
        findings: isCompleted ? 2 : 0,
        critical: 0,
        resolved: isCompleted ? 2 : 0
      }
    })

    const complianceIssues = rawIssues.map(i => ({
      severity: i.severity as 'low' | 'medium' | 'high' | 'critical',
      resolved: i.status === 'resolved'
    }))

    return {
      goals: rawGoals.map(g => ({
        target: g.target_value,
        actual: g.current_value,
        deadline: new Date(g.deadline)
      })),
      emissions: rawTxs.map(t => ({
        amount: t.calculated_emission_kg,
        month: new Date(t.date),
        scope: t.notes?.includes('Scope 2') ? 2 : t.notes?.includes('Scope 3') ? 3 : 1 as any
      })),
      csrActivities,
      trainingRecords,
      diversityScore: 65,
      policies,
      audits,
      complianceIssues,
      weights: {
        environmental: org.env_weight,
        social: org.social_weight,
        governance: org.gov_weight
      }
    }
  }, [rawGoals, rawTxs, rawCSR, rawTraining, rawAcks, rawAudits, rawIssues, org, profiles, refreshKey])

  const currentResult = useMemo(() => {
    return calculateFullScore(currentScoringInput)
  }, [currentScoringInput])

  // Current Base Numbers for Slider Constraints
  const currentTrainingPct = useMemo(() => {
    if (currentScoringInput.trainingRecords.length === 0) return 0
    const completed = currentScoringInput.trainingRecords.filter(t => t.completed).length
    return Math.round((completed / currentScoringInput.trainingRecords.length) * 100)
  }, [currentScoringInput])

  const openIssuesCount = useMemo(() => {
    return rawIssues.filter(i => i.status !== 'resolved').length
  }, [rawIssues])

  const currentAckRate = useMemo(() => {
    if (currentScoringInput.policies.length === 0) return 0
    const totalRequired = currentScoringInput.policies.length * profiles.length
    const totalAcked = rawAcks.filter(a =>
      dbService.getPolicies().filter(p => p.status === 'active').some(p => p.id === a.policy_id)
    ).length
    return totalRequired > 0 ? Math.round((totalAcked / totalRequired) * 100) : 100
  }, [currentScoringInput, profiles, rawAcks])

  // ─── Slider/Toggles Inputs State ───
  const [reduceScope1, setReduceScope1] = useState(0)
  const [renewableQuarter, setRenewableQuarter] = useState('Q4 2026')
  const [completeGoals, setCompleteGoals] = useState(0)

  const [trainingPct, setTrainingPct] = useState(currentTrainingPct)
  const [newCSRActivities, setNewCSRActivities] = useState(0)
  const [diversityGain, setDiversityGain] = useState(0)

  const [resolveIssues, setResolveIssues] = useState(0)
  const [policyAckRate, setPolicyAckRate] = useState(currentAckRate)
  const [completeAudit, setCompleteAudit] = useState(false)

  // Sync state with current defaults once loaded
  useEffect(() => {
    setTrainingPct(currentTrainingPct)
    setPolicyAckRate(currentAckRate)
  }, [currentTrainingPct, currentAckRate])

  // ─── Scenario Saving state ───
  const [scenarioName, setScenarioName] = useState('')
  const [savedScenarios, setSavedScenarios] = useState<any[]>([])

  useEffect(() => {
    setSavedScenarios(dbService.getWhatIfScenarios())
  }, [refreshKey])

  // ─── Calculations for Simulated Outcome ───
  const simulatedResult = useMemo(() => {
    const input: ScoringInput = JSON.parse(JSON.stringify(currentScoringInput))

    // 1. Environmental Adjustments
    // Reduce Scope 1 Emissions
    if (reduceScope1 > 0) {
      input.emissions = input.emissions.map(e => {
        if (e.scope === 1) {
          return { ...e, amount: e.amount * (1 - reduceScope1 / 100) }
        }
        return e
      })
    }
    // Switch to Renewable Electricity
    // If completed in early quarters, reduce Scope 2 (electricity) emissions by 90%
    const scope2Reduction = renewableQuarter === 'Q1 2026' ? 0.9 : renewableQuarter === 'Q2 2026' ? 0.8 : renewableQuarter === 'Q3 2026' ? 0.6 : 0.4
    input.emissions = input.emissions.map(e => {
      if (e.scope === 2) {
        return { ...e, amount: e.amount * (1 - scope2Reduction) }
      }
      return e
    })
    // Complete goals
    for (let i = 0; i < Math.min(completeGoals, input.goals.length); i++) {
      if (input.goals[i]) {
        input.goals[i].actual = input.goals[i].target // bring it to 100% completion
      }
    }

    // 2. Social Adjustments
    // Increase Training
    const additionalTrainingCount = Math.max(0, Math.round(((trainingPct - currentTrainingPct) / 100) * input.trainingRecords.length))
    let trained = 0
    input.trainingRecords = input.trainingRecords.map(t => {
      if (!t.completed && trained < additionalTrainingCount) {
        trained++
        return { ...t, completed: true }
      }
      return t
    })
    // New CSR Activities
    for (let i = 0; i < newCSRActivities; i++) {
      input.csrActivities.push({
        participants: Math.round(profiles.length * 0.8), // 80% participation
        totalEligible: profiles.length,
        approved: true
      })
    }
    // Diversity Index Gain
    input.diversityScore = Math.min(100, input.diversityScore + diversityGain)

    // 3. Governance Adjustments
    // Resolve compliance issues
    let resolved = 0
    input.complianceIssues = input.complianceIssues.map(issue => {
      if (!issue.resolved && resolved < resolveIssues) {
        resolved++
        return { ...issue, resolved: true }
      }
      return issue
    })
    // Policy acknowledgements
    input.policies = input.policies.map(p => ({
      ...p,
      acknowledged: Math.round(p.total * (policyAckRate / 100))
    }))
    // Complete pending Q4 audit
    if (completeAudit) {
      input.audits = input.audits.map(a => ({
        ...a,
        findings: 0, // no findings
        resolved: a.findings
      }))
    }

    return calculateFullScore(input)
  }, [
    currentScoringInput,
    reduceScope1,
    renewableQuarter,
    completeGoals,
    trainingPct,
    currentTrainingPct,
    newCSRActivities,
    diversityGain,
    resolveIssues,
    policyAckRate,
    completeAudit,
    profiles
  ])

  // ─── Financial Costs & Schedule Estimates ───
  const financialCost = useMemo(() => {
    let cost = 0
    // Training completion cost: 10% gain -> ₹2.5L
    const trainingGain = Math.max(0, trainingPct - currentTrainingPct)
    cost += (trainingGain / 10) * 250000

    // Emission reduction cost: 20% Scope 1 reduction -> ₹18L (₹90k per 1%)
    cost += reduceScope1 * 90000

    // Switch to Renewable Electricity: early quarter transition requires consultancy & certification fees
    const qCost = renewableQuarter === 'Q1 2026' ? 500000 : renewableQuarter === 'Q2 2026' ? 300000 : renewableQuarter === 'Q3 2026' ? 150000 : 50000
    cost += qCost

    // CSR activities cost: ₹25k per activity
    cost += newCSRActivities * 25000

    // Resolve compliance issues: ₹50k per critical/high issue remediation
    cost += resolveIssues * 50000

    // Policy ack campaign cost: ₹15k per 10% push
    const ackGain = Math.max(0, policyAckRate - currentAckRate)
    cost += (ackGain / 10) * 15000

    return Math.round(cost)
  }, [reduceScope1, renewableQuarter, trainingPct, currentTrainingPct, newCSRActivities, resolveIssues, policyAckRate, currentAckRate])

  const timeFrameWeeks = useMemo(() => {
    let base = 2
    if (reduceScope1 > 0) base = Math.max(base, Math.round(reduceScope1 * 0.4))
    if (trainingPct > currentTrainingPct) base = Math.max(base, Math.round((trainingPct - currentTrainingPct) * 0.2))
    if (resolveIssues > 0) base = Math.max(base, resolveIssues * 3)
    if (renewableQuarter === 'Q1 2026') base = Math.max(base, 16)
    else if (renewableQuarter === 'Q2 2026') base = Math.max(base, 12)
    return base
  }, [reduceScope1, trainingPct, currentTrainingPct, resolveIssues, renewableQuarter])

  // Get score letter grades
  const getGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    return 'D'
  }

  const currentGrade = getGrade(currentResult.overall)
  const simulatedGrade = getGrade(simulatedResult.overall)

  // ─── AI ROI Statement ───
  const [aiStatement, setAiStatement] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const handleFetchROIStatement = async () => {
    setAiLoading(true)
    const prompt = `
      Current ESG Score: ${currentResult.overall.toFixed(1)} (${currentGrade})
      Projected ESG Score: ${simulatedResult.overall.toFixed(1)} (${simulatedGrade})
      Proposed Interventions:
      - Direct emissions reduction: ${reduceScope1}%
      - Switch to renewable power: By ${renewableQuarter}
      - Training completion rate target: ${trainingPct}%
      - New CSR campaigns: ${newCSRActivities}
      - Compliance issues resolved: ${resolveIssues}
      - Policy acknowledgment: ${policyAckRate}%
      Total Estimated Cost: ₹${(financialCost / 100000).toFixed(2)}L
      Timeline: ${timeFrameWeeks} weeks.
    `

    try {
      const response = await queryAI(
        [{ sender: 'user', text: prompt }],
        `You are the EcoSphere ESG Business Analyst. Write a high-level executive ROI statement mapping the score improvements to CSRD compliance benefits, capital accessibility advantages (cheaper green loans), and market positioning. Keep it strictly to 3 sentences. Begin with a celebratory tone.`,
        {}
      )
      setAiStatement(response.content)
    } catch {
      // Mock Fallback statement
      setAiStatement(`This combination of interventions would improve your ESG score from ${currentResult.overall.toFixed(1)} to ${simulatedResult.overall.toFixed(1)} — moving from a ${currentGrade} to ${simulatedGrade} grade. With an estimated investment of ₹${(financialCost / 100000).toFixed(2)}L over ${timeFrameWeeks} weeks, this initiative mitigates regulatory penalty risk and positions GreenTech Manufacturing for full CSRD alignment before the 2026 reporting deadline.`)
    } finally {
      setAiLoading(false)
    }
  }

  // Auto-generate mock statement on change
  useEffect(() => {
    setAiStatement(`This combination of interventions would improve your ESG score from ${currentResult.overall.toFixed(1)} to ${simulatedResult.overall.toFixed(1)} — moving from a ${currentGrade} to ${simulatedGrade} grade. Estimated cost: ₹${(financialCost / 100000).toFixed(2)}L. Positions you for CSRD compliance before the 2026 deadline.`)
  }, [simulatedResult.overall, financialCost, timeFrameWeeks])

  // Save Scenario
  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scenarioName.trim()) return

    const inputs = {
      reduceScope1,
      renewableQuarter,
      completeGoals,
      trainingPct,
      newCSRActivities,
      diversityGain,
      resolveIssues,
      policyAckRate,
      completeAudit
    }

    dbService.saveWhatIfScenario({
      name: scenarioName,
      org_id: org.id,
      inputs,
      projected_score: simulatedResult.overall
    })

    setScenarioName('')
    setRefreshKey(prev => prev + 1)
    success('Simulation Saved', 'Scenario has been recorded in your local scenarios library.')
  }

  // Load Scenario inputs
  const handleLoadScenario = (scenario: any) => {
    const { inputs } = scenario
    if (inputs.reduceScope1 !== undefined) setReduceScope1(inputs.reduceScope1)
    if (inputs.renewableQuarter !== undefined) setRenewableQuarter(inputs.renewableQuarter)
    if (inputs.completeGoals !== undefined) setCompleteGoals(inputs.completeGoals)
    if (inputs.trainingPct !== undefined) setTrainingPct(inputs.trainingPct)
    if (inputs.newCSRActivities !== undefined) setNewCSRActivities(inputs.newCSRActivities)
    if (inputs.diversityGain !== undefined) setDiversityGain(inputs.diversityGain)
    if (inputs.resolveIssues !== undefined) setResolveIssues(inputs.resolveIssues)
    if (inputs.policyAckRate !== undefined) setPolicyAckRate(inputs.policyAckRate)
    if (inputs.completeAudit !== undefined) setCompleteAudit(inputs.completeAudit)
    success('Scenario Loaded', `"${scenario.name}" has been loaded into the simulator.`)
  }

  const scoreDiff = parseFloat((simulatedResult.overall - currentResult.overall).toFixed(1))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            Interactive What-If Impact Simulator
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Simulate operational adjustments across Environmental, Social, and Governance pillars. Model the financial inputs, timelines, and projected scores before committing capital.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL: Current State */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-6 shadow-sm">
          <h4 className="font-bold text-sm border-b border-border pb-3 flex justify-between items-center text-foreground">
            <span>Current State (DB)</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded-full">Base Grade: {currentGrade}</span>
          </h4>

          <div className="text-center py-6 bg-muted/20 border border-border/80 rounded-2xl">
            <p className="text-5xl font-black text-foreground">{currentResult.overall.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Composite Index</p>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Environmental', score: currentResult.environmental.score, weight: org.env_weight, barColor: 'bg-emerald-500' },
              { name: 'Social', score: currentResult.social.score, weight: org.social_weight, barColor: 'bg-blue-500' },
              { name: 'Governance', score: currentResult.governance.score, weight: org.gov_weight, barColor: 'bg-amber-500' }
            ].map((pillar) => (
              <div key={pillar.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{pillar.name} ({pillar.weight}%)</span>
                  <span className="font-bold text-foreground">{pillar.score.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${pillar.barColor} transition-all duration-300`} style={{ width: `${pillar.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Library Scenarios */}
          {savedScenarios.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Saved Scenarios
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleLoadScenario(scenario)}
                    className="w-full text-left p-2.5 bg-muted/40 hover:bg-muted border border-border rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-semibold truncate max-w-[150px]">{scenario.name}</span>
                    <span className="font-mono bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                      {scenario.projected_score.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER PANEL: Hypothetical Changes */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-6 shadow-sm">
          <h4 className="font-bold text-sm border-b border-border pb-3 text-foreground flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-purple-400" /> Hypothetical Interventions
          </h4>

          {/* Environmental Pillar */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase text-emerald-500 block tracking-wider">Environmental</span>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Reduce Scope 1 emissions</span>
                <span className="font-bold text-emerald-600">{reduceScope1}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={reduceScope1}
                onChange={(e) => setReduceScope1(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground block">Renewable Power Transition</label>
              <select
                value={renewableQuarter}
                onChange={(e) => setRenewableQuarter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs"
              >
                <option value="Q1 2026">Q1 2026 (Max score gain · Early adoption)</option>
                <option value="Q2 2026">Q2 2026 (High score gain)</option>
                <option value="Q3 2026">Q3 2026 (Moderate gain)</option>
                <option value="Q4 2026">Q4 2026 (Scheduled default)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Complete pending goals</span>
                <span className="font-bold text-emerald-600">{completeGoals} / {rawGoals.length}</span>
              </div>
              <input
                type="range"
                min="0"
                max={rawGoals.length}
                value={completeGoals}
                onChange={(e) => setCompleteGoals(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>
          </div>

          {/* Social Pillar */}
          <div className="space-y-4 pt-2 border-t border-border/80">
            <span className="text-[10px] font-bold uppercase text-blue-500 block tracking-wider">Social</span>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Training completion rate</span>
                <span className="font-bold text-blue-600">{trainingPct}%</span>
              </div>
              <input
                type="range"
                min={currentTrainingPct}
                max="100"
                step="5"
                value={trainingPct}
                onChange={(e) => setTrainingPct(Number(e.target.value))}
                className="w-full accent-blue-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Launch new CSR activities</span>
                <span className="font-bold text-blue-600">+{newCSRActivities} campaigns</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={newCSRActivities}
                onChange={(e) => setNewCSRActivities(Number(e.target.value))}
                className="w-full accent-blue-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Improve Diversity index</span>
                <span className="font-bold text-blue-600">+{diversityGain} pts</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={diversityGain}
                onChange={(e) => setDiversityGain(Number(e.target.value))}
                className="w-full accent-blue-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>
          </div>

          {/* Governance Pillar */}
          <div className="space-y-4 pt-2 border-t border-border/80">
            <span className="text-[10px] font-bold uppercase text-amber-500 block tracking-wider">Governance</span>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Resolve open compliance issues</span>
                <span className="font-bold text-amber-600">{resolveIssues} / {openIssuesCount}</span>
              </div>
              <input
                type="range"
                min="0"
                max={openIssuesCount}
                value={resolveIssues}
                onChange={(e) => setResolveIssues(Number(e.target.value))}
                className="w-full accent-amber-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Policy acknowledgement rate</span>
                <span className="font-bold text-amber-600">{policyAckRate}%</span>
              </div>
              <input
                type="range"
                min={currentAckRate}
                max="100"
                step="5"
                value={policyAckRate}
                onChange={(e) => setPolicyAckRate(Number(e.target.value))}
                className="w-full accent-amber-500 bg-muted h-1 cursor-pointer rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/80">
              <div className="text-xs">
                <span className="font-semibold block text-foreground">Complete Q4 Internal Audit</span>
                <span className="text-[10px] text-muted-foreground">Clear all pending review items</span>
              </div>
              <input
                type="checkbox"
                checked={completeAudit}
                onChange={(e) => setCompleteAudit(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Projected Outcome */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm border-b border-border pb-3 text-foreground">
              Projected ESG Outcome
            </h4>

            {/* Projected Score Ring */}
            <div className="py-6 flex flex-col items-center justify-center bg-purple-500/5 rounded-2xl border border-purple-500/10 mt-4 relative overflow-hidden">
              <p className="text-6xl font-black text-purple-600">{simulatedResult.overall.toFixed(1)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-700 rounded-full">Grade: {simulatedGrade}</span>
                {scoreDiff !== 0 && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full
                    ${scoreDiff > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                  >
                    {scoreDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                  </span>
                )}
              </div>
            </div>

            {/* Estimates Cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-purple-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">EST. INVESTMENT</span>
                  <span className="text-sm font-bold">
                    {financialCost > 0 ? `₹${(financialCost / 100000).toFixed(2)}L` : '₹0'}
                  </span>
                </div>
              </div>
              <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-purple-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">ESTIMATED TIMELINE</span>
                  <span className="text-sm font-bold">~ {timeFrameWeeks} weeks</span>
                </div>
              </div>
            </div>

            {/* AI Statement Box */}
            <div className="mt-4 p-4 border border-purple-500/20 bg-purple-500/5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI ESG ROI Statement
                </span>
                <button
                  onClick={handleFetchROIStatement}
                  disabled={aiLoading}
                  className="text-[10px] font-bold text-purple-600 hover:text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded transition-all disabled:opacity-50"
                >
                  {aiLoading ? 'Thinking...' : 'Regenerate'}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                "{aiStatement || 'Select changes and click generate to load detailed business benefits analysis.'}"
              </p>
            </div>
          </div>

          {/* Save Scenario Form */}
          <form onSubmit={handleSaveScenario} className="pt-4 border-t border-border space-y-3 mt-4">
            <label className="text-[10px] font-bold text-muted-foreground block uppercase">Save this simulation</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Q3 Compliance Push"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
