/**
 * InfiniteList — Scrollable list with auto-load and manual fallback
 *
 * Implements infinite scrolling using IntersectionObserver. Displays total
 * counts and skeleton states while fetching additional pages.
 */

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface InfiniteListProps<T> {
  items:              T[]
  renderItem:         (item: T, index: number) => React.ReactNode
  fetchNextPage:      () => void
  hasNextPage:        boolean
  isFetchingNextPage: boolean
  totalCount:         number
  isLoading?:         boolean
  autoLoad?:          boolean
  skeletonCount?:     number
  renderSkeleton?:    () => React.ReactNode
  emptyMessage?:      string
}

export function InfiniteList<T = any>({
  items,
  renderItem,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  totalCount,
  isLoading = false,
  autoLoad = true,
  skeletonCount = 3,
  renderSkeleton,
  emptyMessage = 'No records found.',
}: InfiniteListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // IntersectionObserver for auto loading next page
  useEffect(() => {
    if (!autoLoad || !hasNextPage || isFetchingNextPage || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: '100px' }
    )

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [autoLoad, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

  // Default simple skeleton row loader
  const defaultSkeleton = () => (
    <div className="flex flex-col gap-2 w-full animate-pulse p-4 border border-white/5 bg-white/5 rounded-xl">
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="h-3 bg-white/10 rounded w-2/3" />
    </div>
  )

  const skeletonRenderer = renderSkeleton || defaultSkeleton

  return (
    <div className="space-y-4">
      {/* Total count display */}
      <div className="text-xs text-muted-foreground font-medium select-none">
        Showing <span className="text-foreground">{items.length}</span> of{' '}
        <span className="text-foreground">{totalCount}</span> records
      </div>

      {/* Main List */}
      <div className="space-y-3">
        {items.map((item, idx) => renderItem(item, idx))}

        {/* Initial loading skeletons */}
        {isLoading && items.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`init-skel-${i}`}>{skeletonRenderer()}</div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div className="p-8 border border-border border-dashed rounded-2xl text-center text-sm text-muted-foreground bg-card/20 select-none">
            {emptyMessage}
          </div>
        )}

        {/* Loader skeletons for next pages */}
        {isFetchingNextPage && (
          <div className="space-y-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`next-skel-${i}`}>{skeletonRenderer()}</div>
            ))}
          </div>
        )}
      </div>

      {/* Sentinel / Load More Button trigger */}
      {hasNextPage && !isLoading && (
        <div ref={sentinelRef} className="pt-4 flex justify-center">
          {!autoLoad && (
            <button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading more...
                </>
              ) : (
                'Load more records'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
