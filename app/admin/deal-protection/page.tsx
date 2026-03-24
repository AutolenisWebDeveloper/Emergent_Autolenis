"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, Eye, Lock, Unlock, AlertTriangle } from "lucide-react"

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"

const alertColumns: AdminListColumn[] = [
  {
    header: "Type",
    key: "type",
    render: (item: any) => (
      <div className="flex items-center gap-2">
        <AlertTriangle className={`h-4 w-4 ${item.severity === "HIGH" ? "text-red-500" : item.severity === "MEDIUM" ? "text-yellow-500" : "text-blue-500"}`} />
        <Badge variant="outline" className="text-xs">{item.alertType || item.type || "contact_sharing"}</Badge>
      </div>
    ),
  },
  {
    header: "Severity",
    key: "severity",
    render: (item: any) => {
      const s = (item.severity || "LOW").toUpperCase()
      const colors: Record<string, string> = {
        HIGH: "bg-red-100 text-red-800",
        MEDIUM: "bg-yellow-100 text-yellow-800",
        LOW: "bg-blue-100 text-blue-800",
      }
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || "bg-gray-100 text-gray-800"}`}>{s}</span>
    },
  },
  {
    header: "Parties",
    key: "parties",
    render: (item: any) => (
      <div className="text-sm">
        <p className="text-foreground">{item.senderType || "—"} → {item.recipientType || "—"}</p>
        <p className="text-xs text-muted-foreground">{item.dealId ? `Deal ${item.dealId.slice(0, 8)}` : "No deal"}</p>
      </div>
    ),
  },
  {
    header: "Patterns",
    key: "patterns",
    render: (item: any) => {
      const patterns = item.detectedPatterns || item.patterns || []
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(patterns) ? patterns : []).slice(0, 3).map((p: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">{typeof p === "string" ? p : p.type || "unknown"}</Badge>
          ))}
        </div>
      )
    },
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = (item.status || "open").toLowerCase()
      const colors: Record<string, string> = {
        open: "bg-red-100 text-red-800",
        reviewing: "bg-yellow-100 text-yellow-800",
        resolved: "bg-green-100 text-green-800",
        dismissed: "bg-gray-100 text-gray-800",
      }
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || "bg-gray-100 text-gray-800"}`}>{s}</span>
    },
  },
  {
    header: "Detected",
    key: "detected",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.detectedAt || item.createdAt)}</span>,
  },
]

export default function AdminDealProtectionPage() {
  const [view, setView] = useState<"alerts" | "identity" | "redaction">("alerts")
  const [status, setStatus] = useState("all")

  const endpoints: Record<string, string> = {
    alerts: "/api/admin/deal-protection/alerts",
    identity: "/api/admin/deal-protection/identity-release-events",
    redaction: "/api/admin/deal-protection/redaction-events",
  }

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: endpoints[view],
    extraParams: view === "alerts" ? { status } : {},
  })

  const items = data?.alerts || data?.events || data?.items || []

  if (view === "identity" || view === "redaction") {
    const eventColumns: AdminListColumn[] = [
      {
        header: "Event",
        key: "event",
        render: (item: any) => (
          <div>
            <p className="font-medium text-foreground">{item.previousState || "—"} → {item.newState || "—"}</p>
            <p className="text-xs text-muted-foreground">{item.reason || ""}</p>
          </div>
        ),
      },
      {
        header: "Deal",
        key: "deal",
        render: (item: any) => <span className="text-sm text-muted-foreground">{item.dealId?.slice(0, 8) || "—"}</span>,
      },
      {
        header: "Triggered By",
        key: "triggeredBy",
        render: (item: any) => <span className="text-sm">{item.triggeredBy || item.performedBy || "SYSTEM"}</span>,
      },
      {
        header: "Date",
        key: "date",
        render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.releasedAt || item.redactedAt || item.createdAt)}</span>,
      },
    ]

    return (
      <AdminListPageShell
        title="Deal Protection"
        subtitle={view === "identity" ? "Identity release events" : "Message redaction events"}
        headerActions={
          <Select value={view} onValueChange={(v) => { setView(v as any); setPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alerts">Circumvention Alerts</SelectItem>
              <SelectItem value="identity">Identity Releases</SelectItem>
              <SelectItem value="redaction">Redaction Events</SelectItem>
            </SelectContent>
          </Select>
        }
        searchPlaceholder="Search..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        stats={[
          { label: "Total Events", value: data?.total || 0, icon: view === "identity" ? <Lock className="h-8 w-8 text-primary" /> : <Eye className="h-8 w-8 text-primary" /> },
        ]}
        columns={eventColumns}
        items={items}
        rowKey={(item: any) => item.id}
        isLoading={isLoading}
        error={error}
        emptyText="No events recorded"
        loadingText="Loading events..."
        errorText="Failed to load events"
        page={data?.page || page}
        totalPages={data?.totalPages || 1}
        total={data?.total || 0}
        onPageChange={setPage}
      />
    )
  }

  return (
    <AdminListPageShell
      title="Deal Protection"
      subtitle="Monitor circumvention attempts, identity masking, and message redaction"
      headerActions={
        <Select value={view} onValueChange={(v) => { setView(v as any); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alerts">Circumvention Alerts</SelectItem>
            <SelectItem value="identity">Identity Releases</SelectItem>
            <SelectItem value="redaction">Redaction Events</SelectItem>
          </SelectContent>
        </Select>
      }
      searchPlaceholder="Search alerts..."
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
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Alerts", value: data?.total || 0, icon: <ShieldAlert className="h-8 w-8 text-primary" /> },
        { label: "Open", value: items.filter((i: any) => (i.status || "").toLowerCase() === "open").length, icon: <AlertTriangle className="h-8 w-8 text-red-500" /> },
        { label: "Resolved", value: items.filter((i: any) => (i.status || "").toLowerCase() === "resolved").length, icon: <Unlock className="h-8 w-8 text-green-500" /> },
      ]}
      columns={alertColumns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No circumvention alerts"
      loadingText="Loading alerts..."
      errorText="Failed to load alerts"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
