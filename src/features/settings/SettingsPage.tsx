import { useState, useMemo } from 'react'
import { dbService, initializeLocalDatabase } from '@/lib/dbService'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
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
  Database,
  Key,
  Webhook,
  Activity,
  FileText,
  Lock,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'org' | 'toggles' | 'depts' | 'users' | 'redemptions' | 'billing' | 'integrations' | 'audit'>('org')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const users = useMemo(() => dbService.getProfiles(), [refreshKey])
  const redemptions = useMemo(() => dbService.getRedemptions(), [refreshKey])
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])

  // SaaS Enterprise Data
  const sso = useMemo(() => dbService.getSSOConfig(), [refreshKey])
  const webhooks = useMemo(() => dbService.getWebhooks(), [refreshKey])
  const apiTokens = useMemo(() => dbService.getApiTokens(), [refreshKey])
  const auditLogs = useMemo(() => dbService.getAuditLogs(), [refreshKey])

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
  const [orgProfile, setOrgProfile] = useState({ name: '', notify_email_admin: '', logo_url: '' })
  const [orgProfileSaved, setOrgProfileSaved] = useState(false)

  // Integrations states
  const [ssoForm, setSsoForm] = useState(() => ({
    enabled: sso?.enabled ?? false,
    idpUrl: sso?.idpUrl ?? '',
    issuerId: sso?.issuerId ?? '',
    certificate: sso?.certificate ?? '',
  }))

  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    event: 'issues.created' as 'issues.created' | 'goals.updated'
  })

  const [tokenForm, setTokenForm] = useState({
    name: '',
    scope: 'read:emissions' as 'read:emissions' | 'write:emissions' | 'read:goals'
  })

  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const { success, error: toastError } = useToast()

  // Sync orgProfile from org on mount/refresh
  const syncedOrgProfile = useMemo(() => ({
    name: org.name,
    notify_email_admin: org.notify_email_admin || '',
    logo_url: org.logo_url || '',
  }), [org, refreshKey])

  const handleSaveOrgProfile = () => {
    dbService.updateOrganization({
      name: orgProfile.name || syncedOrgProfile.name,
      notify_email_admin: orgProfile.notify_email_admin || syncedOrgProfile.notify_email_admin,
      logo_url: orgProfile.logo_url || syncedOrgProfile.logo_url,
    })
    setOrgProfileSaved(true)
    setRefreshKey(prev => prev + 1)
    setTimeout(() => setOrgProfileSaved(false), 2500)
    success('Organization profile saved', 'Changes will take effect immediately.')
  }

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
    success('Redemption fulfilled', 'The reward has been marked as delivered.')
  }

  // SAML SSO configuration
  const handleSaveSSO = (e: React.FormEvent) => {
    e.preventDefault()
    dbService.updateSSOConfig(ssoForm)
    dbService.addAuditLog(currentUser.full_name, `Modified SAML SSO parameters (Enabled: ${ssoForm.enabled ? 'Yes' : 'No'})`, '192.168.1.144')
    setRefreshKey(prev => prev + 1)
    success('SSO configuration saved', 'SAML SSO settings have been updated.')
  }

  // Webhooks
  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) return
    dbService.addWebhook({
      name: webhookForm.name,
      url: webhookForm.url,
      events: [webhookForm.event],
      active: true
    })
    dbService.addAuditLog(currentUser.full_name, `Registered new webhook receiver: ${webhookForm.name}`, '192.168.1.144')
    setWebhookForm({ name: '', url: '', event: 'issues.created' })
    setRefreshKey(prev => prev + 1)
    success('Webhook registered', `"${webhookForm.name}" is now active.`)
  }

  const handleDeleteWebhook = (id: string, name: string) => {
    dbService.deleteWebhook(id)
    dbService.addAuditLog(currentUser.full_name, `Deleted webhook endpoint: ${name}`, '192.168.1.144')
    setRefreshKey(prev => prev + 1)
  }

  const handleTestWebhook = (name: string) => {
    dbService.addAuditLog(currentUser.full_name, `Triggered webhook test payload to: ${name}`, '192.168.1.144')
    success('Test payload sent', `Webhook "${name}" responded: 200 OK`)
    setRefreshKey(prev => prev + 1)
  }

  // API Tokens
  const handleCreateApiToken = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenForm.name.trim()) return
    const randomHex = Math.random().toString(16).substring(2, 12)
    const token = `eco_live_${randomHex}`
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 1)
    
    dbService.addApiToken({
      name: tokenForm.name,
      token,
      scopes: [tokenForm.scope],
      expires_at: expiry.toISOString()
    })
    dbService.addAuditLog(currentUser.full_name, `Generated new API Access Token: ${tokenForm.name}`, '192.168.1.144')
    setTokenForm({ name: '', scope: 'read:emissions' })
    setRefreshKey(prev => prev + 1)
    success('API token generated', 'Copy it now — it will not be shown again.')
  }

  const handleDeleteApiToken = (id: string, name: string) => {
    dbService.deleteApiToken(id)
    dbService.addAuditLog(currentUser.full_name, `Revoked API Access Token: ${name}`, '192.168.1.144')
    setRefreshKey(prev => prev + 1)
  }

  const handleCopyToken = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTokenId(id)
    setTimeout(() => setCopiedTokenId(null), 2000)
  }



  // Factory reset database
  const handleResetDatabase = () => {
    if (confirm('Are you sure you want to perform a factory reset? This will clear all transactions, custom suppliers, audit logs, and restore default seed datasets.')) {
      initializeLocalDatabase(true)
      dbService.addAuditLog('System Factory', 'Performed local database hard reset', '127.0.0.1')
      setRefreshKey(prev => prev + 1)
      window.location.reload()
    }
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
          { id: 'depts', label: 'Departments' },
          { id: 'users', label: 'Users' },
          { id: 'billing', label: 'Billing & Quotas' },
          { id: 'integrations', label: 'Integrations & API' },
          { id: 'audit', label: 'Audit Logs' },
          { id: 'redemptions', label: 'Redemptions' },
          { id: 'toggles', label: 'Feature Toggles' },
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

          {/* Organization Profile Edit */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Organization Profile
            </h3>
            <p className="text-xs text-muted-foreground">Update your organization's display name, admin contact, and logo.</p>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Organization Name</label>
              <input
                type="text"
                placeholder={syncedOrgProfile.name}
                value={orgProfile.name}
                onChange={e => setOrgProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Admin Email</label>
              <input
                type="email"
                placeholder={syncedOrgProfile.notify_email_admin || 'admin@example.com'}
                value={orgProfile.notify_email_admin}
                onChange={e => setOrgProfile(p => ({ ...p, notify_email_admin: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Logo URL</label>
              <input
                type="url"
                placeholder="https://your-logo-url.png"
                value={orgProfile.logo_url}
                onChange={e => setOrgProfile(p => ({ ...p, logo_url: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleSaveOrgProfile}
              className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {orgProfileSaved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : 'Save Organization Profile'}
            </button>

            {/* System Diagnostics (compact) */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-red-600 flex items-center gap-1.5 mb-2">
                <RefreshCw className="w-3.5 h-3.5" /> System Diagnostics
              </h4>
              <p className="text-xs text-muted-foreground mb-3">Reset sandbox database to default seed data.</p>
              <div className="pt-2">
              <button
                onClick={() => {
                  if (window.confirm('Reset sandbox local database back to seed defaults? All custom changes will be lost.')) {
                    initializeLocalDatabase(true)
                    localStorage.removeItem('ecosphere_suppliers')
                    localStorage.removeItem('ecosphere_materiality_topics')
                    window.location.reload()
                  }
                }}
                className="w-full px-4 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin-hover" />
                Reset Sandbox Database
              </button>
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

      {activeTab === 'billing' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Usage meters cards */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-bold text-sm">Carbon Transactions Quota</h4>
                </div>
                <p className="text-2xl font-extrabold text-foreground mt-2">{dbService.getCarbonTransactions().length} <span className="text-xs text-muted-foreground font-normal">/ 1,000 logs</span></p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(dbService.getCarbonTransactions().length / 1000) * 100}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">Enterprise tier includes high volume API pipelines.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h4 className="font-bold text-sm">Active User Seat Quota</h4>
                </div>
                <p className="text-2xl font-extrabold text-foreground mt-2">{users.length} <span className="text-xs text-muted-foreground font-normal">/ 250 seats</span></p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(users.length / 250) * 100}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">Add or edit users in the Users tab of setup.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-sm">Supplier Scorecard Quota</h4>
                </div>
                <p className="text-2xl font-extrabold text-foreground mt-2">{dbService.getSuppliers().length} <span className="text-xs text-muted-foreground font-normal">/ 50 suppliers</span></p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(dbService.getSuppliers().length / 50) * 100}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">Calculates custom Scope 3 supplier ratings.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Billing Contact & Invoicing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase block">Billing Administrator</span>
                  <p className="text-sm font-medium mt-0.5">{org.notify_email_admin || 'admin@greentech.demo'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase block">SaaS License Reference</span>
                  <p className="text-sm font-mono mt-0.5">lic_esg_gt_0982df9a2</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase block">SaaS Subscription Status</span>
                  <p className="text-sm font-semibold text-emerald-500 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active (Enterprise Plan)
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase block">Auto-Renew Date</span>
                  <p className="text-sm font-medium mt-0.5">June 15, 2027</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-fade-in">

          {/* Top row: AI Copilot + Theme */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Copilot Setup Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Key className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AI Copilot Proxy Status</h3>
                  <p className="text-[10px] text-muted-foreground">Powered by Supabase Edge Functions & Groq</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Secure Edge Proxy Active</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal mt-2">
                  All Groq API calls are proxied securely server-side. To update your Groq API key, set it as a Supabase secret:
                </p>
                <div className="p-3 bg-muted border border-border rounded-xl font-mono text-[10px] text-foreground select-all mt-1">
                  supabase secrets set GROQ_API_KEY=gsk_your_key_here
                </div>
              </div>
            </div>

            {/* Theme Switcher */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Appearance & Theme</h3>
                  <p className="text-[10px] text-muted-foreground">Control the interface color scheme globally</p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Color Theme</label>
                <ThemeToggle />
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-semibold">System</span> follows your OS preference automatically.
                  Theme is persisted across sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom: SSO, Webhooks, API tokens grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SAML SSO Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-500" /> Single Sign-On (SAML 2.0)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure corporate identity provider logins for seamless enterprise employee onboarding.
              </p>
              <form onSubmit={handleSaveSSO} className="space-y-3 mt-4">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-bold uppercase text-foreground">Enable SSO Bypass</span>
                  <input
                    type="checkbox"
                    checked={ssoForm.enabled}
                    onChange={(e) => setSsoForm({ ...ssoForm, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">IdP Entrypoint URL</label>
                  <input
                    type="url"
                    value={ssoForm.idpUrl}
                    onChange={(e) => setSsoForm({ ...ssoForm, idpUrl: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                    placeholder="https://sso.okta.com/app/ex..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">SP Issuer Audience ID</label>
                  <input
                    type="text"
                    value={ssoForm.issuerId}
                    onChange={(e) => setSsoForm({ ...ssoForm, issuerId: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">X.509 Certificate Token</label>
                  <textarea
                    value={ssoForm.certificate}
                    onChange={(e) => setSsoForm({ ...ssoForm, certificate: e.target.value })}
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs font-mono"
                  />
                </div>
                <button type="submit" className="w-full bg-teal-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-teal-700 transition-colors">
                  Save Provider Settings
                </button>
              </form>
            </div>
          </div>

          {/* Webhook panel */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-500" /> Outgoing Webhooks
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Receive real-time JSON event alerts to external endpoint receivers on compliance issues.
              </p>
              
              <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
                {webhooks.map((w: any) => (
                  <div key={w.id} className="p-3 border border-border bg-muted/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate max-w-[150px]">{w.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => handleTestWebhook(w.name)} className="text-[10px] text-primary font-bold hover:underline">Test</button>
                        <span className="text-muted-foreground">·</span>
                        <button type="button" onClick={() => handleDeleteWebhook(w.id, w.name)} className="text-[10px] text-red-500 font-bold hover:underline">Delete</button>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{w.url}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {w.events.map((ev: string) => (
                        <span key={ev} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-[9px] text-indigo-400 font-medium font-mono">{ev}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {webhooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No webhooks configured.</p>}
              </div>
            </div>

            <form onSubmit={handleAddWebhook} className="space-y-3 pt-4 border-t border-border mt-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Webhook Name</label>
                <input
                  type="text" required placeholder="Slack alerts"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Endpoint URL</label>
                <input
                  type="url" required placeholder="https://api.mycompany.com/webhook"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Trigger Event</label>
                <select
                  value={webhookForm.event}
                  onChange={(e) => setWebhookForm({ ...webhookForm, event: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                >
                  <option value="issues.created">Compliance Issue Logged (issues.created)</option>
                  <option value="goals.updated">ESG Goal Target Progress (goals.updated)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Register Webhook Endpoint
              </button>
            </form>
          </div>

          {/* API Access Tokens Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" /> API Access Tokens
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Access tokens for headless backend service script uploads or greenhouse gas tracking integrations.
              </p>

              <div className="space-y-2 mt-4 max-h-[160px] overflow-y-auto pr-1">
                {apiTokens.map((t: any) => (
                  <div key={t.id} className="p-3 border border-border bg-muted/20 rounded-xl space-y-1.5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{t.name}</span>
                      <button type="button" onClick={() => handleDeleteApiToken(t.id, t.name)} className="text-[10px] text-red-500 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Revoke</button>
                    </div>
                    <div className="flex items-center justify-between bg-background border border-border rounded p-1.5 font-mono text-[10px]">
                      <span className="truncate max-w-[140px] text-muted-foreground">{t.token}</span>
                      <button type="button" onClick={() => handleCopyToken(t.id, t.token)} className="text-primary hover:underline text-[9px] font-bold shrink-0">
                        {copiedTokenId === t.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Expires: {new Date(t.expires_at).toLocaleDateString()}</span>
                      <span className="capitalize font-mono text-amber-500 font-medium">Scope: {t.scopes[0]}</span>
                    </div>
                  </div>
                ))}
                {apiTokens.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No API tokens generated.</p>}
              </div>
            </div>

            <form onSubmit={handleCreateApiToken} className="space-y-3 pt-4 border-t border-border mt-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Token Name / Client ID</label>
                <input
                  type="text" required placeholder="Vite sync service"
                  value={tokenForm.name}
                  onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Access Scope</label>
                <select
                  value={tokenForm.scope}
                  onChange={(e) => setTokenForm({ ...tokenForm, scope: e.target.value as any })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs"
                >
                  <option value="read:emissions">Read Emissions Logs (read:emissions)</option>
                  <option value="write:emissions">Write Emissions Logs (write:emissions)</option>
                  <option value="read:goals">Read Environmental Targets (read:goals)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-amber-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-amber-700 transition-colors">
                Generate Live Token Key
              </button>
            </form>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Corporate Security Audit Logs</h3>
                <p className="text-xs text-muted-foreground">Immutable track record of setup mutations and tenant workspace actions.</p>
              </div>
              <button onClick={handleResetDatabase} className="text-xs bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                System Hard Reset
              </button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-4 px-6 font-semibold">Timestamp</th>
                  <th className="py-4 px-6 font-semibold">Username</th>
                  <th className="py-4 px-6 font-semibold">Action Event Details</th>
                  <th className="py-4 px-6 font-semibold font-mono">Client IP</th>
                  <th className="py-4 px-6 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-6 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-4 px-6 font-medium text-xs">{log.username}</td>
                    <td className="py-4 px-6 text-xs">{log.action}</td>
                    <td className="py-4 px-6 font-mono text-[10px] text-muted-foreground">{log.ipAddress}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold font-mono uppercase tracking-wider">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
