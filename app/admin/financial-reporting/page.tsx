"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "MTD", value: "mtd" },
  { label: "QTD", value: "qtd" },
  { label: "YTD", value: "ytd" },
] as const

const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"]

type KPIKey =
  | "grossRevenue"
  | "netRevenue"
  | "totalTransactions"
  | "refundTotal"
  | "chargebacksTotal"
  | "pending"
  | "affiliateCommissionsAccrued"
  | "affiliateCommissionsPaid"
  | "dealerFeesCollected"
  | "refinanceRevenue"

const KPI_LABELS: Record<KPIKey, string> = {
  grossRevenue: "Gross Revenue",
  netRevenue: "Net Revenue",
  totalTransactions: "Total Transactions",
  refundTotal: "Refund Total",
  chargebacksTotal: "Chargebacks Total",
  pending: "Pending (Unsettled)",
  affiliateCommissionsAccrued: "Commissions Accrued",
  affiliateCommissionsPaid: "Commissions Paid",
  dealerFeesCollected: "Dealer Fees Collected",
  refinanceRevenue: "Refinance Revenue",
}

const TX_COLUMNS = [
  "Date",
  "Type",
  "Status",
  "Gross",
  "Stripe Fee",
  "Platform Fee",
  "Net",
  "User",
  "Related",
  "Stripe PI",
] as const

export default function FinancialReportingPage() {
  const [range, setRange] = useState("30d")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [search, setSearch] = useState("")
  const [activeKPI, setActiveKPI] = useState<string | null>(null)
  const [chartToggle, setChartToggle] = useState<"gross" | "net">("gross")
  const [selectedTx, setSelectedTx] = useState<any>(null)

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set("range", range)
    if (customFrom) params.set("from", customFrom)
    if (customTo) params.set("to", customTo)
    if (filterType) params.set("type", filterType)
    if (filterStatus) params.set("status", filterStatus)
    if (search) params.set("search", search)
    return `/api/admin/financial?${params.toString()}`
  }, [range, customFrom, customTo, filterType, filterStatus, search])

  const { data, isLoading, error } = useSWR(apiUrl, fetcher)
  const report = data?.data

  const { data: reconData, mutate: reconMutate } = useSWR(
    "/api/admin/financial/reconciliation",
    fetcher
  )
  const recon = reconData?.data

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0)

  const handleExport = useCallback(() => {
    const params = new URLSearchParams()
    params.set("format", "csv")
    if (customFrom) params.set("from", customFrom)
    if (customTo) params.set("to", customTo)
    if (filterType) params.set("type", filterType)
    window.open(`/api/admin/financial/export?${params.toString()}`, "_blank")
  }, [customFrom, customTo, filterType])

  const handleReconcile = useCallback(async () => {
    await reconMutate()
  }, [reconMutate])

  const handleSyncStripe = useCallback(async () => {
    await fetch("/api/admin/financial/reconciliation", { method: "POST", headers: csrfHeaders() })
    await reconMutate()
  }, [reconMutate])

  // Filter transactions based on active KPI card click
  const filteredTransactions = useMemo(() => {
    if (!report?.transactions) return []
    let txs = report.transactions
    if (activeKPI === "refundTotal") txs = txs.filter((t: any) => t.type === "REFUND")
    else if (activeKPI === "chargebacksTotal") txs = txs.filter((t: any) => t.type === "CHARGEBACK")
    else if (activeKPI === "pending") txs = txs.filter((t: any) => t.status === "PENDING")
    else if (activeKPI === "grossRevenue" || activeKPI === "netRevenue")
      txs = txs.filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED")
    return txs
  }, [report?.transactions, activeKPI])

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted rounded" />
        ))}
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load financial data. Please try again.
      </div>
    )
  }

  const summary = report.summary || {}

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Financial Reporting</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Financial Reporting</h1>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setRange(r.value)
                setCustomFrom("")
                setCustomTo("")
              }}
            >
              {r.label}
            </Button>
          ))}
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value)
              setRange("custom")
            }}
            className="w-36"
            placeholder="From"
          />
          <Input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value)
              setRange("custom")
            }}
            className="w-36"
            placeholder="To"
          />
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleReconcile}>
            Reconcile Stripe
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(KPI_LABELS) as KPIKey[]).map((key) => {
          const kpi = summary[key] || { value: 0, change: 0 }
          const isCurrency = key !== "totalTransactions"
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                activeKPI === key ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setActiveKPI(activeKPI === key ? null : key)}
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {KPI_LABELS[key]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {isCurrency ? formatCurrency(kpi.value) : kpi.value.toLocaleString()}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    kpi.change > 0 ? "text-green-600" : kpi.change < 0 ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {kpi.change > 0 ? "+" : ""}
                  {kpi.change}% vs prior period
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs: Overview / Commissions / Refinance / Reconciliation */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commissions">Commissions &amp; Payouts</TabsTrigger>
          <TabsTrigger value="refinance">Refinance</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.revenueBreakdown || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(report.revenueBreakdown || []).map((_: any, i: number) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Revenue Trend</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={chartToggle === "gross" ? "default" : "outline"}
                    onClick={() => setChartToggle("gross")}
                  >
                    Gross
                  </Button>
                  <Button
                    size="sm"
                    variant={chartToggle === "net" ? "default" : "outline"}
                    onClick={() => setChartToggle("net")}
                  >
                    Net
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.revenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    {chartToggle === "gross" && (
                      <Line type="monotone" dataKey="gross" stroke="#3b82f6" name="Gross Revenue" />
                    )}
                    {chartToggle === "net" && (
                      <Line type="monotone" dataKey="net" stroke="#10b981" name="Net Revenue" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Transactions</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="REFUND">Refund</option>
                    <option value="CHARGEBACK">Chargeback</option>
                    <option value="PAYOUT">Payout</option>
                  </select>
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="SUCCEEDED">Succeeded</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <Input
                    placeholder="Search email, name, Stripe ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {TX_COLUMNS.map((col) => (
                        <th key={col} className="text-left py-2 px-3 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                      <th className="text-left py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx: any) => (
                      <tr
                        key={tx.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          {tx.date
                            ? new Date(tx.date).toLocaleDateString()
                            : tx.createdAt
                            ? new Date(tx.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              tx.type === "PAYMENT"
                                ? "default"
                                : tx.type === "REFUND"
                                ? "secondary"
                                : tx.type === "CHARGEBACK"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              tx.status === "SUCCEEDED"
                                ? "default"
                                : tx.status === "PENDING"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{formatCurrency(tx.grossAmount)}</td>
                        <td className="py-2 px-3">{formatCurrency(tx.stripeFee)}</td>
                        <td className="py-2 px-3">{formatCurrency(tx.platformFee)}</td>
                        <td className="py-2 px-3 font-medium">{formatCurrency(tx.netAmount)}</td>
                        <td className="py-2 px-3 text-xs">
                          {tx.userType && (
                            <span className="capitalize">{tx.userType?.toLowerCase()}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs font-mono">
                          {tx.dealId ? tx.dealId.slice(0, 8) : tx.refinanceId ? `refi:${tx.refinanceId.slice(0, 6)}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-xs font-mono">
                          {tx.stripePaymentIntentId ? tx.stripePaymentIntentId.slice(0, 14) + "…" : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-muted-foreground">
                          No transactions found for selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- COMMISSIONS & PAYOUTS TAB --- */}
        <TabsContent value="commissions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Accrued Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.affiliateCommissionsAccrued?.value || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Paid Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.affiliateCommissionsPaid?.value || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    (summary.affiliateCommissionsAccrued?.value || 0) -
                      (summary.affiliateCommissionsPaid?.value || 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Dealer Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.dealerFeesCollected?.value || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Total dealer fees collected in this period
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- REFINANCE TAB --- */}
        <TabsContent value="refinance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Refinance Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.refinanceRevenue?.value || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.refinanceRevenue?.value === 0
                    ? "No monetized refinance payments yet — tracking operational metrics"
                    : `${summary.refinanceRevenue?.change > 0 ? "+" : ""}${summary.refinanceRevenue?.change}% vs prior period`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.refinanceRevenue?.value === 0 ? (
                  <Badge variant="outline">Non-monetized</Badge>
                ) : (
                  <Badge>Active Revenue</Badge>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  See{" "}
                  <a href="/admin/refinance" className="underline">
                    Refinance Management
                  </a>{" "}
                  for detailed lead tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- RECONCILIATION TAB --- */}
        <TabsContent value="reconciliation" className="space-y-6">
          {recon ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Stripe Totals (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Gross</span>
                      <span className="font-mono">{formatCurrency(recon.stripe?.gross || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refunds</span>
                      <span className="font-mono">{formatCurrency(recon.stripe?.refunds || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chargebacks</span>
                      <span className="font-mono">
                        {formatCurrency(recon.stripe?.chargebacks || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Database Totals (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Gross</span>
                      <span className="font-mono">{formatCurrency(recon.db?.gross || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refunds</span>
                      <span className="font-mono">{formatCurrency(recon.db?.refunds || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chargebacks</span>
                      <span className="font-mono">{formatCurrency(recon.db?.chargebacks || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Reconciliation Status</CardTitle>
                  <Badge variant={recon.status === "RECONCILED" ? "default" : "destructive"}>
                    {recon.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Missing in DB: {recon.missingInDb?.length || 0}</p>
                  <p>Missing in Stripe: {recon.missingInStripe?.length || 0}</p>
                  <p>Mismatched totals: {recon.mismatches?.length || 0}</p>
                  {recon.reconciledAt && (
                    <p className="text-xs text-muted-foreground">
                      Last reconciled: {new Date(recon.reconciledAt).toLocaleString()}
                    </p>
                  )}
                  <Button size="sm" onClick={handleSyncStripe} className="mt-2">
                    Sync Stripe Data
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Loading reconciliation data…
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedTx(null)}>
          <div
            className="w-full max-w-lg bg-background shadow-xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Transaction Detail</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTx(null)}>
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="font-mono text-sm">{selectedTx.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge>{selectedTx.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedTx.status === "SUCCEEDED" ? "default" : "outline"}>
                    {selectedTx.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Gross Amount</p>
                  <p className="font-bold">{formatCurrency(selectedTx.grossAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Amount</p>
                  <p className="font-bold">{formatCurrency(selectedTx.netAmount)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Stripe Fee</p>
                  <p>{formatCurrency(selectedTx.stripeFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Platform Fee</p>
                  <p>{formatCurrency(selectedTx.platformFee)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="uppercase">{selectedTx.currency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p>
                  {selectedTx.userId || "—"}{" "}
                  {selectedTx.userType && (
                    <span className="text-xs text-muted-foreground">({selectedTx.userType})</span>
                  )}
                </p>
              </div>
              {selectedTx.dealId && (
                <div>
                  <p className="text-xs text-muted-foreground">Related Deal</p>
                  <a href={`/admin/deals/${selectedTx.dealId}`} className="text-sm underline">
                    {selectedTx.dealId}
                  </a>
                </div>
              )}
              {selectedTx.refinanceId && (
                <div>
                  <p className="text-xs text-muted-foreground">Related Refinance</p>
                  <a href={`/admin/refinance/${selectedTx.refinanceId}`} className="text-sm underline">
                    {selectedTx.refinanceId}
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Stripe PaymentIntent</p>
                <p className="font-mono text-xs">{selectedTx.stripePaymentIntentId || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">
                  {selectedTx.createdAt
                    ? new Date(selectedTx.createdAt).toLocaleString()
                    : selectedTx.date
                    ? new Date(selectedTx.date).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
