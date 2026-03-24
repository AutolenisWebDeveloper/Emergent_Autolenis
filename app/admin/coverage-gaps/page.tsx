"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MapPin, AlertCircle, CheckCircle2, Send } from "lucide-react"

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"

const columns: AdminListColumn[] = [
  {
    header: "Market / Zip",
    key: "market",
    render: (item: any) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">{item.marketZip || item.zip || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{item.marketDescription || ""}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Gap Type",
    key: "gapType",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">{item.gapType || "coverage"}</Badge>
    ),
  },
  {
    header: "Buyer Request",
    key: "buyerRequest",
    render: (item: any) => (
      <span className="text-sm text-muted-foreground">{item.buyerRequestId ? `Request #${item.buyerRequestId.slice(0, 8)}` : "General"}</span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = (item.status || "OPEN").toUpperCase()
      const colors: Record<string, string> = {
        OPEN: "bg-blue-100 text-blue-800",
        IN_PROGRESS: "bg-yellow-100 text-yellow-800",
        RESOLVED: "bg-green-100 text-green-800",
        CLOSED: "bg-gray-100 text-gray-800",
      }
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || "bg-gray-100 text-gray-800"}`}>{s}</span>
    },
  },
  {
    header: "Invites Sent",
    key: "invites",
    render: (item: any) => <span className="text-sm">{item.invitesSent ?? 0}</span>,
  },
  {
    header: "Created",
    key: "created",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>,
  },
]

export default function AdminCoverageGapsPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/coverage-gaps",
    extraParams: { status },
  })

  const items = data?.tasks || data?.gaps || data?.items || []

  return (
    <AdminListPageShell
      title="Coverage Gaps"
      subtitle="Markets without adequate dealer coverage for buyer demand"
      searchPlaceholder="Search by zip or market..."
      searchValue={search}
      onSearchChange={setSearch}
      onSearch={handleSearch}
      filterSlot={
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Gaps", value: data?.total || 0, icon: <MapPin className="h-8 w-8 text-primary" /> },
        { label: "Open", value: items.filter((i: any) => (i.status || "").toUpperCase() === "OPEN").length, icon: <AlertCircle className="h-8 w-8 text-blue-500" /> },
        { label: "Resolved", value: items.filter((i: any) => (i.status || "").toUpperCase() === "RESOLVED").length, icon: <CheckCircle2 className="h-8 w-8 text-green-500" /> },
        { label: "Invites Sent", value: items.reduce((sum: number, i: any) => sum + (i.invitesSent || 0), 0), icon: <Send className="h-8 w-8 text-purple-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No coverage gaps detected"
      loadingText="Loading coverage gaps..."
      errorText="Failed to load coverage gaps"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
