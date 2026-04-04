"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Radar, Building2, MapPin, Globe } from "lucide-react"

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—"

const columns: AdminListColumn[] = [
  {
    header: "Business",
    key: "business",
    render: (item: any) => (
      <div>
        <p className="font-medium text-foreground">{item.businessName || item.name || "Unknown"}</p>
        <p className="text-xs text-muted-foreground">{item.email || item.website || ""}</p>
      </div>
    ),
  },
  {
    header: "Location",
    key: "location",
    render: (item: any) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {item.city && item.state ? `${item.city}, ${item.state}` : item.zip || "—"}
      </div>
    ),
  },
  {
    header: "Source",
    key: "source",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">
        {item.discoverySource || item.source || "manual"}
      </Badge>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = item.status || "new"
      const colors: Record<string, string> = {
        new: "bg-blue-100 text-blue-800",
        contacted: "bg-yellow-100 text-yellow-800",
        interested: "bg-green-100 text-green-800",
        declined: "bg-red-100 text-red-800",
        converted: "bg-purple-100 text-purple-800",
        stale: "bg-gray-100 text-gray-800",
      }
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[s] || colors.new}`}>
          {s}
        </span>
      )
    },
  },
  {
    header: "Inventory",
    key: "inventoryCount",
    render: (item: any) => <span className="text-sm">{item.inventoryCount ?? item.marketVehicleCount ?? "—"}</span>,
  },
  {
    header: "Discovered",
    key: "discovered",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.createdAt || item.discoveredAt)}</span>,
  },
]

export default function AdminDealerIntelligencePage() {
  const [view, setView] = useState<"discovered" | "prospects">("discovered")
  const [status, setStatus] = useState("all")

  const endpoint = view === "discovered" ? "/api/admin/dealers/discovered" : "/api/admin/dealers/prospects"

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint,
    extraParams: { status },
  })

  const items = data?.prospects || data?.dealers || data?.items || []

  return (
    <AdminListPageShell
      title="Dealer Intelligence"
      subtitle="Discovered dealers, prospects, and network growth pipeline"
      headerActions={
        <div className="flex gap-2">
          <Select value={view} onValueChange={(v) => { setView(v as "discovered" | "prospects"); setPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discovered">Discovered Dealers</SelectItem>
              <SelectItem value="prospects">Prospects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      searchPlaceholder="Search by name, email, or zip..."
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Discovered", value: data?.total || 0, icon: <Radar className="h-8 w-8 text-primary" /> },
        { label: "Prospects", value: data?.prospectCount || items.filter((i: any) => i.status === "interested").length, icon: <Building2 className="h-8 w-8 text-blue-500" /> },
        { label: "Converted", value: items.filter((i: any) => i.status === "converted").length, icon: <Globe className="h-8 w-8 text-green-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No dealers discovered yet"
      loadingText="Loading dealer intelligence..."
      errorText="Failed to load dealer data"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
