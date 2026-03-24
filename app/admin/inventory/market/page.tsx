"use client"

import { useState } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { useAdminList } from "@/hooks/use-admin-list"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { VehicleStatusChip } from "@/components/vehicles"
import type { ChipVariant } from "@/components/vehicles"
import { Globe, Car, DollarSign } from "lucide-react"

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
    header: "Source",
    key: "source",
    render: (item: any) => (
      <Badge variant="outline" className="text-xs">{item.sourceName || item.dealerName || "Unknown"}</Badge>
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
    header: "Mileage",
    key: "mileage",
    render: (item: any) => (
      <span className="text-sm text-muted-foreground">{item.mileage ? `${Number(item.mileage).toLocaleString()} mi` : "—"}</span>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item: any) => {
      const s = (item.status || "ACTIVE").toUpperCase()
      const chipMap: Record<string, ChipVariant> = {
        ACTIVE: "available",
        STALE: "stale",
        PROMOTED: "promoted",
      }
      const variant = chipMap[s]
      if (variant) return <VehicleStatusChip variant={variant} />
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{s}</span>
    },
  },
  {
    header: "Confidence",
    key: "confidence",
    render: (item: any) => {
      const conf = item.confidenceScore ?? item.confidence
      if (conf == null) return <span className="text-sm text-muted-foreground">—</span>
      const pct = Math.round(conf * 100)
      return <span className={`text-sm font-medium ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{pct}%</span>
    },
  },
  {
    header: "First Seen",
    key: "firstSeen",
    render: (item: any) => <span className="text-sm text-muted-foreground">{formatDate(item.firstSeenAt || item.createdAt)}</span>,
  },
]

export default function AdminMarketInventoryPage() {
  const [status, setStatus] = useState("all")

  const { data, isLoading, error, search, setSearch, handleSearch, page, setPage } = useAdminList({
    endpoint: "/api/admin/inventory/market",
    extraParams: { status },
  })

  const items = data?.results || data?.vehicles || data?.items || []

  return (
    <AdminListPageShell
      title="Market Inventory"
      subtitle="Vehicles discovered from external sources and market feeds"
      searchPlaceholder="Search by make, model, or VIN..."
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
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="STALE">Stale</SelectItem>
            <SelectItem value="PROMOTED">Promoted</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
          </SelectContent>
        </Select>
      }
      stats={[
        { label: "Total Market Vehicles", value: data?.total || 0, icon: <Globe className="h-8 w-8 text-primary" /> },
        { label: "Active", value: items.filter((i: any) => (i.status || "").toUpperCase() === "ACTIVE").length, icon: <Car className="h-8 w-8 text-green-500" /> },
      ]}
      columns={columns}
      items={items}
      rowKey={(item: any) => item.id}
      isLoading={isLoading}
      error={error}
      emptyText="No market vehicles found"
      loadingText="Loading market inventory..."
      errorText="Failed to load market inventory"
      page={data?.page || page}
      totalPages={data?.totalPages || 1}
      total={data?.total || 0}
      onPageChange={setPage}
    />
  )
}
