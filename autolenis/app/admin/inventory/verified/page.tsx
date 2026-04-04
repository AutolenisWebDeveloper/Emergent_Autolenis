"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { VehicleStatusChip } from "@/components/vehicles"
import type { ChipVariant } from "@/components/vehicles"
import { Shield, CheckCircle2 } from "lucide-react"

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100)

const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—"

const columns: AdminListColumn[] = [
  {
    header: "Vehicle",
    key: "vehicle",
    render: (item: any) => (
      <div>
        <p className="font-medium text-foreground">{item.year} {item.make} {item.model}</p>
        <p className="text-xs text-muted-foreground">{item.trim || ""} {item.vin ? `• ${item.vin}` : ""}</p>
      </div>
    ),
  },
  {
    header: "Dealer",
    key: "dealer",
    render: (item: any) => (
      <span className="text-sm text-muted-foreground">{item.dealerName || "—"}</span>
    ),
  },
  {
    header: "Price",
    key: "price",
    render: (item: any) => (
      <span className="text-sm font-medium">{item.priceCents ? formatCurrency(item.priceCents) : "—"}</span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = (item.verificationStatus || item.status || "pending").toLowerCase()
      const chipMap: Record<string, ChipVariant> = {
        verified: "verified",
        pending: "pending",
        stale: "stale",
      }
      const variant = chipMap[s]
      if (variant) return <VehicleStatusChip variant={variant} />
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{s}</span>
    },
  },
  {
    header: "Source",
    key: "source",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">{item.promotedFrom ? "Promoted" : "Direct"}</Badge>
    ),
  },
  {
    header: "Verified",
    key: "verifiedDate",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.verifiedAt || item.createdAt)}</span>,
  },
]

export default function AdminVerifiedInventoryPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/inventory/verified",
    extraParams: { status },
  })

  const items = data?.vehicles || data?.items || []

  return (
    <AdminListPageShell
      title="Verified Inventory"
      subtitle="Network dealer inventory confirmed and available for buyers"
      searchPlaceholder="Search by make, model, VIN, or dealer..."
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
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="stale">Stale</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Verified", value: data?.total || 0, icon: <Shield className="h-8 w-8 text-green-600" /> },
        { label: "Active", value: items.filter((i: any) => (i.verificationStatus || i.status || "").toLowerCase() === "verified").length, icon: <CheckCircle2 className="h-8 w-8 text-green-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No verified inventory found"
      loadingText="Loading verified inventory..."
      errorText="Failed to load verified inventory"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
