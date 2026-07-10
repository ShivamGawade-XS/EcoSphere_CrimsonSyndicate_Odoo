import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import {
  CSRActivity,
  EmployeeParticipation,
  Profile,
} from '@/types'
import {
  formatDate,
} from '@/lib/utils'
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  Calendar,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
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

export function SocialDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'csr' | 'diversity' | 'training'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const categories = useMemo(() => dbService.getCategories().filter(c => c.type === 'csr_activity'), [refreshKey])
  const activities = useMemo(() => dbService.getCSRActivities(), [refreshKey])
  const participations = useMemo(() => dbService.getCSRParticipations(), [refreshKey])

  // Modals state
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState<EmployeeParticipation | null>(null)
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false)

  // Form states
  const [newAct, setNewAct] = useState({
    title: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    points_reward: 100,
    description: '',
    max_participants: 20,
    department_id: '',
  })

  // Mock Training Data (since no SQL table was needed, we store in LocalStorage or local state)
  const [trainings, setTrainings] = useState<any[]>([
    { id: 'tr-1', employeeName: 'Arjun Verma', departmentName: 'Manufacturing & Operations', courseName: 'Safety & Hazard Protocols', date: '2026-06-10' },
    { id: 'tr-2', employeeName: 'Neha Sen', departmentName: 'Logistics & Supply Chain', courseName: 'Sustainable Packaging Guide', date: '2026-06-18' },
  ])

  const [newTraining, setNewTraining] = useState({
    employeeName: '',
    departmentName: depts[0]?.name || '',
    courseName: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Mock Diversity Metrics
  const [diversityData, setDiversityData] = useState<any[]>([
    { department: 'Manufacturing', Male: 60, Female: 35, Other: 5 },
    { department: 'Logistics', Male: 55, Female: 40, Other: 5 },
    { department: 'R&D', Male: 40, Female: 55, Other: 5 },
    { department: 'HR', Male: 25, Female: 75, Other: 0 },
  ])

  const [newDiversity, setNewDiversity] = useState({
    department: depts[0]?.name || '',
    male: 50,
    female: 50,
    other: 0,
  })

  // CSV status
  const [csvStatus, setCsvStatus] = useState('')

  // Derived metrics
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'esg_manager'

  const overallParticipationRate = useMemo(() => {
    if (depts.length === 0) return 0
    const totalEmployees = depts.reduce((sum, d) => sum + d.employee_count, 0)
    const distinctParticipants = new Set(participations.filter(p => p.approval_status === 'approved').map(p => p.employee_id)).size
    return Math.round((distinctParticipants / totalEmployees) * 100)
  }, [depts, participations])

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAct.title || newAct.points_reward <= 0) return

    dbService.addCSRActivity({
      title: newAct.title,
      category_id: newAct.category_id || null,
      date: newAct.date,
      points_reward: Number(newAct.points_reward),
      description: newAct.description,
      max_participants: newAct.max_participants ? Number(newAct.max_participants) : null,
      department_id: newAct.department_id || null,
    })

    setNewAct({
      title: '',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
      points_reward: 100,
      description: '',
      max_participants: 20,
      department_id: '',
    })
    setShowActivityModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleJoinActivity = (activityId: string) => {
    dbService.joinCSRActivity(activityId, currentUser.id)
    setRefreshKey(prev => prev + 1)
  }

  const handleApproveParticipation = (id: string, approve: boolean, proofUrl: string | null) => {
    try {
      dbService.approveCSRParticipation(id, approve, proofUrl)
      setShowApproveModal(null)
      setRefreshKey(prev => prev + 1)
    } catch (err: any) {
      alert(err.message || 'Approval failed')
    }
  }

  const handleAddTraining = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTraining.employeeName || !newTraining.courseName) return

    const newT = {
      id: `tr-${Date.now()}`,
      employeeName: newTraining.employeeName,
      departmentName: newTraining.departmentName,
      courseName: newTraining.courseName,
      date: newTraining.date,
    }
    setTrainings(prev => [...prev, newT])
    setShowAddTrainingModal(false)
    setNewTraining({ employeeName: '', departmentName: depts[0]?.name || '', courseName: '', date: new Date().toISOString().split('T')[0] })
  }

  const handleDiversitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updated = diversityData.map(d => {
      if (d.department === newDiversity.department) {
        return {
          department: d.department,
          Male: Number(newDiversity.male),
          Female: Number(newDiversity.female),
          Other: Number(newDiversity.other),
        }
      }
      return d
    })
    setDiversityData(updated)
    alert('Diversity metrics updated successfully!')
  }

  const handleTrainingCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        let imported = 0
        const newItems: any[] = []

        // Parse: Employee Name, Department, Course Name, Date
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const [name, deptName, course, date] = line.split(',')
          if (name && deptName && course && date) {
            newItems.push({
              id: `tr-csv-${Date.now()}-${i}`,
              employeeName: name.replace(/"/g, '').trim(),
              departmentName: deptName.replace(/"/g, '').trim(),
              courseName: course.replace(/"/g, '').trim(),
              date: date.replace(/"/g, '').trim(),
            })
            imported++
          }
        }

        setTrainings(prev => [...prev, ...newItems])
        setCsvStatus(`Successfully imported ${imported} training records!`)
        setTimeout(() => setCsvStatus(''), 5000)
      } catch (err) {
        setCsvStatus('Error parsing CSV file.')
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
            <Users className="text-teal-500 w-7 h-7" />
            Social & Community Engagement
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage CSR initiatives, track workforce diversity, and log compliance training.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'csr' && isManagerOrAdmin && (
            <button
              onClick={() => setShowActivityModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Activity
            </button>
          )}
          {activeTab === 'training' && (
            <label className="flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-sm font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Import CSV
              <input type="file" accept=".csv" onChange={handleTrainingCSVImport} className="hidden" />
            </label>
          )}
          {activeTab === 'training' && (
            <button
              onClick={() => setShowAddTrainingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Log Training
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'csr', label: 'CSR Activities & approvals' },
          { id: 'diversity', label: 'Diversity Metrics' },
          { id: 'training', label: 'Training Tracker' },
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

      {csvStatus && (
        <div className="bg-teal-500/10 border border-teal-500/20 text-teal-500 p-3 rounded-lg text-sm">
          {csvStatus}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Card Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">CSR Participation Rate</p>
                <p className="text-3xl font-extrabold text-teal-600 mt-2">{overallParticipationRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Target Rate: 60%</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-500 text-xl font-bold">
                🎯
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">CSR Activities Logged</p>
                <p className="text-3xl font-extrabold text-foreground mt-2">{activities.length}</p>
                <p className="text-xs text-green-500 mt-1">All initiatives active/scheduled</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-xl">
                🌟
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Training Completions</p>
                <p className="text-3xl font-extrabold text-foreground mt-2">{trainings.length}</p>
                <p className="text-xs text-muted-foreground mt-1">94% target compliance rate</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 text-xl">
                🎓
              </div>
            </div>
          </div>

          {/* Diversity Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4">Workforce Diversity Breakdown by Department (%)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diversityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Male" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Female" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Other" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'csr' && (
        <div className="space-y-6">
          {/* CSR Activities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.map((act) => {
              const joined = participations.some(p => p.activity_id === act.id && p.employee_id === currentUser.id)
              const status = participations.find(p => p.activity_id === act.id && p.employee_id === currentUser.id)?.approval_status

              return (
                <div key={act.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-semibold">
                        {categories.find(c => c.id === act.category_id)?.name || 'CSR Activity'}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(act.date)}
                      </span>
                    </div>

                    <h4 className="font-bold text-lg text-foreground mt-3">{act.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1.5">{act.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm font-bold text-teal-600 flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {act.points_reward} Points / XP
                    </span>

                    {joined ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        status === 'approved' ? 'bg-green-50 text-green-700' :
                        status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Joined (Pending Approval)'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinActivity(act.id)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        Join Activity
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Manage Pending Registrations Panel */}
          {isManagerOrAdmin && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mt-8">
              <div className="p-5 border-b border-border bg-muted/20">
                <h3 className="font-bold text-base">Fulfillment & Approvals Pane</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approve and verify employee CSR participation proofs.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-6 font-semibold">Employee</th>
                      <th className="py-3 px-6 font-semibold">Activity</th>
                      <th className="py-3 px-6 font-semibold">Status</th>
                      <th className="py-3 px-6 font-semibold">Proof Upload</th>
                      <th className="py-3 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">
                          No participations logged yet. Join activities above.
                        </td>
                      </tr>
                    ) : (
                      participations.map((part) => (
                        <tr key={part.id} className="border-b border-border hover:bg-muted/10">
                          <td className="py-3.5 px-6 font-medium">{part.employee?.full_name}</td>
                          <td className="py-3.5 px-6">{part.activity?.title}</td>
                          <td className="py-3.5 px-6 capitalize">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              part.approval_status === 'approved' ? 'bg-green-50 text-green-700' :
                              part.approval_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {part.approval_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-muted-foreground">
                            {part.proof_url ? (
                              <a href={part.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold">
                                <FileText className="w-3.5 h-3.5" /> View Proof
                              </a>
                            ) : (
                              <span>No File Attached</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-2">
                            {part.approval_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    // Simulated proof attachment dialog
                                    const proof = prompt('Simulate Proof Document URL attachment (required if setting is ON):', 'https://supabase.storage/proof_doc.pdf')
                                    handleApproveParticipation(part.id, true, proof)
                                  }}
                                  className="text-green-600 hover:text-green-800 font-semibold text-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApproveParticipation(part.id, false, null)}
                                  className="text-red-500 hover:text-red-700 font-semibold text-xs"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'diversity' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-md">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Layers className="text-teal-500 w-4 h-4" />
            Update Department Diversity Metric
          </h3>
          <form onSubmit={handleDiversitySubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department</label>
              <select
                value={newDiversity.department}
                onChange={(e) => setNewDiversity({ ...newDiversity, department: e.target.value })}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
              >
                {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Male %</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={newDiversity.male}
                  onChange={(e) => setNewDiversity({ ...newDiversity, male: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Female %</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={newDiversity.female}
                  onChange={(e) => setNewDiversity({ ...newDiversity, female: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Other %</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={newDiversity.other}
                  onChange={(e) => setNewDiversity({ ...newDiversity, other: Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold text-sm hover:bg-primary/95 transition-all">
              Save Metrics
            </button>
          </form>
        </div>
      )}

      {activeTab === 'training' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="py-4 px-6 font-semibold">Employee</th>
                <th className="py-4 px-6 font-semibold">Department</th>
                <th className="py-4 px-6 font-semibold">Course Name</th>
                <th className="py-4 px-6 font-semibold">Completion Date</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => (
                <tr key={t.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="py-4 px-6 font-medium">{t.employeeName}</td>
                  <td className="py-4 px-6 text-muted-foreground">{t.departmentName}</td>
                  <td className="py-4 px-6 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t.courseName}</span>
                  </td>
                  <td className="py-4 px-6 text-xs">{formatDate(t.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <GraduationCap className="text-teal-500 w-5 h-5" /> Log Course Completion
            </h3>
            <form onSubmit={handleAddTraining} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun Verma"
                  value={newTraining.employeeName}
                  onChange={(e) => setNewTraining({ ...newTraining, employeeName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Department</label>
                <select
                  value={newTraining.departmentName}
                  onChange={(e) => setNewTraining({ ...newTraining, departmentName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                >
                  {depts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Occupational Safety & Health"
                  value={newTraining.courseName}
                  onChange={(e) => setNewTraining({ ...newTraining, courseName: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newTraining.date}
                  onChange={(e) => setNewTraining({ ...newTraining, date: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTrainingModal(false)}
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

      {/* Add CSR Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="text-teal-500 w-5 h-5" /> Launch CSR Activity
            </h3>
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Activity Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Energy Seminar"
                  value={newAct.title}
                  onChange={(e) => setNewAct({ ...newAct, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Category</label>
                  <select
                    value={newAct.category_id}
                    onChange={(e) => setNewAct({ ...newAct, category_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Points / XP Reward</label>
                  <input
                    type="number"
                    min="1"
                    value={newAct.points_reward}
                    onChange={(e) => setNewAct({ ...newAct, points_reward: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Max Participants</label>
                  <input
                    type="number"
                    min="1"
                    value={newAct.max_participants}
                    onChange={(e) => setNewAct({ ...newAct, max_participants: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newAct.date}
                    onChange={(e) => setNewAct({ ...newAct, date: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label>
                <textarea
                  value={newAct.description}
                  onChange={(e) => setNewAct({ ...newAct, description: e.target.value })}
                  placeholder="Outline details, timing, and requirements..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Publish Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
