import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dbService } from '@/lib/dbService'
import { DataTablePaginated } from '@/components/shared/DataTablePaginated'
import { AuditFindingsList } from '../AuditFindingsList'
import { ComplianceIssuesList } from '../ComplianceIssuesList'
import {
  ESGPolicy,
  Audit,
  ComplianceIssue,
  IssueSeverity,
  IssueStatus,
  Profile,
  MaterialityTopic,
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
  Trash2,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'audits' | 'issues' | 'materiality'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  // Load Data
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const profiles = useMemo(() => dbService.getProfiles(), [refreshKey])
  const rawPolicies = useMemo(() => dbService.getPolicies(), [refreshKey])
  const acknowledgements = useMemo(() => dbService.getAcknowledgements(), [refreshKey])
  const audits = useMemo(() => dbService.getAudits(), [refreshKey])
  const rawIssues = useMemo(() => dbService.getComplianceIssues(), [refreshKey])

  // Sorting state for policies
  const [policySort, setPolicySort] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'effective_date',
    direction: 'desc',
  })

  // Sorted and paginated policies
  const sortedPolicies = useMemo(() => {
    const list = [...rawPolicies]
    const { column, direction } = policySort
    list.sort((a: any, b: any) => {
      const valA = a[column]
      const valB = b[column]

      if (valA === undefined || valB === undefined) return 0

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }

      return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
    return list
  }, [rawPolicies, policySort])

  const policyPage = Number(searchParams.get('page') || '1')
  const policyPageSize = Number(localStorage.getItem('ecosphere-global-page-size') || '25')

  const policies = useMemo(() => {
    const start = (policyPage - 1) * policyPageSize
    return sortedPolicies.slice(start, start + policyPageSize)
  }, [sortedPolicies, policyPage, policyPageSize])

  // Materiality Matrix State
  const materialityTopics = useMemo(() => dbService.getMaterialityTopics(), [refreshKey])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const selectedTopic = useMemo(() => materialityTopics.find(t => t.id === selectedTopicId) || null, [materialityTopics, selectedTopicId])
  const [showAddTopicModal, setShowAddTopicModal] = useState(false)
  const [newTopic, setNewTopic] = useState({
    name: '',
    category: 'environmental' as 'environmental' | 'social' | 'governance',
    stakeholderImpact: 3,
    businessImpact: 3,
    description: '',
  })

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

  // Issues search/filter state
  const [issueSearch, setIssueSearch] = useState('')
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<'all' | IssueSeverity>('all')

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchSearch = issueSearch.trim() === '' ||
        i.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
        i.description?.toLowerCase().includes(issueSearch.toLowerCase())
      const matchSeverity = issueSeverityFilter === 'all' || i.severity === issueSeverityFilter
      return matchSearch && matchSeverity
    })
  }, [issues, issueSearch, issueSeverityFilter])

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

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopic.name.trim()) return
    dbService.addMaterialityTopic({
      name: newTopic.name,
      category: newTopic.category,
      stakeholderImpact: Number(newTopic.stakeholderImpact),
      businessImpact: Number(newTopic.businessImpact),
      description: newTopic.description,
    })
    setNewTopic({ name: '', category: 'environmental', stakeholderImpact: 3, businessImpact: 3, description: '' })
    setShowAddTopicModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteTopic = (id: string) => {
    dbService.deleteMaterialityTopic(id)
    if (selectedTopicId === id) setSelectedTopicId(null)
    setRefreshKey(prev => prev + 1)
  }

  const handleUpdateTopicImpacts = (id: string, field: 'stakeholderImpact' | 'businessImpact', value: number) => {
    const all = dbService.getMaterialityTopics()
    const updated = all.map(t => t.id === id ? { ...t, [field]: value } : t)
    localStorage.setItem('ecosphere_materiality_topics', JSON.stringify(updated))
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
          {activeTab === 'materiality' && isManagerOrAdmin && (
            <button
              onClick={() => setShowAddTopicModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
          )}
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
          { id: 'materiality', label: 'Materiality Matrix' },
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
            <DataTablePaginated
              columns={[
                {
                  key: 'title',
                  header: 'Title',
                  sortable: true,
                  render: (pol) => (
                    <span
                      className={`font-medium cursor-pointer hover:text-primary transition-colors ${selectedPolicy?.id === pol.id ? 'text-primary' : ''}`}
                      onClick={() => setSelectedPolicy(pol)}
                    >
                      {pol.title}
                    </span>
                  )
                },
                { key: 'category', header: 'Category', sortable: true, render: (pol) => <span className="capitalize">{pol.category}</span> },
                { key: 'version', header: 'Version', sortable: false, render: (pol) => <span className="font-mono text-xs">{pol.version}</span> },
                { key: 'effective_date', header: 'Effective Date', sortable: true, render: (pol) => formatDate(pol.effective_date) },
                {
                  key: 'actions',
                  header: 'Actions',
                  sortable: false,
                  render: (pol) => {
                    const isAcked = acknowledgements.some(a => a.policy_id === pol.id && a.employee_id === currentUser.id)
                    return isAcked ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAcknowledge(pol.id) }}
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded font-semibold transition-colors"
                      >
                        Sign Policy
                      </button>
                    )
                  }
                }
              ]}
              data={policies}
              totalCount={rawPolicies.length}
              currentSort={policySort}
              onSortChange={(col, dir) => setPolicySort({ column: col, direction: dir })}
            />
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

                {/* Pending acknowledgements */}
                {(() => {
                  const ackedIds = new Set(acknowledgements.filter(a => a.policy_id === selectedPolicy.id).map(a => a.employee_id))
                  const pending = profiles.filter(p => !ackedIds.has(p.id))
                  return pending.length > 0 ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        Pending Acknowledgement ({pending.length})
                      </p>
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {pending.map(p => (
                          <li key={p.id} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {p.full_name.charAt(0)}
                            </span>
                            <span className="text-foreground font-medium truncate">{p.full_name}</span>
                            <span className="text-muted-foreground/60 ml-auto shrink-0">{p.department_id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-border pt-4 text-xs text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All employees have acknowledged this policy
                    </div>
                  )
                })()}
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
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <AuditFindingsList
            orgId={org.id}
            depts={depts}
            profiles={profiles}
            refreshTrigger={refreshKey}
          />
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <ComplianceIssuesList
            orgId={org.id}
            setResolveIssueItem={setResolveIssueItem}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
            getSeverityColor={getSeverityColor}
            refreshTrigger={refreshKey}
          />
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {resolveIssueItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResolveIssueItem(null)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPolicyModal(false)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAuditModal(false)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowIssueModal(false)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
      {/* ── Materiality Matrix Tab ── */}
      {activeTab === 'materiality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Scatter Grid */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="font-bold text-base">Double Materiality Matrix</h3>
                <p className="text-xs text-muted-foreground">
                  Identify and prioritize issues based on their importance to stakeholders and business success.
                </p>
              </div>

              {/* Matrix Board */}
              <div className="relative border-l-2 border-b-2 border-foreground/30 w-full h-[400px] mt-4 mb-8 bg-muted/10 rounded-tr-xl">
                {/* Grid Gridlines */}
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 pointer-events-none opacity-20">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border border-foreground/20" />
                  ))}
                </div>

                {/* Y-Axis Label */}
                <div className="absolute -left-12 top-1/2 -rotate-90 origin-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Importance to Stakeholders
                </div>

                {/* X-Axis Label */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Significance of Business Impact
                </div>

                {/* Grid Zones */}
                <div className="absolute right-2 top-2 bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                  Critical Priority
                </div>
                <div className="absolute left-2 bottom-2 bg-blue-500/10 border border-blue-500/20 text-blue-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                  Low Priority
                </div>

                {/* Topics Dots */}
                {materialityTopics.map((t) => {
                  const bottomPct = ((t.stakeholderImpact - 1) / 4) * 80 + 10 // scale 1-5 to 10%-90%
                  const leftPct = ((t.businessImpact - 1) / 4) * 80 + 10
                  const isSelected = selectedTopic?.id === t.id
                  const categoryColors = {
                    environmental: 'bg-emerald-500 border-emerald-600 shadow-emerald-500/30',
                    social: 'bg-blue-500 border-blue-600 shadow-blue-500/30',
                    governance: 'bg-amber-500 border-amber-600 shadow-amber-500/30',
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopicId(t.id)}
                      style={{ bottom: `${bottomPct}%`, left: `${leftPct}%` }}
                      className={`absolute w-6 h-6 rounded-full border-2 shadow-lg -translate-x-1/2 translate-y-1/2 flex items-center justify-center text-[10px] text-white font-extrabold transition-all duration-300 transform hover:scale-125 ${
                        isSelected ? 'scale-125 ring-4 ring-primary/30 z-10' : 'z-0'
                      } ${categoryColors[t.category]}`}
                      title={t.name}
                    >
                      {t.category[0].toUpperCase()}
                    </button>
                  )
                })}
              </div>

              {/* Legend & Categories */}
              <div className="flex gap-4 text-xs font-semibold mt-auto justify-center border-t border-border pt-4">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Environmental</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Social</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Governance</span>
              </div>
            </div>

            {/* Sidebar info */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              {selectedTopic ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="font-bold text-lg">{selectedTopic.name}</h4>
                    <button
                      onClick={() => handleDeleteTopic(selectedTopic.id)}
                      className="text-muted-foreground hover:text-red-500 text-xs flex items-center gap-1 border border-border rounded px-2 py-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Pillar</span>
                    <p className={`text-sm font-semibold capitalize mt-1 ${
                      selectedTopic.category === 'environmental' ? 'text-emerald-600' :
                      selectedTopic.category === 'social' ? 'text-blue-600' :
                      'text-amber-600'
                    }`}>{selectedTopic.category}</p>
                  </div>

                  {/* Interactive sliders to adjust impacts live */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Stakeholder Impact</span>
                        <span className="text-lg font-extrabold text-foreground">{selectedTopic.stakeholderImpact}<span className="text-xs text-muted-foreground font-normal"> / 5</span></span>
                      </div>
                      <input
                        type="range" min="1" max="5" step="1"
                        value={selectedTopic.stakeholderImpact}
                        onChange={(e) => handleUpdateTopicImpacts(selectedTopic.id, 'stakeholderImpact', Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>Low</span><span>High</span></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Business Impact</span>
                        <span className="text-lg font-extrabold text-foreground">{selectedTopic.businessImpact}<span className="text-xs text-muted-foreground font-normal"> / 5</span></span>
                      </div>
                      <input
                        type="range" min="1" max="5" step="1"
                        value={selectedTopic.businessImpact}
                        onChange={(e) => handleUpdateTopicImpacts(selectedTopic.id, 'businessImpact', Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>Low</span><span>High</span></div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Assessment Note</span>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{selectedTopic.description || 'No detailed assessment provided for this topic yet.'}</p>
                  </div>

                  <div className="bg-muted/30 border border-border p-4 rounded-xl">
                    <h5 className="text-xs font-bold uppercase tracking-wider mb-2">Priority Tier</h5>
                    {selectedTopic.businessImpact * selectedTopic.stakeholderImpact >= 16 ? (
                      <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                        <AlertCircle className="w-4 h-4" /> Critical Focus Area
                      </div>
                    ) : selectedTopic.businessImpact * selectedTopic.stakeholderImpact >= 9 ? (
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                        <Info className="w-4 h-4" /> Material Target
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Monitor / Informational
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Score: {selectedTopic.businessImpact * selectedTopic.stakeholderImpact} / 25 — drag sliders above to reposition the bubble live.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-sm">No Topic Selected</p>
                  <p className="text-xs mt-1 max-w-[200px]">Click any circular dot on the matrix grid to inspect assessment details and priority ratings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Materiality Topic Modal */}
      {showAddTopicModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddTopicModal(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-bold text-lg">Add Materiality Matrix Topic</h3>
              <button onClick={() => setShowAddTopicModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Topic Name *</label>
                <input
                  type="text"
                  required
                  value={newTopic.name}
                  onChange={e => setNewTopic(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Waste & Circular Economy"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">ESG Pillar</label>
                <select
                  value={newTopic.category}
                  onChange={e => setNewTopic(p => ({ ...p, category: e.target.value as any }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="environmental">Environmental</option>
                  <option value="social">Social</option>
                  <option value="governance">Governance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Stakeholder Impact (1-5)</label>
                  <input
                    type="number" min={1} max={5}
                    value={newTopic.stakeholderImpact}
                    onChange={e => setNewTopic(p => ({ ...p, stakeholderImpact: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Business Impact (1-5)</label>
                  <input
                    type="number" min={1} max={5}
                    value={newTopic.businessImpact}
                    onChange={e => setNewTopic(p => ({ ...p, businessImpact: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description / Notes</label>
                <textarea
                  value={newTopic.description}
                  onChange={e => setNewTopic(p => ({ ...p, description: e.target.value }))}
                  placeholder="Justification for the priority level..."
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddTopicModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95">
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

