/**
 * usePaginatedQuery — Cursor-based infinite query hook using TanStack Query v5
 *
 * Implements transparent pagination for both active Supabase database connections
 * and local offline mock mode.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const IS_MOCK_MODE = !import.meta.env.VITE_SUPABASE_URL

// Map public database table names to localstorage keys for mock fallback
const MOCK_STORAGE_KEYS: Record<string, string> = {
  carbon_transactions:     'ecosphere_transactions',
  compliance_issues:       'ecosphere_compliance_issues',
  csr_activities:          'ecosphere_csr_activities',
  policy_acknowledgements: 'ecosphere_policy_acknowledgements',
  esg_policies:            'ecosphere_policies',
  profiles:                'ecosphere_profiles',
  xp_transactions:         'ecosphere_xp_transactions',
  rewards:                 'ecosphere_rewards',
  reward_redemptions:      'ecosphere_redemptions',
  audits:                  'ecosphere_audits',
}

export interface PaginatedQueryOptions {
  queryKey:  string[]
  tableName: string
  filters?:  Record<string, any>
  orderBy?:  { column: string; ascending?: boolean }
  pageSize?: number
}

export interface PaginatedResult<T> {
  data:               T[]
  fetchNextPage:      () => void
  hasNextPage:        boolean
  isFetchingNextPage: boolean
  totalCount:         number
  isLoading:          boolean
}

export function usePaginatedQuery<T = any>(
  options: PaginatedQueryOptions
): PaginatedResult<T> {
  const {
    queryKey,
    tableName,
    filters = {},
    orderBy = { column: 'created_at', ascending: false },
    pageSize = 25,
  } = options

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [...queryKey, tableName, filters, orderBy, pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * pageSize
      const to = from + pageSize - 1

      // ─── Mock Mode: LocalStorage pagination ─────────────────────────────────
      if (IS_MOCK_MODE) {
        const storageKey = MOCK_STORAGE_KEYS[tableName]
        if (!storageKey) {
          return { data: [], nextCursor: undefined, totalCount: 0 }
        }

        const raw = localStorage.getItem(storageKey)
        let list: T[] = raw ? JSON.parse(raw) : []

        // Apply simple equality filter
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            list = list.filter((item: any) => String(item[key]) === String(val))
          }
        })

        // Apply ordering
        const { column, ascending } = orderBy
        list.sort((a: any, b: any) => {
          const valA = a[column]
          const valB = b[column]

          if (valA === undefined || valB === undefined) return 0

          if (typeof valA === 'string' && typeof valB === 'string') {
            return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA)
          }

          return ascending ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
        })

        const pageData = list.slice(from, to + 1)
        const nextCursor = list.length > to + 1 ? pageParam + 1 : undefined

        return {
          data: pageData,
          nextCursor,
          totalCount: list.length,
        }
      }

      // ─── Production Mode: Supabase Range Queries ────────────────────────────
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })

      // Apply filters
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query = query.eq(key, val)
        }
      })

      // Order and range
      query = query
        .order(orderBy.column, { ascending: orderBy.ascending })
        .range(from, to)

      const { data: dbData, count, error } = await query

      if (error) {
        throw error
      }

      const totalCount = count ?? 0
      const nextCursor = totalCount > to + 1 ? pageParam + 1 : undefined

      return {
        data: (dbData ?? []) as T[],
        nextCursor,
        totalCount,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Flatten all pages of data
  const flatData = data?.pages.flatMap((page) => page.data) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  return {
    data: flatData,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    totalCount,
    isLoading,
  }
}
