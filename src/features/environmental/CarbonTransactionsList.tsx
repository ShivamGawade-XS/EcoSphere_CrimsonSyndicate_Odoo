import { usePaginatedQuery } from '@/hooks/usePaginatedQuery'
import { InfiniteList } from '@/components/shared/InfiniteList'
import { formatCO2, formatDate } from '@/lib/utils'
import { CarbonTransaction, Department } from '@/types'

interface CarbonTransactionsListProps {
  orgId:          string
  depts:          Department[]
  startEditTx:    (tx: CarbonTransaction) => void
  handleDeleteTx: (id: string) => void
  refreshTrigger?: number
}

export function CarbonTransactionsList({
  orgId,
  depts,
  startEditTx,
  handleDeleteTx,
  refreshTrigger = 0,
}: CarbonTransactionsListProps) {
  // Use paginated query hook to load carbon transactions
  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    totalCount,
    isLoading,
  } = usePaginatedQuery<CarbonTransaction>({
    queryKey:  ['carbon_transactions_paginated', String(refreshTrigger)],
    tableName: 'carbon_transactions',
    filters:   { org_id: orgId },
    orderBy:   { column: 'date', ascending: false },
    pageSize:  10, // Use smaller page size for demo infinite list
  })

  const renderTxRow = (tx: CarbonTransaction, index: number) => {
    const dept = depts.find((d) => d.id === tx.department_id)
    return (
      <div
        key={tx.id || index}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border/80 bg-card rounded-xl hover:border-white/20 hover:bg-muted/5 transition-all gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{formatDate(tx.date)}</span>
            <span className="capitalize px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-semibold">
              {tx.source_type}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              tx.auto_calculated ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {tx.auto_calculated ? 'Auto' : 'Manual'}
            </span>
          </div>
          <h4 className="font-semibold text-sm text-foreground mt-1.5">
            {dept?.name || 'Company-Wide'} &mdash; {tx.quantity.toLocaleString()} {tx.emission_factor?.unit.split('/').pop() || ''}
          </h4>
          {tx.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tx.notes}</p>}
        </div>

        <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-500">{formatCO2(tx.calculated_emission_kg)}</p>
            <p className="text-[10px] text-muted-foreground">CO₂ Equivalent</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => startEditTx(tx)}
              className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteTx(tx.id)}
              className="px-2.5 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSkeleton = () => (
    <div className="flex items-center justify-between p-4 border border-border bg-card/50 rounded-xl animate-pulse">
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-white/10 rounded w-1/4" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
      </div>
      <div className="w-16 h-8 bg-white/10 rounded" />
    </div>
  )

  return (
    <InfiniteList<CarbonTransaction>
      items={items}
      renderItem={renderTxRow}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      totalCount={totalCount}
      isLoading={isLoading}
      renderSkeleton={renderSkeleton}
      emptyMessage="No carbon transactions found."
      autoLoad={true}
    />
  )
}
