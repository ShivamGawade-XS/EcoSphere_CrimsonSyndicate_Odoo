import { usePaginatedQuery } from '@/hooks/usePaginatedQuery'
import { InfiniteList } from '@/components/shared/InfiniteList'
import { formatDate } from '@/lib/utils'
import { Audit, Department, Profile } from '@/types'

interface AuditFindingsListProps {
  orgId:           string
  depts:           Department[]
  profiles:        Profile[]
  refreshTrigger?: number
}

export function AuditFindingsList({
  orgId,
  depts,
  profiles,
  refreshTrigger = 0,
}: AuditFindingsListProps) {
  // Use paginated query hook to load audits
  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    isLoading,
  } = usePaginatedQuery<Audit>({
    queryKey:  ['audits_paginated', String(refreshTrigger)],
    tableName: 'audits',
    filters:   { org_id: orgId },
    orderBy:   { column: 'scheduled_date', ascending: false },
    pageSize:  10,
  })

  const renderAuditCard = (audit: Audit, index: number) => {
    const dept = depts.find((d) => d.id === audit.department_id)
    const auditor = profiles.find((p) => p.id === audit.auditor_id)

    return (
      <div
        key={audit.id || index}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border bg-card rounded-2xl hover:border-white/10 hover:bg-muted/5 transition-all gap-4 shadow-sm"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-medium">
            <span>{formatDate(audit.scheduled_date)}</span>
            <span>&middot;</span>
            <span>Auditor: {auditor?.full_name || 'Unassigned'}</span>
          </div>

          <h4 className="font-bold text-base mt-1.5 text-foreground">{audit.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">Department: {dept?.name || 'Company-Wide'}</p>
        </div>

        <div className="flex items-center gap-6 justify-between sm:justify-end shrink-0 select-none">
          <div className="text-right">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
              audit.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {audit.status}
            </span>
          </div>

          <div className="text-right min-w-[70px]">
            <p className="text-sm font-bold text-foreground">{audit.findings || '-'}</p>
            <p className="text-[10px] text-muted-foreground">Findings Count</p>
          </div>
        </div>
      </div>
    )
  }

  const renderSkeleton = () => (
    <div className="flex items-center justify-between p-5 border border-border bg-card/60 rounded-2xl animate-pulse">
      <div className="space-y-2 flex-1">
        <div className="h-3.5 bg-white/10 rounded w-1/4" />
        <div className="h-4.5 bg-white/10 rounded w-1/2" />
      </div>
      <div className="w-20 h-7 bg-white/10 rounded-full" />
    </div>
  )

  return (
    <InfiniteList<Audit>
      items={items}
      renderItem={renderAuditCard}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      totalCount={totalCount}
      isLoading={isLoading}
      renderSkeleton={renderSkeleton}
      emptyMessage="No ESG audit findings found."
      autoLoad={true}
    />
  )
}
