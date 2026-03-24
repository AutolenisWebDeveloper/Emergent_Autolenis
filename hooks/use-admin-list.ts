"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface AdminListPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UseAdminListOptions {
  /** API endpoint path, e.g. "/api/admin/buyers" */
  endpoint: string
  /** Default page size */
  limit?: number
  /** SWR refresh interval in ms (default: 30000) */
  refreshInterval?: number
  /** Extra query params to append, e.g. { status: "active" } */
  extraParams?: Record<string, string>
}

export interface UseAdminListReturn<T = any> {
  /** Raw SWR data */
  data: T | undefined
  /** Whether the request is loading */
  isLoading: boolean
  /** Error from SWR */
  error: any
  /** Current search input value */
  search: string
  /** Committed search query (sent to API) */
  searchQuery: string
  /** Set the search input value */
  setSearch: (value: string) => void
  /** Commit search and reset to page 1 */
  handleSearch: () => void
  /** Current page number */
  page: number
  /** Set page number */
  setPage: (page: number) => void
  /** Re-fetch data */
  refresh: () => void
}

export function useAdminList<T = any>(options: UseAdminListOptions): UseAdminListReturn<T> {
  const { endpoint, limit = 25, refreshInterval = 30000, extraParams } = options

  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(limit))
    if (searchQuery) params.set("search", searchQuery)
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value && value !== "all") params.set(key, value)
      }
    }
    return `${endpoint}?${params.toString()}`
  }, [endpoint, page, limit, searchQuery, extraParams])

  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    refreshInterval,
  })

  const handleSearch = () => {
    setSearchQuery(search)
    setPage(1)
  }

  return {
    data,
    isLoading,
    error,
    search,
    searchQuery,
    setSearch,
    handleSearch,
    page,
    setPage,
    refresh: () => mutate(),
  }
}
