import { useState, useMemo, useEffect } from 'react'
import { dbService } from '@/lib/dbService'
import {
  CSRActivity,
  EmployeeParticipation,
  Profile,
  TrainingRecord,
  Badge,
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
  BookOpen,
  FileQuestion,
  Printer,
  Check,
  Trophy,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'csr' | 'diversity' | 'training' | 'academy'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const categories = useMemo(() => dbService.getCategories().filter(c => c.type === 'csr_activity'), [refreshKey])
  const activities = useMemo(() => dbService.getCSRActivities(), [refreshKey])
  const participations = useMemo(() => dbService.getCSRParticipations(), [refreshKey])
  const dbTrainings = useMemo(() => dbService.getTrainingRecords(), [refreshKey])

  // Combine static fallback mock data with DB persisted training records
  const trainings = useMemo(() => {
    const defaults = [
      { id: 'tr-1', employeeName: 'Arjun Verma', departmentName: 'Manufacturing & Operations', courseName: 'Safety & Hazard Protocols', date: '2026-06-10' },
      { id: 'tr-2', employeeName: 'Neha Sen', departmentName: 'Logistics & Supply Chain', courseName: 'Sustainable Packaging Guide', date: '2026-06-18' },
    ]
    const dbFormatted = dbTrainings.map(t => ({
      id: t.id,
      employeeName: t.employee?.full_name || 'Unknown Employee',
      departmentName: t.department?.name || 'General Org',
      courseName: t.title,
      date: t.completion_date || t.created_at.split('T')[0]
    }))
    return [...defaults, ...dbFormatted]
  }, [dbTrainings])

  // Modals state
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState<EmployeeParticipation | null>(null)
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false)

  // ESG Academy state
  const [selectedAcademyModule, setSelectedAcademyModule] = useState<any | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState<any | null>(null)

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

  const [newTraining, setNewTraining] = useState({
    employeeName: '',
    departmentName: '',
    courseName: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Sync training department dropdown default once depts load
  useEffect(() => {
    if (depts.length > 0 && !newTraining.departmentName) {
      setNewTraining(prev => ({ ...prev, departmentName: depts[0].name }))
    }
  }, [depts, newTraining.departmentName])

  const [diversityData, setDiversityData] = useState<any[]>([])

  // Load and sync diversity data from dbService when refreshKey or depts change
  useEffect(() => {
    const data = dbService.getDiversityData()
    setDiversityData(data || [])
  }, [refreshKey])

  const [newDiversity, setNewDiversity] = useState({
    department: '',
    male: 50,
    female: 50,
    other: 0,
  })

  // Sync diversity department dropdown default once depts load
  useEffect(() => {
    if (depts.length > 0 && !newDiversity.department) {
      setNewDiversity(prev => ({ ...prev, department: depts[0].name }))
    }
  }, [depts, newDiversity.department])

  const [csvStatus, setCsvStatus] = useState('')
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'esg_manager'

  const overallParticipationRate = useMemo(() => {
    if (depts.length === 0) return 0
    const totalEmployees = depts.reduce((sum, d) => sum + d.employee_count, 0)
    const distinctParticipants = new Set(participations.filter(p => p.approval_status === 'approved' || p.approval_status === 'pending').map(p => p.employee_id)).size
    return Math.round((distinctParticipants / totalEmployees) * 100)
  }, [depts, participations])

  // ESG Academy Modules Data
  const academyModules = useMemo(() => [
    {
      id: 'mod-carbon',
      title: 'Carbon Accounting Basics',
      category: 'environmental',
      xpReward: 100,
      pointsReward: 50,
      duration: '15 mins',
      description: 'Understand direct and indirect carbon emissions (Scope 1, 2, and 3) and greenhouse gas protocols.',
      reading: `Greenhouse gas (GHG) emissions are categorized into three "scopes" to help organizations understand and measure their carbon footprint:
• Scope 1: Direct emissions from sources owned or controlled by the company (e.g. burning fuel in company vehicles, boilers, or manufacturing process emissions).
• Scope 2: Indirect emissions from the generation of purchased energy (e.g. electricity, steam, heating/cooling consumed by the company).
• Scope 3: All other indirect emissions that occur in the company's value chain, including both upstream and downstream activities (e.g. business travel, employee commuting, waste management, product logistics, raw materials).`,
      questions: [
        {
          q: 'Which scope covers direct emissions from burning fuel in company-owned delivery trucks?',
          options: ['Scope 1', 'Scope 2', 'Scope 3', 'Scope 4'],
          ansIndex: 0
        },
        {
          q: 'Under which scope do emissions from purchased electricity consumed in offices fall?',
          options: ['Scope 1', 'Scope 2', 'Scope 3', 'Scope 4'],
          ansIndex: 1
        },
        {
          q: 'Which of the following represents the baseline standard reference for Global Warming Potential (GWP)?',
          options: ['Carbon Dioxide (CO2)', 'Methane (CH4)', 'Nitrous Oxide (N2O)', 'Water Vapor'],
          ansIndex: 0
        }
      ]
    },
    {
      id: 'mod-diversity',
      title: 'Workforce Diversity & Inclusion',
      category: 'social',
      xpReward: 100,
      pointsReward: 50,
      duration: '10 mins',
      description: 'Learn the principles of diversity, equity, inclusion, and safety in modern corporate structures.',
      reading: `Social sustainability focuses on employee well-being, community impact, and fair labor practices:
• Diversity: Ensuring fair representation across genders, backgrounds, and ages within the organization.
• Equity: Providing equal opportunities, fair compensation, and non-discriminatory policies for career growth.
• Inclusion: Creating a safe, welcoming, and supportive workspace environment where all employees feel valued and heard.
• Safety: Adhering to rigorous occupational safety hazard protocols, employee health support, and preventative health practices.`,
      questions: [
        {
          q: 'What is the primary goal of corporate Diversity, Equity, and Inclusion (DEI) initiatives?',
          options: [
            'To build a fair, representative, and supportive workplace',
            'To reduce operational budgets and employee headcount',
            'To bypass local regulatory compliance checks',
            'To replace standard performance appraisal cycles'
          ],
          ansIndex: 0
        },
        {
          q: 'Which area of ESG does employee safety and wellness training directly fall under?',
          options: ['Environmental (E)', 'Social (S)', 'Governance (G)', 'Economic (Eco)'],
          ansIndex: 1
        }
      ]
    },
    {
      id: 'mod-governance',
      title: 'Corporate Ethics & Compliance',
      category: 'governance',
      xpReward: 100,
      pointsReward: 50,
      duration: '12 mins',
      description: 'Understand accountability, transparency, whistleblowing, and compliance structures.',
      reading: `Corporate Governance represents the rules, practices, and processes by which a firm is directed and controlled:
• Accountability: Clear responsibilities for executives, managers, and board members.
• Transparency: Fair and accurate disclosure of financial statements, operational impacts, and audit results.
• Ethical Standards: Guidelines preventing corruption, bribery, conflicts of interest, and anti-competitive practices.
• Whistleblowing: Establishing safe, secure, and confidential report channels for ethical violations.`,
      questions: [
        {
          q: 'Which of the following is a core pillar of corporate governance?',
          options: [
            'Accountability, transparency, and fairness',
            'Maximizing short-term stock performance at all costs',
            'Eliminating the need for independent external audits',
            'Restricting employee policy acknowledgement details'
          ],
          ansIndex: 0
        },
        {
          q: 'A whistleblowing policy is primarily designed to:',
          options: [
            'Provide a secure channel to report ethical violations safely',
            'Monitor employee keyboard strokes and activity logs',
            'Help marketing teams design brand campaigns',
            'Track scheduled compliance audit due dates'
          ],
          ansIndex: 0
        }
      ]
    }
  ], [])

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

    const usersList = dbService.getProfiles()
    const employee = usersList.find(u => u.full_name.toLowerCase() === newTraining.employeeName.toLowerCase())
    const employee_id = employee?.id || currentUser.id

    const dept = depts.find(d => d.name === newTraining.departmentName)
    const department_id = dept?.id || null

    dbService.addTrainingRecord({
      employee_id,
      department_id,
      title: newTraining.courseName,
      provider: 'Internal Training',
      category: 'esg_awareness',
      duration_hours: 2,
      completion_date: newTraining.date,
      status: 'completed',
      score: 100,
      certificate_url: null
    })

    setShowAddTrainingModal(false)
    setNewTraining({ employeeName: '', departmentName: '', courseName: '', date: new Date().toISOString().split('T')[0] })
    setRefreshKey(prev => prev + 1)
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
    dbService.updateDiversityData(updated)
    setRefreshKey(prev => prev + 1)
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
        const usersList = dbService.getProfiles()

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const [name, deptName, course, date] = line.split(',')
          if (name && deptName && course && date) {
            const employeeNameClean = name.replace(/"/g, '').trim()
            const deptNameClean = deptName.replace(/"/g, '').trim()
            const courseClean = course.replace(/"/g, '').trim()
            const dateClean = date.replace(/"/g, '').trim()

            const employee = usersList.find(u => u.full_name.toLowerCase() === employeeNameClean.toLowerCase())
            const employee_id = employee?.id || currentUser.id

            const dept = depts.find(d => d.name.toLowerCase() === deptNameClean.toLowerCase())
            const department_id = dept?.id || null

            dbService.addTrainingRecord({
              employee_id,
              department_id,
              title: courseClean,
              provider: 'CSV Bulk Upload',
              category: 'esg_awareness',
              duration_hours: 2,
              completion_date: dateClean,
              status: 'completed',
              score: 100,
              certificate_url: null
            })
            imported++
          }
        }

        setCsvStatus(`Successfully imported ${imported} training records!`)
        setTimeout(() => setCsvStatus(''), 5000)
        setRefreshKey(prev => prev + 1)
      } catch (err) {
        setCsvStatus('Error parsing CSV file.')
      }
    }
    reader.readAsText(file)
  }

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcademyModule) return

    let correct = 0
    selectedAcademyModule.questions.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.ansIndex) {
        correct++
      }
    })

    const passed = correct === selectedAcademyModule.questions.length
    setQuizPassed(passed)
    setQuizSubmitted(true)

    if (passed) {
      const alreadyDone = dbTrainings.some(t => t.title === selectedAcademyModule.title && t.employee_id === currentUser.id)
      if (!alreadyDone) {
        dbService.addTrainingRecord({
          employee_id: currentUser.id,
          department_id: currentUser.department_id,
          title: selectedAcademyModule.title,
          provider: 'EcoSphere ESG Academy',
          category: selectedAcademyModule.category === 'environmental' ? 'esg_awareness' :
                    selectedAcademyModule.category === 'social' ? 'safety' : 'compliance',
          duration_hours: 1,
          completion_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          score: 100,
          certificate_url: null
        })

        currentUser.total_points += selectedAcademyModule.pointsReward
        currentUser.total_xp += selectedAcademyModule.xpReward
        dbService.updateProfile(currentUser)

        dbService.addXPTransaction(
          currentUser.id,
          selectedAcademyModule.xpReward,
          'manual',
          null,
          `ESG Academy: Completed ${selectedAcademyModule.title}`
        )

        dbService.addNotification(
          currentUser.id,
          'badge_unlocked',
          '🎓 Module Completed!',
          `You earned ${selectedAcademyModule.xpReward} XP and ${selectedAcademyModule.pointsReward} Points for completing ${selectedAcademyModule.title}!`
        )

        // Auto scholar badge check
        const finalTrainings = dbService.getTrainingRecords().filter(t => t.employee_id === currentUser.id)
        const completedModuleTitles = academyModules.map(m => m.title)
        const allCompleted = completedModuleTitles.every(title => finalTrainings.some(t => t.title === title))

        if (allCompleted) {
          const scholarBadge = dbService.getBadges().find(b => b.name === 'ESG Scholar')
          if (scholarBadge) {
            dbService.awardBadge(scholarBadge.id, currentUser.id)
          }
        }

        setRefreshKey(prev => prev + 1)
      }
    }
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
          { id: 'academy', label: 'ESG Academy (Quizzes)' },
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

      {activeTab === 'academy' && (
        <div className="space-y-6">
          {!selectedAcademyModule ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {academyModules.map((module) => {
                const isCompleted = dbTrainings.some(
                  (t) => t.title === module.title && t.employee_id === currentUser.id
                )
                return (
                  <div
                    key={module.id}
                    className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          module.category === 'environmental' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          module.category === 'social' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {module.category.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{module.duration}</span>
                      </div>
                      <h4 className="font-bold text-lg group-hover:text-white transition-colors mb-2">{module.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{module.description}</p>
                    </div>
                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-medium text-foreground">+{module.xpReward} XP</span>
                      </div>
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowCertificateModal(module)}
                            className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" /> Certificate
                          </button>
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Completed
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAcademyModule(module)
                            setQuizAnswers({})
                            setQuizSubmitted(false)
                            setQuizPassed(false)
                          }}
                          className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg transition-colors"
                        >
                          Start Module
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Learning Content */}
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <BookOpen className="text-teal-400 w-5 h-5" /> Learning Material
                  </h3>
                  <button
                    onClick={() => setSelectedAcademyModule(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    &larr; Back to Modules
                  </button>
                </div>
                <h4 className="font-bold text-xl text-white">{selectedAcademyModule.title}</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  {selectedAcademyModule.reading}
                </div>
              </div>

              {/* Right Column: Quiz */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-bold text-lg flex items-center gap-2 pb-3 border-b border-border/50 mb-4">
                  <FileQuestion className="text-teal-400 w-5 h-5" /> Module Quiz
                </h3>

                {!quizSubmitted ? (
                  <form onSubmit={handleQuizSubmit} className="space-y-6">
                    {selectedAcademyModule.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {qIdx + 1}. {q.q}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt: string, oIdx: number) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                                quizAnswers[qIdx] === oIdx
                                  ? 'border-primary bg-primary/5 text-foreground'
                                  : 'border-border hover:bg-muted/30 text-muted-foreground'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${qIdx}`}
                                required
                                checked={quizAnswers[qIdx] === oIdx}
                                onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                className="accent-primary"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all text-sm"
                    >
                      Submit Answers
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4 animate-fade-in">
                    {quizPassed ? (
                      <>
                        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <Check className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-lg text-white">Module Passed! 100% Correct</h4>
                        <p className="text-xs text-muted-foreground">
                          Congratulations! You have completed the training course and earned rewards.
                        </p>
                        <div className="flex gap-3 justify-center text-xs">
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-md font-semibold">
                            +{selectedAcademyModule.xpReward} XP
                          </span>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md font-semibold">
                            +{selectedAcademyModule.pointsReward} Points
                          </span>
                        </div>
                        <div className="pt-4 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCertificateModal(selectedAcademyModule)}
                            className="w-full bg-teal-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-teal-600 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Award className="w-4 h-4" /> View Certificate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAcademyModule(null)
                              setQuizSubmitted(false)
                            }}
                            className="w-full border border-border py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                          >
                            Close Module
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <XCircle className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-lg text-white">Quiz Failed</h4>
                        <p className="text-xs text-muted-foreground">
                          You missed one or more questions. Review the study material on the left and try again!
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizSubmitted(false)
                            setQuizAnswers({})
                          }}
                          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold text-sm hover:bg-primary/95 transition-all"
                        >
                          Retry Quiz
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certificate Modal */}
          {showCertificateModal && (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCertificateModal(null)}>
              <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-8 relative flex flex-col justify-between overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowCertificateModal(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>

                {/* Print Frame Wrapper */}
                <div id="esg-certificate-frame" className="border-4 border-double border-teal-500/40 p-8 rounded-xl bg-white/5 space-y-6 text-center select-none">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-8 h-8 text-yellow-500 animate-pulse" />
                    <span className="text-xs uppercase tracking-widest text-teal-400 font-bold">EcoSphere ESG Academy</span>
                  </div>
                  <h2 className="text-3xl font-serif font-semibold text-white tracking-wide">Certificate of Completion</h2>
                  <p className="text-xs text-muted-foreground italic">This is proudly awarded to</p>
                  <h3 className="text-2xl font-bold text-teal-400 my-4 border-b border-white/10 pb-2 max-w-sm mx-auto">
                    {currentUser.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    for successfully demonstrating mastery and passing the evaluation for the training curriculum:
                  </p>
                  <h4 className="text-lg font-bold text-white uppercase tracking-wider">{showCertificateModal.title}</h4>
                  <div className="pt-6 grid grid-cols-2 gap-8 text-left max-w-md mx-auto text-xs text-muted-foreground border-t border-white/5">
                    <div>
                      <p>Institution: <span className="text-foreground font-medium">EcoSphere Org</span></p>
                      <p>Date: <span className="text-foreground font-medium">{new Date().toLocaleDateString()}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="italic font-serif">EcoSphere ESG Committee</p>
                      <p className="text-[10px] text-muted-foreground/60">Verification ID: ESG-ACAD-{Date.now().toString(36).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => window.print()}
                  className="mt-6 w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print Certificate
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Training Modal */}
      {showAddTrainingModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddTrainingModal(false)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowActivityModal(false)}>
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
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
