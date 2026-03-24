"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Send, Clock, CheckCircle2, XCircle } from "lucide-react"

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"

const columns: AdminListColumn[] = [
  {
    header: "Dealer / Prospect",
    key: "dealer",
    render: (item: any) => (
      <div>
        <p className="font-medium text-foreground">{item.prospectName || item.dealerName || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{item.email || ""}</p>
      </div>
    ),
  },
  {
    header: "Invite Type",
    key: "type",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">{item.inviteType || item.type || "quick-offer"}</Badge>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = (item.status || "sent").toLowerCase()
      const colors: Record<string, string> = {
        sent: "bg-blue-100 text-blue-800",
        viewed: "bg-yellow-100 text-yellow-800",
        responded: "bg-green-100 text-green-800",
        expired: "bg-gray-100 text-gray-800",
        declined: "bg-red-100 text-red-800",
      }
      return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || "bg-gray-100 text-gray-800"}`}>{s}</span>
    },
  },
  {
    header: "Vehicle Request",
    key: "request",
    render: (item: any) => (
      <span className="text-sm text-muted-foreground">{item.vehicleSummary || item.buyerRequestId?.slice(0, 8) || "—"}</span>
    ),
  },
  {
    header: "Sent",
    key: "sent",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.sentAt || item.createdAt)}</span>,
  },
  {
    header: "Expires",
    key: "expires",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.tokenExpiresAt || item.expiresAt)}</span>,
  },
]

export default function AdminDealerInvitesPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/dealer-invites",
    extraParams: { status },
  })

  const items = data?.invites || data?.items || []

  return (
    <AdminListPageShell
      title="Dealer Invites"
      subtitle="Track outreach invitations to non-network dealers"
      searchPlaceholder="Search by dealer name or email..."
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
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Invites", value: data?.total || 0, icon: <Send className="h-8 w-8 text-primary" /> },
        { label: "Pending", value: items.filter((i: any) => i.status === "sent").length, icon: <Clock className="h-8 w-8 text-blue-500" /> },
        { label: "Responded", value: items.filter((i: any) => i.status === "responded").length, icon: <CheckCircle2 className="h-8 w-8 text-green-500" /> },
        { label: "Expired", value: items.filter((i: any) => i.status === "expired").length, icon: <XCircle className="h-8 w-8 text-red-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No dealer invites sent yet"
      loadingText="Loading invites..."
      errorText="Failed to load invites"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
