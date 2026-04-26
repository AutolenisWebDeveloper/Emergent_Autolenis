"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, DollarSign, Handshake, Gavel } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DealerAnalyticsPage() {
  const { data, isLoading } = useSWR("/api/dealer/dashboard", fetcher, {
    refreshInterval: 60000,
  })

  const stats = data ?? {}

  const kpis = [
    {
      label: "Completed Deals",
      value: isLoading ? "—" : String(stats.completedDeals ?? 0),
      icon: Handshake,
    },
    {
      label: "Total Sales",
      value: isLoading
        ? "—"
        : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
            stats.totalSales ?? 0,
          ),
      icon: DollarSign,
    },
    {
      label: "Active Auctions",
      value: isLoading ? "—" : String(stats.activeAuctions ?? 0),
      icon: Gavel,
    },
    {
      label: "Inventory",
      value: isLoading ? "—" : String(stats.inventory ?? 0),
      icon: BarChart3,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Key performance indicators for your dealership.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Deal Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">This month: </span>
              <span className="font-semibold">
                {isLoading ? "—" : stats.monthlyStats?.thisMonthDeals ?? 0}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Last month: </span>
              <span className="font-semibold">
                {isLoading ? "—" : stats.monthlyStats?.lastMonthDeals ?? 0}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Change: </span>
              <span className="font-semibold">
                {isLoading ? "—" : `${stats.monthlyStats?.dealsChange ?? 0}%`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
