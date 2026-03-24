"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

/* ---------- Types ---------- */

export interface StatCard {
  label: string
  value: string | number
  icon?: ReactNode
}

export interface AdminListColumn<T = any> {
  header: string
  key: string
  className?: string
  render?: (item: T) => ReactNode
}

export interface AdminListPageShellProps<T = any> {
  /* ---- Header ---- */
  title: string
  subtitle?: string
  headerActions?: ReactNode

  /* ---- Search ---- */
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  onSearch: () => void
  filterSlot?: ReactNode

  /* ---- Stats ---- */
  stats?: StatCard[]

  /* ---- Table ---- */
  columns: AdminListColumn<T>[]
  items: T[]
  rowKey: (item: T) => string
  isLoading: boolean
  error?: any
  emptyText?: string
  loadingText?: string
  errorText?: string

  /* ---- Pagination ---- */
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

/* ---------- Component ---------- */

export function AdminListPageShell<T = any>({
  title,
  subtitle,
  headerActions,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  onSearch,
  filterSlot,
  stats,
  columns,
  items,
  rowKey,
  isLoading,
  error,
  emptyText = "No results found",
  loadingText = "Loading...",
  errorText = "Failed to load data",
  page,
  totalPages,
  total,
  onPageChange,
}: AdminListPageShellProps<T>) {
  return (
    <div className="space-y-6" data-testid="admin-list-page-shell">
      {/* ---- Header Row ---- */}
      <div className="flex items-center justify-between" data-testid="shell-header">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex gap-2">{headerActions}</div>}
      </div>

      {/* ---- Search & Filters ---- */}
      <Card data-testid="shell-search">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                className="pl-10"
              />
            </div>
            {filterSlot}
            <Button onClick={onSearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Stats Cards ---- */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="shell-stats">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {stat.icon}
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Table ---- */}
      <Card data-testid="shell-table">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">{loadingText}</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{errorText}</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={
                            col.className ??
                            "px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          }
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.length > 0 ? (
                      items.map((item) => (
                        <tr key={rowKey(item)} className="hover:bg-muted/30 transition-colors">
                          {columns.map((col) => (
                            <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              {col.render ? col.render(item) : (item as any)[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-6 py-8 text-center text-muted-foreground"
                        >
                          {emptyText}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---- Pagination Footer ---- */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-6 py-4 border-t border-border"
                  data-testid="shell-pagination"
                >
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
