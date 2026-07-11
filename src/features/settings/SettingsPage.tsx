import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import {
  Organization,
  Department,
  Profile,
  UserRole,
} from '@/types'
import {
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Users,
  CheckCircle,
  Briefcase,
  Sliders,
  SlidersHorizontal,
  Bell,
  RefreshCw,
} from 'lucide-react'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'org' | 'toggles' | 'depts' | 'users' | 'redemptions'>('org')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const users = useMemo(() => dbService.getProfiles(), [refreshKey])
  const redemptions = useMemo(() => dbService.getRedemptions(), [refreshKey])

  // Modals state
  const [showDeptModal, setShowDeptModal] = useState(false)

  // Form states
  const [newDept, setNewDept] = useState({
    name: '',
    code: '',
    parent_id: '',
    head_id: '',
    employee_count: 5,
  })

  // Dynamic slider weight logic
  const handleWeightChange = (field: 'env_weight' | 'social_weight' | 'gov_weight', val: number) => {
    const nextWeights = {
      env_weight: org.env_weight,
      social_weight: org.social_weight,
      gov_weight: org.gov_weight,
    }

    nextWeights[field] = val

    // Adjust other sliders to ensure sum is exactly 100
    const remaining = 100 - val
    const otherFields = Object.keys(nextWeights).filter(k => k !== field) as ('env_weight' | 'social_weight' | 'gov_weight')[]
    
    // Distribute remaining evenly between the other two
    const half = Math.round(remaining / 2)
    nextWeights[otherFields[0]] = half
    nextWeights[otherFields[1]] = remaining - half

    dbService.updateOrganization({
      ...org,
      ...nextWeights
    })
    setRefreshKey(prev => prev + 1)
  }

  // Toggles change handler
  const handleToggle = (field: keyof Organization) => {
    dbService.updateOrganization({
      ...org,
      [field]: !org[field]
    })
    setRefreshKey(prev => prev + 1)
  }

  // Add department
  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDept.name || !newDept.code) return

    dbService.addDepartment({
      name: newDept.name,
      code: newDept.code.toUpperCase(),
      parent_id: newDept.parent_id || null,
      head_id: newDept.head_id || null,
      employee_count: Number(newDept.employee_count),
      status: 'active',
    })

    setNewDept({ name: '', code: '', parent_id: '', head_id: '', employee_count: 5 })
    setShowDeptModal(false)
    setRefreshKey(prev => prev + 1)
  }

  // Change user role/department
  const handleUserRoleChange = (userId: string, role: UserRole) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      dbService.updateProfile({
        ...user,
        role
      })
      setRefreshKey(prev => prev + 1)
    }
  }

  const handleUserDeptChange = (userId: string, departmentId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      dbService.updateProfile({
        ...user,
        department_id: departmentId || null
      })
      setRefreshKey(prev => prev + 1)
    }
  }

  // Fulfill Reward Redemption
  const handleFulfill = (id: string) => {
    dbService.fulfillRedemption(id)
    setRefreshKey(prev => prev + 1)
    alert('Reward request fulfilled!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-muted-foreground w-7 h-7" />
            Administration & Setup
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure weights, manage departments, assign user roles, and fulfill incentives.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'org', label: 'Weights & Profile' },
          { id: 'toggles', label: 'Feature Toggles' },
          { id: 'depts', label: 'Departments' },
          { id: 'users', label: 'Users' },
          { id: 'redemptions', label: 'Redemptions' },
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

      {/* Tab Content */}
      {activeTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ESG Weights Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-base flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" /> ESG Disclosure Weights
            </h3>
            <p className="text-xs text-muted-foreground">
              Adjust organizational score weighting. The three parameters must always sum to exactly 100%.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Environmental weight:</span>
                  <span className="text-primary font-bold">{org.env_weight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={org.env_weight}
                  onChange={(e) => handleWeightChange('env_weight', Number(e.target.value))}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Social weight:</span>
                  <span className="text-primary font-bold">{org.social_weight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={org.social_weight}
                  onChange={(e) => handleWeightChange('social_weight', Number(e.target.value))}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Governance weight:</span>
                  <span className="text-primary font-bold">{org.gov_weight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={org.gov_weight}
                  onChange={(e) => handleWeightChange('gov_weight', Number(e.target.value))}
                  className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'toggles' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-xl space-y-6">
          <h3 className="font-bold text-base">Key Feature Controls</h3>
          <div className="space-y-4">
            {[
              {
                field: 'auto_emission_calc',
                title: 'Auto Emission Calculation',
                desc: 'Automatically calculate and log carbon footprint transactions when linked records are processed.',
              },
              {
                field: 'evidence_required',
                title: 'Evidence Upload Enforcement',
                desc: 'Block all challenge and CSR activity approvals if the employee proof file is missing.',
              },
              {
                field: 'badge_auto_award',
                title: 'Badge Auto-Award System',
                desc: 'Automatically checks and awards badges the moment employee metrics satisfy the badge rules.',
              },
            ].map((toggle) => (
              <div key={toggle.field} className="flex items-start justify-between p-4 bg-muted/30 rounded-xl border border-border/80">
                <div className="pr-4">
                  <h4 className="text-xs font-bold text-foreground">{toggle.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{toggle.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(toggle.field as any)}
                  className="text-primary hover:opacity-90 flex-shrink-0 transition-all"
                >
                  {org[toggle.field as keyof Organization] ? (
                    <ToggleRight className="w-10 h-10 text-primary" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'depts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm">Department Register</h3>
              <p className="text-xs text-muted-foreground">Manage departments and parent structural hierarchies.</p>
            </div>
            <button
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Department
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-4 px-6 font-semibold">Name</th>
                  <th className="py-4 px-6 font-semibold">Code</th>
                  <th className="py-4 px-6 font-semibold">Parent Department</th>
                  <th className="py-4 px-6 font-semibold text-right">Employees</th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium">{d.name}</td>
                    <td className="py-4 px-6 font-mono text-xs">{d.code}</td>
                    <td className="py-4 px-6">
                      {d.parent_id ? depts.find(x => x.id === d.parent_id)?.name : 'None (Top Level)'}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">{d.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="py-4 px-6 font-semibold">User</th>
                <th className="py-4 px-6 font-semibold">Email</th>
                <th className="py-4 px-6 font-semibold">Role</th>
                <th className="py-4 px-6 font-semibold">Department Assignment</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="py-4 px-6 font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {u.full_name.charAt(0)}
                    </div>
                    {u.full_name}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-muted-foreground">{u.email}</td>
                  <td className="py-4 px-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleUserRoleChange(u.id, e.target.value as UserRole)}
                      className="bg-background border border-border rounded px-2.5 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="executive">Executive</option>
                      <option value="esg_manager">ESG Manager</option>
                      <option value="dept_head">Dept Head</option>
                      <option value="employee">Employee</option>
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={u.department_id || ''}
                      onChange={(e) => handleUserDeptChange(u.id, e.target.value)}
                      className="bg-background border border-border rounded px-2.5 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'redemptions' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="font-bold text-sm">Employee Incentive Redemptions</h3>
            <p className="text-xs text-muted-foreground">Fulfill pending reward claims for physical items or gift vouchers.</p>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="py-4 px-6 font-semibold">Employee</th>
                <th className="py-4 px-6 font-semibold">Reward Name</th>
                <th className="py-4 px-6 font-semibold">Points Deducted</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">No redemptions tracked. Claims show up here.</td>
                </tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium">{r.employee?.full_name}</td>
                    <td className="py-4 px-6">{r.reward?.name}</td>
                    <td className="py-4 px-6 font-mono text-xs">{r.reward?.points_required} Points</td>
                    <td className="py-4 px-6 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        r.status === 'fulfilled' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleFulfill(r.id)}
                          className="text-xs bg-primary text-primary-foreground font-semibold px-2.5 py-1 rounded shadow-sm hover:bg-primary/95 transition-colors"
                        >
                          Fulfill Request
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DEPARTMENT ADD MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Add Department</h3>
            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QA"
                    value={newDept.code}
                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Employee Count</label>
                  <input
                    type="number"
                    min="1"
                    value={newDept.employee_count}
                    onChange={(e) => setNewDept({ ...newDept, employee_count: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Parent structural unit</label>
                <select
                  value={newDept.parent_id}
                  onChange={(e) => setNewDept({ ...newDept, parent_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  <option value="">None (Top Level)</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department Head</label>
                <select
                  value={newDept.head_id}
                  onChange={(e) => setNewDept({ ...newDept, head_id: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
