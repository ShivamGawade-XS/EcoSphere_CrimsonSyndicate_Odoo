import { useState, useMemo, useRef } from 'react'
import { dbService } from '@/lib/dbService'
import {
  formatCO2,
  formatDate,
} from '@/lib/utils'
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Users,
  Shield,
  Leaf,
  Trophy,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export function ReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  // Report Builder State
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [datePreset, setDatePreset] = useState('all')
  const [selectedModules, setSelectedModules] = useState<string[]>(['env', 'social', 'gov'])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  // AI Summary State
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Load Data
  const org = useMemo(() => dbService.getOrganization(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const profiles = useMemo(() => dbService.getProfiles(), [refreshKey])
  const categories = useMemo(() => dbService.getCategories(), [refreshKey])
  const transactions = useMemo(() => dbService.getCarbonTransactions(), [refreshKey])
  const participations = useMemo(() => dbService.getCSRParticipations(), [refreshKey])
  const issues = useMemo(() => dbService.getComplianceIssues(), [refreshKey])

  // PDF Ref
  const reportRef = useRef<HTMLDivElement>(null)

  // Filtered dataset
  const filteredData = useMemo(() => {
    // Filter Carbon Transactions
    let carbon = transactions
    if (selectedDepts.length > 0) {
      carbon = carbon.filter(tx => selectedDepts.includes(tx.department_id))
    }

    // Filter CSR participations
    let csr = participations
    if (selectedDepts.length > 0) {
      csr = csr.filter(p => p.employee?.department_id && selectedDepts.includes(p.employee.department_id))
    }
    if (employeeSearch.trim()) {
      csr = csr.filter(p => p.employee?.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
    }

    // Filter Compliance Issues
    let gov = issues
    if (selectedDepts.length > 0) {
      gov = gov.filter(i => i.department_id && selectedDepts.includes(i.department_id))
    }

    return {
      carbon,
      csr,
      gov
    }
  }, [selectedDepts, employeeSearch, transactions, participations, issues])

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Module,Identifier,Field 1,Field 2,Field 3,Date\n"

    if (selectedModules.includes('env')) {
      filteredData.carbon.forEach(tx => {
        csvContent += `Environmental,${tx.id},${tx.department?.name || 'Org'},${tx.source_type},${tx.calculated_emission_kg} kg,${tx.date}\n`
      })
    }
    if (selectedModules.includes('social')) {
      filteredData.csr.forEach(p => {
        csvContent += `Social,${p.id},${p.employee?.full_name},${p.activity?.title},${p.points_earned} Points,${p.created_at.split('T')[0]}\n`
      })
    }
    if (selectedModules.includes('gov')) {
      filteredData.gov.forEach(i => {
        csvContent += `Governance,${i.id},${i.title},${i.severity},${i.status},${i.created_at.split('T')[0]}\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "ecosphere_esg_custom_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Excel (Multi-Sheet via SheetJS)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    if (selectedModules.includes('env')) {
      const envData = filteredData.carbon.map(tx => ({
        Date: tx.date,
        Department: tx.department?.name || 'Company-Wide',
        Activity: tx.source_type,
        Quantity: tx.quantity,
        'Emissions (kg CO2e)': tx.calculated_emission_kg,
        Method: tx.auto_calculated ? 'Auto' : 'Manual',
      }))
      const wsEnv = XLSX.utils.json_to_sheet(envData)
      XLSX.utils.book_append_sheet(wb, wsEnv, "Environmental")
    }

    if (selectedModules.includes('social')) {
      const socialData = filteredData.csr.map(p => ({
        Date: p.created_at.split('T')[0],
        Employee: p.employee?.full_name,
        Activity: p.activity?.title,
        'Points Earned': p.points_earned,
        Status: p.approval_status,
      }))
      const wsSocial = XLSX.utils.json_to_sheet(socialData)
      XLSX.utils.book_append_sheet(wb, wsSocial, "Social")
    }

    if (selectedModules.includes('gov')) {
      const govData = filteredData.gov.map(i => ({
        Date: i.created_at.split('T')[0],
        Title: i.title,
        Severity: i.severity,
        Status: i.status,
        Owner: i.owner?.full_name,
        Due_Date: i.due_date,
      }))
      const wsGov = XLSX.utils.json_to_sheet(govData)
      XLSX.utils.book_append_sheet(wb, wsGov, "Governance")
    }

    XLSX.writeFile(wb, "ecosphere_esg_report.xlsx")
  }

  // Export PDF (jsPDF + html2canvas)
  const handleExportPDF = async () => {
    if (!reportRef.current) return
    const canvas = await html2canvas(reportRef.current, { scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save('ecosphere_esg_report.pdf')
  }

  // AI-Generated Executive Summary (calling Groq or fallback)
  const handleGenerateAISummary = async () => {
    setIsGeneratingSummary(true)
    const totalCarbon = filteredData.carbon.reduce((sum, tx) => sum + tx.calculated_emission_kg, 0)
    const activeCSR = filteredData.csr.filter(p => p.approval_status === 'approved').length
    const openGov = filteredData.gov.filter(i => i.status !== 'resolved').length

    const promptText = `
      Please generate a formal, corporate, executive ESG summary paragraph for GreenTech Manufacturing Pvt. Ltd.
      Metrics:
      - Carbon Emissions tracked: ${formatCO2(totalCarbon)}
      - Approved employee CSR participations: ${activeCSR}
      - Open compliance/governance issues: ${openGov}
      Deliver exactly 3-4 professional, insight-driven sentences summarizing their performance and pointing out any risk mitigation strategies.
    `

    const groqKey = import.meta.env.VITE_GROQ_API_KEY as string

    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are an ESG analyst. Write a concise executive summary paragraph based on the parameters provided. Respond with the summary directly. Do not add conversational intro/outro phrases.',
              },
              {
                role: 'user',
                content: promptText,
              },
            ],
          }),
        })
        const data = await res.json()
        const reply = data.choices?.[0]?.message?.content || 'Error generating summary.'
        setAiSummary(reply)
      } catch (err) {
        simulateAISummary(totalCarbon, activeCSR, openGov)
      } finally {
        setIsGeneratingSummary(false)
      }
    } else {
      setTimeout(() => {
        simulateAISummary(totalCarbon, activeCSR, openGov)
        setIsGeneratingSummary(false)
      }, 1500)
    }
  }

  const simulateAISummary = (totalCarbon: number, activeCSR: number, openGov: number) => {
    setAiSummary(
      `GreenTech Manufacturing Pvt. Ltd. shows moderate ESG index stabilization with total carbon footprint registered at ${formatCO2(totalCarbon)}. Employee mobilization is promising with ${activeCSR} approved CSR registrations. However, ${openGov} open compliance issues present regulatory and operational risks. Executive actions should prioritize plant efficiency audits and immediate resolution of discharge pH standards to mitigate penalties and elevate overall governance score.`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-primary w-7 h-7" />
            Decision Intelligence Reports
          </h2>
          <p className="text-muted-foreground text-sm">
            Generate compliant standard disclosure reports and build custom filters.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground border border-border hover:bg-muted rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Query/Filter Builder */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 h-fit">
          <h3 className="font-bold text-sm flex items-center gap-2 pb-3 border-b border-border">
            <Filter className="w-4 h-4 text-primary" /> Report Filters
          </h3>

          {/* Department Selector */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Departments</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {depts.map(d => (
                <label key={d.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(d.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDepts([...selectedDepts, d.id])
                      } else {
                        setSelectedDepts(selectedDepts.filter(id => id !== d.id))
                      }
                    }}
                    className="w-3.5 h-3.5 accent-primary rounded"
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </div>

          {/* Module Selector */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">ESG Modules</label>
            <div className="space-y-1.5">
              {[
                { id: 'env', label: 'Environmental' },
                { id: 'social', label: 'Social' },
                { id: 'gov', label: 'Governance' },
              ].map(m => (
                <label key={m.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedModules([...selectedModules, m.id])
                      } else {
                        setSelectedModules(selectedModules.filter(id => id !== m.id))
                      }
                    }}
                    className="w-3.5 h-3.5 accent-primary rounded"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* Employee Search */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Employee Search</label>
            <input
              type="text"
              placeholder="Search employee..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Right Col: Live Preview and Printable Report */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Executive Summary Block */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between h-fit bg-gradient-to-br from-primary/5 to-transparent">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="text-primary w-4.5 h-4.5" /> AI Executive Summary
                </h4>
                <button
                  onClick={handleGenerateAISummary}
                  disabled={isGeneratingSummary}
                  className="text-xs bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary/95 transition-all flex items-center gap-1.5"
                >
                  {isGeneratingSummary ? 'Analyzing...' : 'Generate Summary'}
                </button>
              </div>
              {aiSummary ? (
                <p className="text-xs text-muted-foreground leading-relaxed animate-fade-in">{aiSummary}</p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">Click Generate to analyze metrics using Groq AI Llama 3.3.</p>
              )}
            </div>
          </div>

          {/* Printable Report Preview */}
          <div ref={reportRef} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8 print:p-0 print:border-none">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-border/80 pb-6">
              <div>
                <h3 className="text-xl font-extrabold text-foreground">ESG PERFORMANCE DISCLOSURE REPORT</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{org.name}</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-muted-foreground">REPORT PERIOD: YTD 2026</p>
                <p className="text-[10px] text-muted-foreground">Generated: {formatDate(new Date())}</p>
              </div>
            </div>

            {/* Environmental section */}
            {selectedModules.includes('env') && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-1.5 text-emerald-600">
                  <Leaf className="w-4 h-4" /> Environmental Logs
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Date</th>
                        <th className="py-2.5 px-4 font-semibold">Dept</th>
                        <th className="py-2.5 px-4 font-semibold">Activity</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Calculated Emissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.carbon.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">No logs matching filters.</td>
                        </tr>
                      ) : (
                        filteredData.carbon.map(tx => (
                          <tr key={tx.id} className="border-b border-border hover:bg-muted/10">
                            <td className="py-2.5 px-4">{formatDate(tx.date)}</td>
                            <td className="py-2.5 px-4 font-medium">{tx.department?.name}</td>
                            <td className="py-2.5 px-4 capitalize">{tx.source_type}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{tx.calculated_emission_kg.toLocaleString()} kg CO₂e</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Social section */}
            {selectedModules.includes('social') && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-1.5 text-teal-600">
                  <Users className="w-4 h-4" /> Social & CSR Registrations
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Employee</th>
                        <th className="py-2.5 px-4 font-semibold">Activity</th>
                        <th className="py-2.5 px-4 font-semibold">Points Earned</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Approval Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.csr.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">No registrations matching filters.</td>
                        </tr>
                      ) : (
                        filteredData.csr.map(p => (
                          <tr key={p.id} className="border-b border-border hover:bg-muted/10">
                            <td className="py-2.5 px-4 font-medium">{p.employee?.full_name}</td>
                            <td className="py-2.5 px-4">{p.activity?.title}</td>
                            <td className="py-2.5 px-4 font-mono">{p.points_earned} Points</td>
                            <td className="py-2.5 px-4 text-right capitalize font-bold text-teal-600">{p.approval_status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Governance section */}
            {selectedModules.includes('gov') && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-1.5 text-amber-600">
                  <Shield className="w-4 h-4" /> Governance & Compliance Issues
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Issue</th>
                        <th className="py-2.5 px-4 font-semibold">Severity</th>
                        <th className="py-2.5 px-4 font-semibold">Due Date</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.gov.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-muted-foreground">No issues matching filters.</td>
                        </tr>
                      ) : (
                        filteredData.gov.map(i => (
                          <tr key={i.id} className="border-b border-border hover:bg-muted/10">
                            <td className="py-2.5 px-4 font-medium">{i.title}</td>
                            <td className="py-2.5 px-4 capitalize font-bold text-amber-600">{i.severity}</td>
                            <td className="py-2.5 px-4 font-mono">{formatDate(i.due_date)}</td>
                            <td className="py-2.5 px-4 text-right capitalize font-bold text-red-500">{i.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
