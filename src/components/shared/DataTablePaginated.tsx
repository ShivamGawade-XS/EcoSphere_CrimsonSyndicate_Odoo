/**
 * DataTablePaginated — Standard data table with page-number pagination
 *
 * Persists page size to localStorage, synchronises page indexes to URL params,
 * and maintains column sort states.
 */

import { useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export interface ColumnConfig<T> {
  key:      string
  header:   string
  sortable?: boolean
  render?:  (item: T, index: number) => React.ReactNode
}

interface DataTablePaginatedProps<T> {
  columns:    ColumnConfig<T>[]
  data:       T[]
  totalCount: number
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void
  currentSort?:  { column: string; direction: 'asc' | 'desc' }
}

export function DataTablePaginated<T = any>({
  columns,
  data,
  totalCount,
  onSortChange,
  currentSort,
}: DataTablePaginatedProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Local state for page size (persisted to localStorage)
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('ecosphere-global-page-size')
    return saved ? Number(saved) : 25
  })

  // Derive current page index from URL search params (1-indexed for users)
  const currentPage = Number(searchParams.get('page') || '1')
  const totalPages  = Math.max(1, Math.ceil(totalCount / pageSize))

  // Ensure current page does not exceed total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setPage('1')
    }
  }, [totalPages, currentPage])

  const setPage = (pageStr: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', pageStr)
    setSearchParams(newParams)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    localStorage.setItem('ecosphere-global-page-size', String(size))
    setPage('1') // reset to first page
  }

  const handleHeaderClick = (colKey: string, sortable?: boolean) => {
    if (!sortable || !onSortChange) return

    let dir: 'asc' | 'desc' = 'asc'
    if (currentSort?.column === colKey) {
      dir = currentSort.direction === 'asc' ? 'desc' : 'asc'
    }
    onSortChange(colKey, dir)
  }

  // Calculate current range slice details (1-indexed for display)
  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd   = Math.min(currentPage * pageSize, totalCount)

  // Render sort icons helper
  const renderSortIcon = (colKey: string, sortable?: boolean) => {
    if (!sortable || !onSortChange) return null
    if (currentSort?.column !== colKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1.5 shrink-0" />
    return currentSort.direction === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-primary ml-1.5 shrink-0" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary ml-1.5 shrink-0" />
  }

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 border-b border-border select-none">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key, col.sortable)}
                  className={`py-3 px-6 font-semibold text-muted-foreground ${
                    col.sortable && onSortChange ? 'cursor-pointer hover:text-foreground transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {col.header}
                    {renderSortIcon(col.key, col.sortable)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={`row-${idx}`} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-3.5 px-6 align-middle">
                    {col.render ? col.render(item, idx) : String((item as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                  No records to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 select-none">
        {/* Left: Range and size selector */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
          {totalCount > 0 && (
            <span>
              Items <span className="text-foreground">{rangeStart}</span>&ndash;
              <span className="text-foreground">{rangeEnd}</span> of{' '}
              <span className="text-foreground">{totalCount}</span>
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <span>Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="bg-muted border border-border rounded-md px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Page button controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage('1')}
              disabled={currentPage === 1}
              className="p-1.5 border border-border hover:bg-muted rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(String(currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-border hover:bg-muted rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-3 text-muted-foreground">
              Page <span className="text-foreground">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={() => setPage(String(currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-border hover:bg-muted rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(String(totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-border hover:bg-muted rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
