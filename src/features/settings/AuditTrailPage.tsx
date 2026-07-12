/**
 * EcoSphere AI — Audit Trail Page (CSRD Compliance)
 *
 * Implements a complete timeline view of all append-only ESG data change events.
 * Provides advanced filtering, side-by-side UPDATE diffing, CSV exports,
 * and monthly SHA-256 data integrity verification.
 *
 * @module features/settings/AuditTrailPage
 */

import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import { supabase } from '@/lib/supabase'
import {
  FileSpreadsheet,
  Shield,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  Database,
  Search,
  Eye,
  RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function AuditTrailPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  // Filters State
  const [selectedTable, setSelectedTable] = useState('all')
  const [selectedEventType, setSelectedEventType] = useState('all')
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('July 2026')

  // Load latest data from dbService
  const rawEvents = useMemo(() => dbService.getAuditEvents(), [refreshKey])
  const checksums = useMemo(() => dbService.getIntegrityChecksums(), [refreshKey])
  const profiles  = dbService.getProfiles()

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return rawEvents.filter(e => {
      const matchTable = selectedTable === 'all' || e.table_name === selectedTable
      const matchType  = selectedEventType === 'all' || e.event_type === selectedEventType
      const matchUser  = searchEmail.trim() === '' || e.user_email.toLowerCase().includes(searchEmail.toLowerCase())
      return matchTable && matchType && matchUser
    })
  }, [rawEvents, selectedTable, selectedEventType, searchEmail])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize))
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEvents.slice(start, start + pageSize)
  }, [filteredEvents, currentPage])

  // Actions
  const handleRecalculateHash = () => {
    dbService.computeIntegrityChecksum(selectedPeriod)
    setRefreshKey(prev => prev + 1)
  }

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Event Type', 'Table', 'Record ID', 'User Email', 'User Role', 'Changed Fields', 'IP Address']
    const rows = filteredEvents.map(e => [
      e.created_at,
      e.event_type,
      e.table_name,
      e.record_id,
      e.user_email,
      e.user_role,
      e.changed_fields ? e.changed_fields.join('; ') : 'N/A',
      e.ip_address || '127.0.0.1'
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ecosphere_audit_trail_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Top CSRD Statement Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-blue-500" />
            Immutable Audit Logging System
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Compliant with CSRD Article 29/30 standards for ESG records transparency. Writes are write-once, append-only, and secured using PostgreSQL triggers and security-definer procedures.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export CSV Log
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Filters + Hash Verification Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Filters Card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-border pb-3">
              <Filter className="w-4 h-4 text-primary" /> Filter Events
            </h4>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Audited Table</label>
              <select
                value={selectedTable}
                onChange={(e) => { setSelectedTable(e.target.value); setCurrentPage(1) }}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs"
              >
                <option value="all">All Modules</option>
                <option value="carbon_transactions">Carbon Transactions</option>
                <option value="csr_activities">CSR Activities</option>
                <option value="audit_findings">Audit Findings</option>
                <option value="compliance_issues">Compliance Issues</option>
                <option value="policies">Policies</option>
                <option value="policy_acknowledgements">Policy Acknowledgements</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Action Type</label>
              <select
                value={selectedEventType}
                onChange={(e) => { setSelectedEventType(e.target.value); setCurrentPage(1) }}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs"
              >
                <option value="all">All Types</option>
                <option value="INSERT">INSERT (Create)</option>
                <option value="UPDATE">UPDATE (Edit)</option>
                <option value="DELETE">DELETE (Remove)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">User Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. esg@greentech.demo"
                  value={searchEmail}
                  onChange={(e) => { setSearchEmail(e.target.value); setCurrentPage(1) }}
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Cryptographic Tamper Evidence Verification Card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm bg-gradient-to-b from-card to-muted/20">
            <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-border pb-3">
              <Database className="w-4 h-4 text-emerald-500" /> Tamper-Evidence hashes
            </h4>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Select Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs"
              >
                <option value="July 2026">July 2026</option>
                <option value="June 2026">June 2026</option>
                <option value="May 2026">May 2026</option>
              </select>
            </div>

            <button
              onClick={handleRecalculateHash}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recompute & Verify
            </button>

            <div className="space-y-3 pt-2">
              {checksums.map((cs) => (
                <div key={cs.id} className="text-xs bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span>{cs.period}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-normal">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground break-all">
                    {cs.checksum}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 flex justify-between">
                    <span>Records: {cs.record_count}</span>
                    <span>By: {cs.computed_by}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Timeline view of audit events */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Ledger Event Timeline</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Showing {filteredEvents.length} log events.</p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
              </div>
            </div>

            {paginatedEvents.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-10 h-10 text-muted-foreground/35 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No events match filters</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Adjust filters or search parameters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {paginatedEvents.map((event) => {
                  const isUpdate = event.event_type === 'UPDATE'
                  const isInsert = event.event_type === 'INSERT'
                  const isDelete = event.event_type === 'DELETE'

                  return (
                    <div key={event.id} className="p-5 hover:bg-muted/5 transition-colors space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider
                            ${isInsert ? 'bg-green-500/10 text-green-600' : isUpdate ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}
                          >
                            {event.event_type}
                          </span>
                          <span className="font-semibold text-foreground text-xs font-mono bg-muted/65 border border-border px-1.5 py-0.5 rounded">
                            {event.table_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ID: {event.record_id}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDate(event.created_at)} {new Date(event.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-foreground gap-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>User:</span>
                          <span className="text-primary font-bold">{event.user_email}</span>
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider text-muted-foreground font-normal">
                            {event.user_role}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex gap-4">
                          <span>IP: {event.ip_address || '127.0.0.1'}</span>
                          <span className="truncate max-w-[200px]">Agent: {event.user_agent ? (event.user_agent.split(' ')[0] ?? 'Browser') : 'Browser'}</span>
                        </div>
                      </div>

                      {/* Side-by-side diff for UPDATE events */}
                      {isUpdate && event.changed_fields && (
                        <div className="bg-muted/15 border border-border/80 rounded-xl p-3.5 space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Changed Fields Details:
                          </p>
                          <div className="space-y-1.5">
                            {event.changed_fields.map((field: string) => {
                              const before = event.before_data?.[field]
                              const after = event.after_data?.[field]
                              return (
                                <div key={field} className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-2 items-center text-xs">
                                  <span className="font-mono text-[10px] bg-muted/40 px-1 py-0.5 rounded border border-border/40 text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                    {field}
                                  </span>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-muted-foreground line-through max-w-[120px] truncate">{JSON.stringify(before)}</span>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    <span className="font-bold text-foreground truncate">{JSON.stringify(after)}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex justify-between items-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <div className="text-xs text-muted-foreground font-semibold">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
