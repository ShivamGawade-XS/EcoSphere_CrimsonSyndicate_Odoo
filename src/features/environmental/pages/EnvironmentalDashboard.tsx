import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import {
  EmissionFactor,
  CarbonTransaction,
  EnvironmentalGoal,
  EmissionActivityType,
} from '@/types'
import {
  formatCO2,
  formatDate,
  getScoreColor,
} from '@/lib/utils'
import {
  Leaf,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Building2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ClipboardList,
  X,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function EnvironmentalDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'factors' | 'goals' | 'suppliers'>('overview')

  // State triggers for refresh
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const factors = useMemo(() => dbService.getEmissionFactors(), [refreshKey])
  const transactions = useMemo(() => dbService.getCarbonTransactions(), [refreshKey])
  const goals = useMemo(() => dbService.getGoals(), [refreshKey])

  // Modals state
  const [showFactorModal, setShowFactorModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)

  // Supplier Scorecard State — stored in localStorage via dbService key
  const suppliers = useMemo(() => {
    try {
      const raw = localStorage.getItem('ecosphere_suppliers')
      return raw ? JSON.parse(raw) as SupplierRecord[] : getDefaultSuppliers()
    } catch {
      return getDefaultSuppliers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    category: 'Raw Materials',
    country: '',
    envScore: 70,
    socialScore: 70,
    govScore: 70,
    lastAudit: new Date().toISOString().split('T')[0],
    certifications: '',
  })

  // Form states
  const [newFactor, setNewFactor] = useState({
    name: '',
    activity_type: 'manufacturing' as EmissionActivityType,
    factor_value: 0.1,
    unit: 'kg CO₂e / kWh',
    source: '',
  })

  const [newTx, setNewTx] = useState({
    department_id: depts[0]?.id || '',
    emission_factor_id: factors[0]?.id || '',
    quantity: 1,
    source_type: 'manufacturing' as EmissionActivityType,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    department_id: '',
    target_value: 1000,
    unit: 'kg CO₂e',
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState('')

  // Derived metrics
  const totalEmissionsKg = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + tx.calculated_emission_kg, 0)
  }, [transactions])

  const emissionsBySource = useMemo(() => {
    const data: Record<string, number> = { purchase: 0, manufacturing: 0, expense: 0, fleet: 0, other: 0 }
    transactions.forEach(tx => {
      data[tx.source_type] = (data[tx.source_type] || 0) + tx.calculated_emission_kg
    })
    return Object.entries(data).map(([key, val]) => ({ name: key.toUpperCase(), value: Math.round(val) }))
  }, [transactions])

  const monthlyEmissionsTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const trend: Record<string, any> = {}

    // Init months
    months.forEach((m) => {
      trend[m] = { month: m, MANUFACTURING: 0, FLEET: 0, PURCHASE: 0, EXPENSE: 0, OTHER: 0 }
    })

    transactions.forEach(tx => {
      const date = new Date(tx.date)
      const m = months[date.getMonth()]
      const type = tx.source_type.toUpperCase()
      if (trend[m]) {
        trend[m][type] = (trend[m][type] || 0) + tx.calculated_emission_kg
      }
    })

    return Object.values(trend)
  }, [transactions])

  // Heatmap: Department x Month emissions grid
  const heatmapData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return depts.map(dept => {
      const row: Record<string, any> = { department: dept.name }
      months.forEach((m, mIdx) => {
        const total = transactions
          .filter(tx => tx.department_id === dept.id && new Date(tx.date).getMonth() === mIdx)
          .reduce((sum, tx) => sum + tx.calculated_emission_kg, 0)
        row[m] = Math.round(total)
      })
      return row
    })
  }, [depts, transactions])

  // Trjectory check helper
  const checkGoalTrajectory = (g: EnvironmentalGoal) => {
    const start = new Date(g.start_date).getTime()
    const deadline = new Date(g.deadline).getTime()
    const now = Date.now()

    if (now < start) return { isAtRisk: false, expected: 0 }
    if (now > deadline) return { isAtRisk: g.current_value > g.target_value, expected: g.target_value }

    const elapsed = now - start
    const total = deadline - start
    const expectedRatio = elapsed / total
    const expectedValue = g.target_value * expectedRatio

    // If actual carbon consumption is >20% above the linear expected trajectory, it is at risk
    const threshold = expectedValue * 1.2
    return {
      isAtRisk: g.current_value > threshold,
      expected: Math.round(expectedValue)
    }
  }

  const activeGoalsWithStatus = useMemo(() => {
    return goals.map(g => {
      const trajectory = checkGoalTrajectory(g)
      return {
        ...g,
        isAtRisk: trajectory.isAtRisk,
        expectedProgress: trajectory.expected
      }
    })
  }, [goals])

  // Supplier Actions
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.name || !newSupplier.country) return
    const id = `sup_${Date.now()}`
    const overall = Math.round((newSupplier.envScore * 0.4 + newSupplier.socialScore * 0.3 + newSupplier.govScore * 0.3))
    const risk: 'low' | 'medium' | 'high' = overall >= 70 ? 'low' : overall >= 50 ? 'medium' : 'high'
    const updated = [
      ...suppliers,
      {
        id,
        name: newSupplier.name,
        category: newSupplier.category,
        country: newSupplier.country,
        envScore: Number(newSupplier.envScore),
        socialScore: Number(newSupplier.socialScore),
        govScore: Number(newSupplier.govScore),
        overallScore: overall,
        riskLevel: risk,
        lastAudit: newSupplier.lastAudit,
        certifications: newSupplier.certifications.split(',').map(s => s.trim()).filter(Boolean),
      }
    ]
    localStorage.setItem('ecosphere_suppliers', JSON.stringify(updated))
    setNewSupplier({ name: '', category: 'Raw Materials', country: '', envScore: 70, socialScore: 70, govScore: 70, lastAudit: new Date().toISOString().split('T')[0], certifications: '' })
    setShowSupplierModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteSupplier = (id: string) => {
    const updated = suppliers.filter((s: SupplierRecord) => s.id !== id)
    localStorage.setItem('ecosphere_suppliers', JSON.stringify(updated))
    setRefreshKey(prev => prev + 1)
  }

  // Actions
  const handleAddFactor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFactor.name || newFactor.factor_value <= 0) return

    dbService.addEmissionFactor({
      name: newFactor.name,
      activity_type: newFactor.activity_type,
      factor_value: newFactor.factor_value,
      unit: newFactor.unit,
      source: newFactor.source || 'Manual Entry',
    })

    setNewFactor({ name: '', activity_type: 'manufacturing', factor_value: 0.1, unit: 'kg CO₂e / kWh', source: '' })
    setShowFactorModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteFactor = (id: string) => {
    if (window.confirm('Are you sure you want to delete this emission factor?')) {
      dbService.deleteEmissionFactor(id)
      setRefreshKey(prev => prev + 1)
    }
  }

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTx.department_id || !newTx.emission_factor_id || newTx.quantity <= 0) return

    dbService.addCarbonTransaction({
      department_id: newTx.department_id,
      emission_factor_id: newTx.emission_factor_id,
      quantity: Number(newTx.quantity),
      source_type: newTx.source_type,
      date: newTx.date,
      notes: newTx.notes,
      auto_calculated: org.auto_emission_calc,
    })

    setNewTx({
      department_id: depts[0]?.id || '',
      emission_factor_id: factors[0]?.id || '',
      quantity: 1,
      source_type: 'manufacturing',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowTransactionModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoal.title || newGoal.target_value <= 0) return

    dbService.addGoal({
      title: newGoal.title,
      description: newGoal.description,
      department_id: newGoal.department_id || null,
      target_value: Number(newGoal.target_value),
      unit: newGoal.unit,
      start_date: newGoal.start_date,
      deadline: newGoal.deadline,
      status: 'active',
    })

    setNewGoal({
      title: '',
      description: '',
      department_id: '',
      target_value: 1000,
      unit: 'kg CO₂e',
      start_date: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
    setShowGoalModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        let imported = 0

        // Parse Name, Activity Type, Factor Value, Unit, Source
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const [name, activity_type, factor_value, unit, source] = line.split(',')
          if (name && activity_type && Number(factor_value) > 0 && unit) {
            dbService.addEmissionFactor({
              name: name.replace(/"/g, ''),
              activity_type: activity_type.trim().toLowerCase() as EmissionActivityType,
              factor_value: Number(factor_value),
              unit: unit.replace(/"/g, '').trim(),
              source: source ? source.replace(/"/g, '').trim() : 'CSV Bulk Import',
            })
            imported++
          }
        }

        setImportStatus(`Successfully imported ${imported} factors!`)
        setRefreshKey(prev => prev + 1)
        setTimeout(() => setImportStatus(''), 5000)
      } catch (err) {
        setImportStatus('Error parsing CSV. Please check formatting.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="text-emerald-500 w-7 h-7 animate-pulse" />
            Environmental Tracking
          </h2>
          <p className="text-muted-foreground text-sm">
            Monitor emissions, configure factors, and manage carbon goals.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'factors' && (
            <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Import CSV
              <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            </label>
          )}
          {activeTab === 'transactions' && (
            <button
              onClick={() => setShowTransactionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Log
            </button>
          )}
          {activeTab === 'factors' && (
            <button
              onClick={() => setShowFactorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Factor
            </button>
          )}
          {activeTab === 'goals' && (
            <button
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Target
            </button>
          )}
        </div>
        {activeTab === 'suppliers' && (
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'transactions', label: 'Transactions' },
          { id: 'factors', label: 'Emission Factors' },
          { id: 'goals', label: 'Sustainability Goals' },
          { id: 'suppliers', label: 'Supplier Scorecard' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {importStatus && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-lg text-sm">
          {importStatus}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Carbon Emissions</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">{formatCO2(totalEmissionsKg)}</p>
                <div className="flex items-center gap-1 text-green-500 text-xs font-semibold mt-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>4.2% reduction vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-xl font-bold">
                CO₂
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Goals Tracked</p>
                <p className="text-3xl font-extrabold text-foreground mt-2">{goals.length}</p>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{goals.filter(g => checkGoalTrajectory(g).isAtRisk).length} goal(s) off trajectory</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-xl">
                🎯
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Calculated Metrics Mode</p>
                <p className="text-2xl font-extrabold mt-2 text-primary">
                  {org.auto_emission_calc ? '⚡ Automatic' : '📝 Manual'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Managed via settings toggle</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl">
                ⚙️
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Area Chart: Stacked Carbon Trend */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-base mb-4">12-Month Emission Trend by Activity</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyEmissionsTrend}>
                    <defs>
                      <linearGradient id="colorMfg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFleet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="MANUFACTURING" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorMfg)" />
                    <Area type="monotone" dataKey="FLEET" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFleet)" />
                    <Area type="monotone" dataKey="PURCHASE" stackId="1" stroke="#a855f7" fillOpacity={0.1} fill="#a855f7" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap: Grid table */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-base mb-4">Department Carbon Intensity Heatmap (kg CO₂e)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-4 font-semibold">Department</th>
                      <th className="py-3 px-4 font-semibold text-center">Jan</th>
                      <th className="py-3 px-4 font-semibold text-center">Feb</th>
                      <th className="py-3 px-4 font-semibold text-center">Mar</th>
                      <th className="py-3 px-4 font-semibold text-center">Apr</th>
                      <th className="py-3 px-4 font-semibold text-center">May</th>
                      <th className="py-3 px-4 font-semibold text-center">Jun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium">{row.department}</td>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => {
                          const val = row[m] || 0
                          let cellBg = 'bg-transparent'
                          if (val > 5000) cellBg = 'bg-red-500/10 text-red-700 font-semibold'
                          else if (val > 2000) cellBg = 'bg-amber-500/10 text-amber-700'
                          else if (val > 0) cellBg = 'bg-emerald-500/10 text-emerald-700'
                          return (
                            <td key={m} className={`py-3.5 px-4 text-center rounded-lg ${cellBg}`}>
                              {val === 0 ? '-' : val.toLocaleString()}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-4 px-6 font-semibold">Date</th>
                  <th className="py-4 px-6 font-semibold">Department</th>
                  <th className="py-4 px-6 font-semibold">Source Type</th>
                  <th className="py-4 px-6 font-semibold">Quantity</th>
                  <th className="py-4 px-6 font-semibold">Emissions (kg CO₂e)</th>
                  <th className="py-4 px-6 font-semibold">Method</th>
                  <th className="py-4 px-6 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No carbon transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="py-4 px-6 font-medium">{tx.department?.name || 'Unknown'}</td>
                      <td className="py-4 px-6">
                        <span className="capitalize px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                          {tx.source_type}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {tx.quantity.toLocaleString()} {tx.emission_factor?.unit.split('/').pop()}
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-600">
                        {tx.calculated_emission_kg.toLocaleString()} kg
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.auto_calculated ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {tx.auto_calculated ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground truncate max-w-xs">{tx.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'factors' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-4 px-6 font-semibold">Name</th>
                  <th className="py-4 px-6 font-semibold">Activity Type</th>
                  <th className="py-4 px-6 font-semibold">Value</th>
                  <th className="py-4 px-6 font-semibold">Unit</th>
                  <th className="py-4 px-6 font-semibold">Source</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((fac) => (
                  <tr key={fac.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium">{fac.name}</td>
                    <td className="py-4 px-6 capitalize">{fac.activity_type}</td>
                    <td className="py-4 px-6 font-bold">{fac.factor_value}</td>
                    <td className="py-4 px-6 text-muted-foreground">{fac.unit}</td>
                    <td className="py-4 px-6 text-xs text-muted-foreground">{fac.source || '-'}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteFactor(fac.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeGoalsWithStatus.map((g) => {
            const progressPercent = Math.min(100, Math.round((g.current_value / g.target_value) * 100))
            return (
              <div key={g.id} className={`bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all ${
                g.isAtRisk ? 'border-amber-300 bg-amber-500/5' : 'border-border'
              }`}>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-base text-foreground">{g.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                    </div>
                    {g.isAtRisk && (
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Off Trajectory</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Progress: {g.current_value.toLocaleString()} {g.unit}</span>
                      <span>Target: {g.target_value.toLocaleString()} {g.unit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          g.isAtRisk ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Started: {formatDate(g.start_date)}</span>
                      <span>Expected: {g.expectedProgress.toLocaleString()} {g.unit}</span>
                      <span>Deadline: {formatDate(g.deadline)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    {g.department_id ? depts.find(d => d.id === g.department_id)?.name : 'Company-Wide'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const amt = prompt('Enter new current value for goals tracking:', g.current_value.toString())
                        if (amt && !isNaN(Number(amt))) {
                          dbService.updateGoalProgress(g.id, Number(amt))
                          setRefreshKey(prev => prev + 1)
                        }
                      }}
                      className="text-xs px-2.5 py-1 bg-secondary hover:bg-secondary-dark rounded font-semibold transition-colors"
                    >
                      Update Progress
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Log Carbon Transaction</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department</label>
                <select
                  value={newTx.department_id}
                  onChange={(e) => setNewTx({ ...newTx, department_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Emission Factor / Activity</label>
                <select
                  value={newTx.emission_factor_id}
                  onChange={(e) => {
                    const factor = factors.find(f => f.id === e.target.value)
                    setNewTx({
                      ...newTx,
                      emission_factor_id: e.target.value,
                      source_type: factor?.activity_type || 'manufacturing'
                    })
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  {factors.map(f => <option key={f.id} value={f.id}>{f.name} ({f.factor_value} {f.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newTx.quantity}
                    onChange={(e) => setNewTx({ ...newTx, quantity: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notes / Description</label>
                <textarea
                  value={newTx.notes}
                  onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                  placeholder="Details of log..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Factor Modal */}
      {showFactorModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Add Emission Factor</h3>
            <form onSubmit={handleAddFactor} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solar Electric Inverter"
                  value={newFactor.name}
                  onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Activity Type</label>
                  <select
                    value={newFactor.activity_type}
                    onChange={(e) => setNewFactor({ ...newFactor, activity_type: e.target.value as EmissionActivityType })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    <option value="purchase">Purchase</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="expense">Expense</option>
                    <option value="fleet">Fleet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Factor Value</label>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    required
                    value={newFactor.factor_value}
                    onChange={(e) => setNewFactor({ ...newFactor, factor_value: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Unit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kg CO₂e / kWh"
                  value={newFactor.unit}
                  onChange={(e) => setNewFactor({ ...newFactor, unit: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Source / Citation</label>
                <input
                  type="text"
                  placeholder="e.g. EPA Emissions Database 2024"
                  value={newFactor.source}
                  onChange={(e) => setNewFactor({ ...newFactor, source: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowFactorModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Create Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Set Sustainability Goal</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zero Emissions by Q4"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <textarea
                  placeholder="Outline the steps to achieve this targets..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-16 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Scope / Department</label>
                <select
                  value={newGoal.department_id}
                  onChange={(e) => setNewGoal({ ...newGoal, department_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  <option value="">Company-Wide</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Target Carbon (kg)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newGoal.start_date}
                    onChange={(e) => setNewGoal({ ...newGoal, start_date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Supplier Scorecard Tab ── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Suppliers', value: suppliers.length, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Low Risk', value: suppliers.filter((s: SupplierRecord) => s.riskLevel === 'low').length, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Medium Risk', value: suppliers.filter((s: SupplierRecord) => s.riskLevel === 'medium').length, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'High Risk', value: suppliers.filter((s: SupplierRecord) => s.riskLevel === 'high').length, icon: ShieldX, color: 'text-red-500', bg: 'bg-red-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
                  <p className={`text-3xl font-extrabold mt-1 ${color}`}>{value}</p>
                </div>
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Supplier Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base">Supply Chain ESG Registry</h3>
              <span className="ml-auto text-xs text-muted-foreground">{suppliers.length} suppliers tracked</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Supplier</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Country</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">E Score</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">S Score</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">G Score</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Overall</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Risk</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Last Audit</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Certifications</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-muted-foreground">
                        No suppliers yet. Click "Add Supplier" to register your first vendor.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s: SupplierRecord) => (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-semibold">{s.name}</td>
                        <td className="px-4 py-4 text-muted-foreground">{s.category}</td>
                        <td className="px-4 py-4 text-muted-foreground">{s.country}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-bold ${getScoreColor(s.envScore)}`}>{s.envScore}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-bold ${getScoreColor(s.socialScore)}`}>{s.socialScore}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-bold ${getScoreColor(s.govScore)}`}>{s.govScore}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-lg font-extrabold ${getScoreColor(s.overallScore)}`}>{s.overallScore}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            s.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
                            s.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.riskLevel === 'low' ? <ShieldCheck className="w-3 h-3" /> : s.riskLevel === 'medium' ? <ShieldAlert className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                            {s.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">{formatDate(s.lastAudit)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {s.certifications.length > 0 ? s.certifications.map((c: string) => (
                              <span key={c} className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{c}</span>
                            )) : <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            title="Remove supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-lg">Register New Supplier</h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.name}
                    onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sunrise Steel Pvt. Ltd."
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Category</label>
                  <select
                    value={newSupplier.category}
                    onChange={e => setNewSupplier(p => ({ ...p, category: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {['Raw Materials', 'Logistics', 'Energy', 'IT Services', 'Packaging', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.country}
                    onChange={e => setNewSupplier(p => ({ ...p, country: e.target.value }))}
                    placeholder="e.g. India"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Environmental Score (0–100)</label>
                  <input
                    type="number" min={0} max={100}
                    value={newSupplier.envScore}
                    onChange={e => setNewSupplier(p => ({ ...p, envScore: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Social Score (0–100)</label>
                  <input
                    type="number" min={0} max={100}
                    value={newSupplier.socialScore}
                    onChange={e => setNewSupplier(p => ({ ...p, socialScore: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Governance Score (0–100)</label>
                  <input
                    type="number" min={0} max={100}
                    value={newSupplier.govScore}
                    onChange={e => setNewSupplier(p => ({ ...p, govScore: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Last Audit Date</label>
                  <input
                    type="date"
                    value={newSupplier.lastAudit}
                    onChange={e => setNewSupplier(p => ({ ...p, lastAudit: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Certifications (comma-separated)</label>
                  <input
                    type="text"
                    value={newSupplier.certifications}
                    onChange={e => setNewSupplier(p => ({ ...p, certifications: e.target.value }))}
                    placeholder="e.g. ISO 14001, SA8000, B Corp"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95">
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Supplier types and seed data ────────────────────────────────────────────
interface SupplierRecord {
  id: string
  name: string
  category: string
  country: string
  envScore: number
  socialScore: number
  govScore: number
  overallScore: number
  riskLevel: 'low' | 'medium' | 'high'
  lastAudit: string
  certifications: string[]
}

function getDefaultSuppliers(): SupplierRecord[] {
  return [
    {
      id: 'sup_001',
      name: 'Sunrise Steel Pvt. Ltd.',
      category: 'Raw Materials',
      country: 'India',
      envScore: 62,
      socialScore: 74,
      govScore: 68,
      overallScore: 67,
      riskLevel: 'medium',
      lastAudit: '2026-04-10',
      certifications: ['ISO 14001'],
    },
    {
      id: 'sup_002',
      name: 'GreenPath Logistics',
      category: 'Logistics',
      country: 'Germany',
      envScore: 88,
      socialScore: 82,
      govScore: 90,
      overallScore: 87,
      riskLevel: 'low',
      lastAudit: '2026-05-22',
      certifications: ['ISO 14001', 'SA8000', 'EcoVadis Gold'],
    },
    {
      id: 'sup_003',
      name: 'ChemCore Industries',
      category: 'Raw Materials',
      country: 'China',
      envScore: 38,
      socialScore: 45,
      govScore: 50,
      overallScore: 43,
      riskLevel: 'high',
      lastAudit: '2025-11-05',
      certifications: [],
    },
    {
      id: 'sup_004',
      name: 'SolarPower Solutions',
      category: 'Energy',
      country: 'India',
      envScore: 95,
      socialScore: 80,
      govScore: 85,
      overallScore: 88,
      riskLevel: 'low',
      lastAudit: '2026-06-01',
      certifications: ['B Corp', 'ISO 50001'],
    },
    {
      id: 'sup_005',
      name: 'PackRight Ltd.',
      category: 'Packaging',
      country: 'UK',
      envScore: 72,
      socialScore: 68,
      govScore: 75,
      overallScore: 72,
      riskLevel: 'low',
      lastAudit: '2026-03-18',
      certifications: ['FSC Certified'],
    },
  ]
}
