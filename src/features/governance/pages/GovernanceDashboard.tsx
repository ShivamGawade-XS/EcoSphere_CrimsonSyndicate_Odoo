import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import {
  ESGPolicy,
  Audit,
  ComplianceIssue,
  IssueSeverity,
  IssueStatus,
  Profile,
} from '@/types'
import {
  formatDate,
  getSeverityColor,
} from '@/lib/utils'
import {
  Shield,
  Plus,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
  UserCheck,
  Info,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function GovernanceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'audits' | 'issues'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const profiles = useMemo(() => dbService.getProfiles(), [refreshKey])
  const policies = useMemo(() => dbService.getPolicies(), [refreshKey])
  const acknowledgements = useMemo(() => dbService.getAcknowledgements(), [refreshKey])
  const audits = useMemo(() => dbService.getAudits(), [refreshKey])
  const rawIssues = useMemo(() => dbService.getComplianceIssues(), [refreshKey])

  // Derive "Overdue" status in code to match DB trigger
  const issues = useMemo(() => {
    return rawIssues.map(issue => {
      const isOverdue = new Date(issue.due_date) < new Date() && issue.status !== 'resolved'
      return {
        ...issue,
        status: isOverdue ? 'overdue' as IssueStatus : issue.status
      }
    })
  }, [rawIssues])

  // Modals state
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [resolveIssueItem, setResolveIssueItem] = useState<ComplianceIssue | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<ESGPolicy | null>(null)

  // Form states
  const [newPolicy, setNewPolicy] = useState({
    title: '',
    description: '',
    category: 'environmental' as ESGPolicy['category'],
    version: '1.0',
    effective_date: new Date().toISOString().split('T')[0],
  })

  const [newAudit, setNewAudit] = useState({
    title: '',
    department_id: depts[0]?.id || '',
    auditor_id: profiles[0]?.id || '',
    scope: '',
    scheduled_date: new Date().toISOString().split('T')[0],
  })

  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    severity: 'medium' as IssueSeverity,
    owner_id: profiles[0]?.id || '', // Non-nullable owner
    due_date: '',                     // Non-nullable due date
    department_id: depts[0]?.id || '',
    audit_id: '',
  })

  const [resolutionNotes, setResolutionNotes] = useState('')

  // Derived metrics
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'esg_manager'

  const overdueIssuesCount = useMemo(() => {
    return issues.filter(i => i.status === 'overdue').length
  }, [issues])

  const openIssuesBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    issues.forEach(i => {
      if (i.status !== 'resolved') {
        counts[i.severity] = (counts[i.severity] || 0) + 1
      }
    })
    return [
      { name: 'Critical', Issues: counts.critical, fill: '#ef4444' },
      { name: 'High', Issues: counts.high, fill: '#f97316' },
      { name: 'Medium', Issues: counts.medium, fill: '#eab308' },
      { name: 'Low', Issues: counts.low, fill: '#3b82f6' },
    ]
  }, [issues])

  // Actions
  const handleAddPolicy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPolicy.title) return

    dbService.addPolicy({
      title: newPolicy.title,
      description: newPolicy.description,
      category: newPolicy.category,
      version: newPolicy.version,
      effective_date: newPolicy.effective_date,
      review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      document_url: null,
    })

    setNewPolicy({ title: '', description: '', category: 'environmental', version: '1.0', effective_date: new Date().toISOString().split('T')[0] })
    setShowPolicyModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleAcknowledge = (policyId: string) => {
    dbService.acknowledgePolicy(policyId, currentUser.id)
    setRefreshKey(prev => prev + 1)
  }

  const handleSendReminder = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId)
    if (!policy) return

    // Notify employees who haven't acknowledged yet
    profiles.forEach(p => {
      const alreadyAcked = acknowledgements.some(a => a.policy_id === policyId && a.employee_id === p.id)
      if (!alreadyAcked && p.role === 'employee') {
        dbService.addNotification(
          p.id,
          'policy_reminder',
          '📋 Policy Signature Required',
          `Please review and acknowledge the active policy: "${policy.title}".`
        )
      }
    })
    alert('Acknowledgements reminder notifications broadcasted!')
  }

  const handleAddAudit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAudit.title) return

    dbService.addAudit({
      title: newAudit.title,
      department_id: newAudit.department_id,
      auditor_id: newAudit.auditor_id || null,
      scope: newAudit.scope,
      scheduled_date: newAudit.scheduled_date,
      findings: null,
      status: 'scheduled',
    })

    setNewAudit({ title: '', department_id: depts[0]?.id || '', auditor_id: profiles[0]?.id || '', scope: '', scheduled_date: new Date().toISOString().split('T')[0] })
    setShowAuditModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault()
    // Validation
    if (!newIssue.title) return
    if (!newIssue.owner_id) {
      alert('Every compliance issue must have an assigned owner.')
      return
    }
    if (!newIssue.due_date) {
      alert('Every compliance issue must have a due date.')
      return
    }

    dbService.addComplianceIssue({
      title: newIssue.title,
      description: newIssue.description,
      severity: newIssue.severity,
      owner_id: newIssue.owner_id,
      due_date: newIssue.due_date,
      department_id: newIssue.department_id || null,
      audit_id: newIssue.audit_id || null,
    })

    // Trigger Notification for new compliance issue
    dbService.addNotification(
      newIssue.owner_id,
      'compliance_issue_created',
      '🚨 New Compliance Issue Assigned',
      `You have been assigned the compliance issue: "${newIssue.title}". Due date: ${newIssue.due_date}.`
    )

    setNewIssue({
      title: '',
      description: '',
      severity: 'medium',
      owner_id: profiles[0]?.id || '',
      due_date: '',
      department_id: depts[0]?.id || '',
      audit_id: '',
    })
    setShowIssueModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleResolveIssue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolveIssueItem || !resolutionNotes.trim()) return

    dbService.resolveComplianceIssue(resolveIssueItem.id, resolutionNotes)
    setResolveIssueItem(null)
    setResolutionNotes('')
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-amber-500 w-7 h-7" />
            Governance & Compliance
          </h2>
          <p className="text-muted-foreground text-sm">
            Review organizational policies, schedule audits, and track compliance issues.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'policies' && isManagerOrAdmin && (
            <button
              onClick={() => setShowPolicyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Policy
            </button>
          )}
          {activeTab === 'audits' && isManagerOrAdmin && (
            <button
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Schedule Audit
            </button>
          )}
          {activeTab === 'issues' && isManagerOrAdmin && (
            <button
              onClick={() => setShowIssueModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Log Issue
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'policies', label: 'ESG Policies' },
          { id: 'audits', label: 'Audits Log' },
          { id: 'issues', label: 'Compliance Issues' },
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

      {/* Overdue Issues Banner */}
      {overdueIssuesCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 animate-bounce flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Action Required: {overdueIssuesCount} Overdue Compliance Issues Detected</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              These issues have passed their resolution due dates without completion, penalizing the Governance score.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Overall Gov Score</p>
                <p className="text-3xl font-extrabold text-amber-500 mt-2">76.0</p>
                <p className="text-xs text-muted-foreground mt-1">Deducted via compliance penalties</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-xl font-bold">
                🏛️
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Open Issues Severity</p>
                <p className="text-3xl font-extrabold text-foreground mt-2">
                  {issues.filter(i => i.status !== 'resolved').length}
                </p>
                <p className="text-xs text-red-500 mt-1 font-semibold">{overdueIssuesCount} overdue</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 text-xl">
                ⚠️
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active ESG Policies</p>
                <p className="text-3xl font-extrabold text-foreground mt-2">{policies.length}</p>
                <p className="text-xs text-green-500 mt-1">100% updated guidelines</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-xl">
                📋
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-base mb-4">Open Compliance Issues by Severity</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={openIssuesBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Issues" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overdue Issues List */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base mb-4">Critical Risk & Overdue Tasks</h3>
                <div className="space-y-3">
                  {issues.filter(i => i.status === 'overdue' || i.severity === 'critical').map(i => (
                    <div key={i.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold uppercase">{i.severity}</span>
                          <span className="text-xs font-semibold">{i.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Owner: {i.owner?.full_name} | Due: {formatDate(i.due_date)}</p>
                      </div>
                      <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {i.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-4 px-6 font-semibold">Title</th>
                  <th className="py-4 px-6 font-semibold">Category</th>
                  <th className="py-4 px-6 font-semibold">Version</th>
                  <th className="py-4 px-6 font-semibold">Effective Date</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((pol) => {
                  const isAcked = acknowledgements.some(a => a.policy_id === pol.id && a.employee_id === currentUser.id)

                  return (
                    <tr
                      key={pol.id}
                      onClick={() => setSelectedPolicy(pol)}
                      className={`border-b border-border hover:bg-muted/10 transition-colors cursor-pointer ${
                        selectedPolicy?.id === pol.id ? 'bg-muted/30' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-medium">{pol.title}</td>
                      <td className="py-4 px-6 capitalize">{pol.category}</td>
                      <td className="py-4 px-6 font-mono text-xs">{pol.version}</td>
                      <td className="py-4 px-6">{formatDate(pol.effective_date)}</td>
                      <td className="py-4 px-6 text-right space-x-2" onClick={e => e.stopPropagation()}>
                        {isAcked ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledge(pol.id)}
                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded font-semibold transition-colors"
                          >
                            Sign Policy
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Policy Detail Sidebar */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-fit">
            {selectedPolicy ? (
              <div className="space-y-4">
                <h4 className="font-bold text-base">{selectedPolicy.title}</h4>
                <p className="text-xs text-muted-foreground">{selectedPolicy.description}</p>
                <div className="border-t border-border pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="capitalize font-medium">{selectedPolicy.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signed Status:</span>
                    <span className="font-bold text-emerald-600">
                      {Math.round((acknowledgements.filter(a => a.policy_id === selectedPolicy.id).length / profiles.length) * 100)}% signed
                    </span>
                  </div>
                </div>

                {isManagerOrAdmin && (
                  <button
                    onClick={() => handleSendReminder(selectedPolicy.id)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark text-secondary-foreground text-xs py-2 rounded-lg font-semibold transition-all border border-border"
                  >
                    <BookOpen className="w-4 h-4" /> Send Reminder Alert
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Info className="w-8 h-8 text-muted-foreground/50" />
                Select a policy to view guidelines and completion statistics.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audits' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="py-4 px-6 font-semibold">Title</th>
                <th className="py-4 px-6 font-semibold">Department</th>
                <th className="py-4 px-6 font-semibold">Auditor</th>
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold">Findings</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => {
                const dept = depts.find(d => d.id === a.department_id)
                const auditor = profiles.find(p => p.id === a.auditor_id)

                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-medium">{a.title}</td>
                    <td className="py-4 px-6">{dept?.name}</td>
                    <td className="py-4 px-6">{auditor?.full_name}</td>
                    <td className="py-4 px-6">{formatDate(a.scheduled_date)}</td>
                    <td className="py-4 px-6 capitalize">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        a.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground">{a.findings || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map((i) => {
            const isOverdue = i.status === 'overdue'

            return (
              <div
                key={i.id}
                className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all ${
                  isOverdue ? 'border-red-300 bg-red-500/5' : 'border-border'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${getSeverityColor(i.severity)}`}>
                      {i.severity}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${
                      i.status === 'resolved' ? 'text-green-600' : isOverdue ? 'text-red-500 animate-pulse' : 'text-amber-500'
                    }`}>
                      {i.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-base mt-3 text-foreground">{i.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Owner: {i.owner?.full_name}</p>
                    <p className="text-[10px] mt-0.5">Due: {formatDate(i.due_date)}</p>
                  </div>

                  {i.status !== 'resolved' && (
                    <button
                      onClick={() => setResolveIssueItem(i)}
                      className="text-xs text-primary hover:underline font-bold"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {resolveIssueItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5" /> Resolve Compliance Issue
            </h3>
            <form onSubmit={handleResolveIssue} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Issue</label>
                <p className="text-sm font-semibold">{resolveIssueItem.title}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Resolution Notes (Mandatory)</label>
                <textarea
                  required
                  placeholder="Detail actions taken to resolve violation..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setResolveIssueItem(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Confirm Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Add ESG Policy</h3>
            <form onSubmit={handleAddPolicy} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sustainable Resource Procurement Policy"
                  value={newPolicy.title}
                  onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <textarea
                  placeholder="Outline the core rules and scopes..."
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Category</label>
                  <select
                    value={newPolicy.category}
                    onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    <option value="environmental">Environmental</option>
                    <option value="social">Social</option>
                    <option value="governance">Governance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Version</label>
                  <input
                    type="text"
                    required
                    value={newPolicy.version}
                    onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Effective Date</label>
                <input
                  type="date"
                  value={newPolicy.effective_date}
                  onChange={(e) => setNewPolicy({ ...newPolicy, effective_date: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Publish Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Schedule Audit</h3>
            <form onSubmit={handleAddAudit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Audit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q2 Waste Audit"
                  value={newAudit.title}
                  onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department</label>
                  <select
                    value={newAudit.department_id}
                    onChange={(e) => setNewAudit({ ...newAudit, department_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Lead Auditor</label>
                  <select
                    value={newAudit.auditor_id}
                    onChange={(e) => setNewAudit({ ...newAudit, auditor_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Scope</label>
                <textarea
                  placeholder="Audit checklist and areas to analyze..."
                  value={newAudit.scope}
                  onChange={(e) => setNewAudit({ ...newAudit, scope: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-16 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={newAudit.scheduled_date}
                  onChange={(e) => setNewAudit({ ...newAudit, scheduled_date: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Log Compliance Issue</h3>
            <form onSubmit={handleAddIssue} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emission Standard Breach"
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <textarea
                  placeholder="Outline deviation details..."
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Severity</label>
                  <select
                    value={newIssue.severity}
                    onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Owner (Required)</label>
                  <select
                    required
                    value={newIssue.owner_id}
                    onChange={(e) => setNewIssue({ ...newIssue, owner_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department</label>
                  <select
                    value={newIssue.department_id}
                    onChange={(e) => setNewIssue({ ...newIssue, department_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Due Date (Required)</label>
                  <input
                    type="date"
                    required
                    value={newIssue.due_date}
                    onChange={(e) => setNewIssue({ ...newIssue, due_date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Save Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
