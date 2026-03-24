"use client"

import { useState, useCallback, useMemo } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Car, ExternalLink, X, AlertTriangle, Globe, ShieldCheck, Package } from "lucide-react"
import useSWR from "swr"
import { csrfHeaders } from "@/lib/csrf-client"

/* ---------- Types ---------- */

type InventoryItem = {
  id: string
  price: number | null
  mileage: number | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  vin: string | null
  listing_url: string | null
  status: string
  source: string
  dealer_name: string | null
  dealer_phone: string | null
  dealer_address: string | null
  dealer_website: string | null
  city: string | null
  state: string | null
  zip: string | null
  data_quality_flags: string[] | null
  last_seen_at: string | null
  canonical_vehicle_id: string | null
  external_dealer_id: string | null
  raw_listing_id: string | null
  source_payload: Record<string, unknown> | null
}

type SearchResponse = {
  items: InventoryItem[]
  total: number
  limit: number
  offset: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/* ---------- Helpers ---------- */

const PAGE_SIZE = 50

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—"

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"

/* ---------- Columns ---------- */

function buildColumns(onSelect: (item: InventoryItem) => void): AdminListColumn<InventoryItem>[] {
  return [
    {
      header: "Vehicle",
      key: "vehicle",
      render: (item) => (
        <button type="button" className="text-left" onClick={() => onSelect(item)}>
          <p className="font-medium text-foreground hover:underline cursor-pointer">
            {[item.year, item.make, item.model].filter(Boolean).join(" ") || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground">{item.trim || ""}{item.vin ? ` • ${item.vin}` : ""}</p>
        </button>
      ),
    },
    {
      header: "Price",
      key: "price",
      render: (item) => <span className="text-sm font-medium">{formatCurrency(item.price)}</span>,
    },
    {
      header: "Mileage",
      key: "mileage",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.mileage != null ? `${Number(item.mileage).toLocaleString()} mi` : "—"}
        </span>
      ),
    },
    {
      header: "Dealer",
      key: "dealer",
      render: (item) => (
        <div>
          <p className="text-sm font-medium">{item.dealer_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{[item.city, item.state, item.zip].filter(Boolean).join(", ") || "—"}</p>
        </div>
      ),
    },
    {
      header: "Source",
      key: "source",
      render: (item) => <Badge variant="outline" className="text-xs">{item.source || "—"}</Badge>,
    },
    {
      header: "Status",
      key: "status",
      render: (item) => {
        const s = (item.status || "").toUpperCase()
        const colorMap: Record<string, string> = {
          ACTIVE: "bg-green-100 text-green-800",
          BUYER_VISIBLE: "bg-blue-100 text-blue-800",
          SOLD: "bg-red-100 text-red-800",
          STALE: "bg-yellow-100 text-yellow-800",
          SUPPRESSED: "bg-orange-100 text-orange-800",
          REVIEW: "bg-purple-100 text-purple-800",
          REMOVED: "bg-gray-100 text-gray-800",
        }
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorMap[s] || "bg-gray-100 text-gray-800"}`}>
            {s || "—"}
          </span>
        )
      },
    },
    {
      header: "Quality",
      key: "quality",
      render: (item) => {
        const flags = item.data_quality_flags || []
        if (flags.length === 0) return <ShieldCheck className="h-4 w-4 text-green-500" />
        return (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">{flags.length}</span>
          </div>
        )
      },
    },
    {
      header: "Last Seen",
      key: "lastSeen",
      render: (item) => <span className="text-xs text-muted-foreground">{formatDate(item.last_seen_at)}</span>,
    },
    {
      header: "",
      key: "actions",
      render: (item) =>
        item.listing_url ? (
          <a href={item.listing_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null,
    },
  ]
}

/* ---------- Detail Drawer ---------- */

function DetailDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  async function runAction(action: string) {
    if (!confirm(`Run action "${action}" on this listing?`)) return

    const res = await fetch(`/api/admin/inventory/${item.id}/action`, {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ action }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || "Action failed")
      return
    }

    alert(`Action completed: ${action}`)
    window.location.reload()
  }

  return (
    <Card className="border-l-4 border-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">
          {[item.year, item.make, item.model, item.trim].filter(Boolean).join(" ")}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Admin Actions */}
        <div>
          <p className="font-medium text-foreground mb-2">Admin Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => runAction("SUPPRESS")}>Suppress</Button>
            <Button size="sm" variant="outline" onClick={() => runAction("RESTORE")}>Restore</Button>
            <Button size="sm" variant="outline" onClick={() => runAction("MARK_STALE")}>Mark Stale</Button>
            <Button size="sm" variant="outline" onClick={() => runAction("PROMOTE_TO_BUYER_VISIBLE")}>Promote to Buyer</Button>
            <Button size="sm" variant="outline" onClick={() => runAction("SEND_TO_REVIEW")}>Send to Review</Button>
            <Button size="sm" variant="outline" onClick={() => runAction("RENORMALIZE")}>Re-Normalize</Button>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-xs">VIN</p>
            <p className="font-mono">{item.vin || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Price</p>
            <p className="font-medium">{formatCurrency(item.price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Mileage</p>
            <p>{item.mileage != null ? `${Number(item.mileage).toLocaleString()} mi` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <p>{item.status || "—"}</p>
          </div>
        </div>

        {/* Dealer Info */}
        <div>
          <p className="font-medium text-foreground mb-1">Dealer</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p>{item.dealer_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p>{item.dealer_phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Address</p>
              <p>{item.dealer_address || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Website</p>
              {item.dealer_website ? (
                <a href={item.dealer_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                  {item.dealer_website}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="font-medium text-foreground mb-1">Location</p>
          <p>{[item.city, item.state, item.zip].filter(Boolean).join(", ") || "—"}</p>
        </div>

        {/* IDs / References */}
        <div>
          <p className="font-medium text-foreground mb-1">References</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Source</p>
              <p>{item.source || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Canonical Vehicle ID</p>
              <p className="font-mono text-xs truncate">{item.canonical_vehicle_id || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">External Dealer ID</p>
              <p className="font-mono text-xs truncate">{item.external_dealer_id || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Raw Listing ID</p>
              <p className="font-mono text-xs truncate">{item.raw_listing_id || "—"}</p>
            </div>
          </div>
        </div>

        {/* Quality Flags */}
        {item.data_quality_flags && item.data_quality_flags.length > 0 && (
          <div>
            <p className="font-medium text-foreground mb-1">Quality Flags</p>
            <div className="flex flex-wrap gap-1">
              {item.data_quality_flags.map((flag) => (
                <Badge key={flag} variant="destructive" className="text-xs">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Listing URL */}
        {item.listing_url && (
          <div>
            <a
              href={item.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
            >
              <ExternalLink className="h-3 w-3" /> Open Original Listing
            </a>
          </div>
        )}

        {/* Source Payload Preview */}
        {item.source_payload && (
          <div>
            <p className="font-medium text-foreground mb-1">Source Payload</p>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48 font-mono">
              {JSON.stringify(item.source_payload, null, 2)}
            </pre>
          </div>
        )}

        {/* Last Seen */}
        <div>
          <p className="text-muted-foreground text-xs">Last Seen</p>
          <p>{formatDate(item.last_seen_at)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- Page ---------- */

export default function AdminVehicleSearchPage() {
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<InventoryItem | null>(null)

  // Filters
  const [source, setSource] = useState("all")
  const [status, setStatus] = useState("all")
  const [state, setState] = useState("all")
  const [hasVin, setHasVin] = useState("all")
  const [hasPrice, setHasPrice] = useState("all")

  const url = useMemo(() => {
    const params = new URLSearchParams()
    const offset = (page - 1) * PAGE_SIZE
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))
    if (searchQuery) params.set("q", searchQuery)
    if (source !== "all") params.set("source", source)
    if (status !== "all") params.set("status", status)
    if (state !== "all") params.set("state", state)
    if (hasVin !== "all") params.set("hasVin", hasVin)
    if (hasPrice !== "all") params.set("hasPrice", hasPrice)
    return `/api/admin/inventory/search?${params.toString()}`
  }, [page, searchQuery, source, status, state, hasVin, hasPrice])

  const { data, error, isLoading } = useSWR<SearchResponse>(url, fetcher, { refreshInterval: 30000 })

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleSearch = useCallback(() => {
    setSearchQuery(search)
    setPage(1)
  }, [search])

  const columns = useMemo(() => buildColumns(setSelected), [])

  return (
    <div className="space-y-6">
      <AdminListPageShell<InventoryItem>
        title="Vehicle Search"
        subtitle="Search scraped canonical inventory across all sources"
        searchPlaceholder="Search by VIN, make, model, dealer name, or ZIP..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        filterSlot={
          <div className="flex gap-2 flex-wrap">
            <Select value={source} onValueChange={(v) => { setSource(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="cars.com">Cars.com</SelectItem>
                <SelectItem value="autotrader">AutoTrader</SelectItem>
                <SelectItem value="cargurus">CarGurus</SelectItem>
                <SelectItem value="dealer_website">Dealer Website</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="BUYER_VISIBLE">Buyer Visible</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
                <SelectItem value="SUPPRESSED">Suppressed</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="REMOVED">Removed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hasVin} onValueChange={(v) => { setHasVin(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Has VIN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">VIN: Any</SelectItem>
                <SelectItem value="true">Has VIN</SelectItem>
                <SelectItem value="false">No VIN</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hasPrice} onValueChange={(v) => { setHasPrice(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Has Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Price: Any</SelectItem>
                <SelectItem value="true">Has Price</SelectItem>
                <SelectItem value="false">No Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        stats={[
          { label: "Total Results", value: total, icon: <Package className="h-8 w-8 text-primary" /> },
          { label: "With VIN", value: items.filter((i) => !!i.vin).length, icon: <Car className="h-8 w-8 text-green-500" /> },
          {
            label: "Quality Issues",
            value: items.filter((i) => (i.data_quality_flags || []).length > 0).length,
            icon: <AlertTriangle className="h-8 w-8 text-yellow-500" />,
          },
        ]}
        columns={columns}
        items={items}
        rowKey={(item) => item.id}
        isLoading={isLoading}
        error={error}
        emptyText="No inventory listings found"
        loadingText="Searching canonical inventory..."
        errorText="Failed to load inventory"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />

      {/* Detail Drawer */}
      {selected && <DetailDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
