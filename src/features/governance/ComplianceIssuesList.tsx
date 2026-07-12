import { useState } from 'react'
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery'
import { InfiniteList } from '@/components/shared/InfiniteList'
import { formatDate } from '@/lib/utils'
import { ComplianceIssue } from '@/types'
import { dbService } from '@/lib/dbService'

interface ComplianceIssuesListProps {
  orgId:                string
  setResolveIssueItem:  (issue: ComplianceIssue) => void
  onRefresh:            () => void
  getSeverityColor:     (sev: string) => string
  refreshTrigger?:      number
}

export function ComplianceIssuesList({
  orgId,
  setResolveIssueItem,
  onRefresh,
  getSeverityColor,
  refreshTrigger = 0,
}: ComplianceIssuesListProps) {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  // Build query filters object
  const filters: Record<string, any> = { org_id: orgId }
  if (severityFilter !== 'all') {
    filters.severity = severityFilter
  }

  // Use paginated query hook to load compliance issues
  const {
    data: rawItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    isLoading,
  } = usePaginatedQuery<ComplianceIssue>({
    queryKey:  ['compliance_issues_paginated', search, String(refreshTrigger)],
    tableName: 'compliance_issues',
    filters,
    orderBy:   { column: 'due_date', ascending: true },
    pageSize:  6,
  })

  // Apply client-side search text filtering
  const items = rawItems.filter((i) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      i.title.toLowerCase().includes(term) ||
      (i.description && i.description.toLowerCase().includes(term))
    );
  })

  const renderIssueCard = (i: ComplianceIssue, index: number) => {
    const isOverdue = i.status === 'overdue'

    return (
      <div
        key={i.id || index}
        className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all hover:border-white/10 ${
          isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-border'
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase select-none ${getSeverityColor(i.severity)}`}>
              {i.severity}
            </span>
            <span className={`text-[10px] font-bold uppercase select-none ${
              i.status === 'resolved' ? 'text-green-400' : isOverdue ? 'text-red-400 animate-pulse' : 'text-amber-400'
            }`}>
              {i.status}
            </span>
          </div>

          <h4 className="font-bold text-base mt-3 text-foreground">{i.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{i.description || 'No description provided.'}</p>
        </div>

        <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Owner: {i.owner?.full_name || 'Unassigned'}</p>
            <p className="text-[10px] mt-0.5">Due: {formatDate(i.due_date)}</p>
          </div>

          {i.status !== 'resolved' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResolveIssueItem(i)}
                className="text-xs text-primary hover:underline font-bold"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete this compliance issue?')) {
                    dbService.deleteComplianceIssue(i.id)
                    onRefresh()
                  }
                }}
                className="text-xs text-red-400 hover:underline font-bold ml-2"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSkeleton = () => (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-4 bg-white/10 rounded w-1/4" />
        <div className="h-4 bg-white/10 rounded w-1/4" />
      </div>
      <div className="h-6 bg-white/10 rounded w-2/3" />
      <div className="h-10 bg-white/10 rounded w-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search issues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground hover:text-foreground transition-colors"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <InfiniteList<ComplianceIssue>
        items={items}
        renderItem={renderIssueCard}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        totalCount={totalCount}
        isLoading={isLoading}
        renderSkeleton={renderSkeleton}
        emptyMessage="No compliance issues found matching filters."
        autoLoad={true}
      />
    </div>
  )
}
