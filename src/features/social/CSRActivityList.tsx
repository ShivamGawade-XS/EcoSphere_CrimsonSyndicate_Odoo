import { usePaginatedQuery } from '@/hooks/usePaginatedQuery'
import { InfiniteList } from '@/components/shared/InfiniteList'
import { formatDate } from '@/lib/utils'
import { CSRActivity, Category, EmployeeParticipation, Profile } from '@/types'
import { Calendar, Award } from 'lucide-react'

interface CSRActivityListProps {
  orgId:              string
  currentUser:        Profile
  categories:         Category[]
  participations:     EmployeeParticipation[]
  handleJoinActivity: (actId: string) => void
  refreshTrigger?:    number
}

export function CSRActivityList({
  orgId,
  currentUser,
  categories,
  participations,
  handleJoinActivity,
  refreshTrigger = 0,
}: CSRActivityListProps) {
  // Use paginated query hook to load CSR activities
  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    isLoading,
  } = usePaginatedQuery<CSRActivity>({
    queryKey:  ['csr_activities_paginated', String(refreshTrigger)],
    tableName: 'csr_activities',
    filters:   { org_id: orgId },
    orderBy:   { column: 'date', ascending: false },
    pageSize:  6,
  })

  const renderCSRCard = (act: CSRActivity, index: number) => {
    const joined = participations.some(p => p.activity_id === act.id && p.employee_id === currentUser.id)
    const status = participations.find(p => p.activity_id === act.id && p.employee_id === currentUser.id)?.approval_status

    return (
      <div key={act.id || index} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-white/10 transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-semibold">
              {categories.find(c => c.id === act.category_id)?.name || 'CSR Activity'}
            </span>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(act.date)}
            </span>
          </div>

          <h4 className="font-bold text-lg text-foreground mt-3">{act.title}</h4>
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">{act.description}</p>
        </div>

        <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between">
          <span className="text-sm font-bold text-teal-400 flex items-center gap-1 select-none">
            <Award className="w-4 h-4 text-teal-400" />
            {act.points_reward} Points / XP
          </span>

          {joined ? (
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase select-none ${
              status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/25' :
              status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : 
                                      'bg-amber-500/10 text-amber-400 border border-amber-500/25'
            }`}>
              {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending Approval'}
            </span>
          ) : (
            <button
              onClick={() => handleJoinActivity(act.id)}
              className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              Join Activity
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderSkeleton = () => (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-4 bg-white/10 rounded w-1/4" />
        <div className="h-4 bg-white/10 rounded w-1/4" />
      </div>
      <div className="h-6 bg-white/10 rounded w-3/4" />
      <div className="h-10 bg-white/10 rounded w-full" />
    </div>
  )

  return (
    <div className="space-y-4">
      <InfiniteList<CSRActivity>
        items={items}
        renderItem={renderCSRCard}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        totalCount={totalCount}
        isLoading={isLoading}
        renderSkeleton={renderSkeleton}
        emptyMessage="No CSR activities found."
        autoLoad={false} // Click manual trigger or scroll
      />
    </div>
  )
}
