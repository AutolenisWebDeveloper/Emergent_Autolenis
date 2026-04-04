"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Database, Play, Pause, AlertTriangle } from "lucide-react"

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"

const columns: AdminListColumn[] = [
  {
    header: "Source",
    key: "source",
    render: (item: any) => (
      <div>
        <p className="font-medium text-foreground">{item.name || item.feedUrl || "Unnamed Source"}</p>
        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{item.feedUrl || ""}</p>
      </div>
    ),
  },
  {
    header: "Type",
    key: "type",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">{item.feedType || item.type || "unknown"}</Badge>
    ),
  },
  {
    header: "Dealer",
    key: "dealer",
    render: (item: any) => (
      <span className="text-sm text-muted-foreground">{item.dealerName || item.prospectName || "—"}</span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = item.status || "active"
      const colors: Record<string, string> = {
        active: "bg-green-100 text-green-800",
        paused: "bg-yellow-100 text-yellow-800",
        error: "bg-red-100 text-red-800",
        suppressed: "bg-gray-100 text-gray-800",
      }
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || "bg-gray-100 text-gray-800"}`}>
          {s}
        </span>
      )
    },
  },
  {
    header: "Vehicles",
    key: "vehicleCount",
    render: (item: any) => <span className="text-sm">{item.vehicleCount ?? item.lastRunVehicleCount ?? "—"}</span>,
  },
  {
    header: "Last Fetched",
    key: "lastFetched",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.lastFetchedAt || item.updatedAt)}</span>,
  },
  {
    header: "Errors",
    key: "errors",
    render: (item: any) => (
      item.consecutiveErrors > 0
        ? <span className="text-sm text-red-600 font-medium">{item.consecutiveErrors}</span>
        : <span className="text-sm text-muted-foreground">0</span>
    ),
  },
]

export default function AdminInventorySourcesPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/inventory/sources",
    extraParams: { status },
  })

  const items = data?.sources || data?.items || []

  return (
    <AdminListPageShell
      title="Inventory Sources"
      subtitle="Dealer feed registrations and crawl status"
      searchPlaceholder="Search by name or URL..."
      searchValue={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      filterSlot={
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Sources", value: data?.total || 0, icon: <Database className="h-8 w-8 text-primary" /> },
        { label: "Active", value: items.filter((i: any) => i.status === "active").length, icon: <Play className="h-8 w-8 text-green-500" /> },
        { label: "Paused", value: items.filter((i: any) => i.status === "paused").length, icon: <Pause className="h-8 w-8 text-yellow-500" /> },
        { label: "Errors", value: items.filter((i: any) => i.status === "error" || (i.consecutiveErrors && i.consecutiveErrors > 0)).length, icon: <AlertTriangle className="h-8 w-8 text-red-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No inventory sources configured"
      loadingText="Loading sources..."
      errorText="Failed to load sources"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
