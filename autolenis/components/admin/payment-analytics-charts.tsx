"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

interface PaymentAnalyticsChartsProps {
  deposits: any[]
  serviceFees: any[]
}

export function PaymentAnalyticsCharts({ deposits, serviceFees }: PaymentAnalyticsChartsProps) {
  // Process data for charts
  const getLast30DaysData = () => {
    const days: Record<string, { date: string; deposits: number; fees: number; total: number }> = {}
    const now = new Date()

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split("T")[0]
      if (key) {
        days[key] = {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          deposits: 0,
          fees: 0,
          total: 0,
        }
      }
    }

    // Add deposit data
    deposits.forEach((d: any) => {
      if (d.status === "PAID" || d.status === "SUCCEEDED") {
        const key = new Date(d.createdAt).toISOString().split("T")[0]
        if (key && days[key]) {
          const amount = (d.amountCents || d.amount_cents || 9900) / 100
          days[key].deposits += amount
          days[key].total += amount
        }
      }
    })

    // Add fee data
    serviceFees.forEach((f: any) => {
      if (f.status === "PAID") {
        const key = new Date(f.createdAt).toISOString().split("T")[0]
        if (key && days[key]) {
          const amount = (f.remainingCents || f.remaining_cents || 0) / 100
          days[key].fees += amount
          days[key].total += amount
        }
      }
    })

    return Object.values(days)
  }

  const getPaymentMethodData = () => {
    const methods: Record<string, number> = {
      "Card Payment": 0,
      "Loan Included": 0,
    }

    serviceFees.forEach((f: any) => {
      if (f.status === "PAID") {
        const amount = (f.remainingCents || f.remaining_cents || 0) / 100
        if (f.method === "CARD_DIRECT") {
          const key = "Card Payment"
          methods[key] = (methods[key] || 0) + amount
        } else if (f.method === "LENDER_DIRECT") {
          const key = "Loan Included"
          methods[key] = (methods[key] || 0) + amount
        }
      }
    })

    return Object.entries(methods)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
  }

  const getStatusBreakdown = () => {
    const statuses: Record<string, number> = {
      Paid: 0,
      Pending: 0,
      Refunded: 0,
      Failed: 0,
    }

    deposits.forEach((d: any) => {
      const key = d.status === "PAID" || d.status === "SUCCEEDED" ? 'Paid' 
        : d.status === "PENDING" ? 'Pending'
        : d.status === "REFUNDED" ? 'Refunded'
        : d.status === "FAILED" ? 'Failed' : null
      if (key) statuses[key] = (statuses[key] || 0) + 1
    })

    serviceFees.forEach((f: any) => {
      const key = f.status === "PAID" ? 'Paid'
        : f.status === "PENDING" ? 'Pending'
        : f.status === "REFUNDED" ? 'Refunded'
        : f.status === "FAILED" ? 'Failed' : null
      if (key) statuses[key] = (statuses[key] || 0) + 1
    })

    return Object.entries(statuses)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
  }

  const dailyData = getLast30DaysData()
  const methodData = getPaymentMethodData()
  const statusData = getStatusBreakdown()

  const COLORS = ["hsl(var(--primary))", "#7C3AED", "#A78BFA", "#C4B5FD"]
  const STATUS_COLORS: Record<string, string> = {
    Paid: "#22C55E",
    Pending: "#EAB308",
    Refunded: "#6B7280",
    Failed: "#EF4444",
  }

  const chartConfig = {
    deposits: { label: "Deposits", color: "#22C55E" },
    fees: { label: "Concierge Fees", color: "hsl(var(--primary))" },
    total: { label: "Total", color: "#7C3AED" },
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Revenue Trend Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
          <CardDescription>Daily breakdown of deposits and concierge fees</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />}
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stackId="1"
                  stroke="#22C55E"
                  fill="url(#colorDeposits)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="fees"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorFees)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
          <CardDescription>Overall payment status distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS[0]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      {methodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Methods</CardTitle>
            <CardDescription>How concierge fees are collected</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card className={methodData.length > 0 ? "" : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Key payment metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Avg. Daily Revenue</span>
            <span className="font-semibold">
              ${(dailyData.reduce((sum, d) => sum + d.total, 0) / 30).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Transactions</span>
            <span className="font-semibold">{deposits.length + serviceFees.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-semibold text-green-600">
              {(
                ((deposits.filter((d: any) => d.status === "PAID" || d.status === "SUCCEEDED").length +
                  serviceFees.filter((f: any) => f.status === "PAID").length) /
                  Math.max(deposits.length + serviceFees.length, 1)) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Refund Rate</span>
            <span className="font-semibold text-amber-600">
              {(
                ((deposits.filter((d: any) => d.status === "REFUNDED").length +
                  serviceFees.filter((f: any) => f.status === "REFUNDED").length) /
                  Math.max(deposits.length + serviceFees.length, 1)) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Avg. Transaction Size</span>
            <span className="font-semibold">
              $
              {(
                (deposits
                  .filter((d: any) => d.status === "PAID" || d.status === "SUCCEEDED")
                  .reduce((sum: number, d: any) => sum + (d.amountCents || d.amount_cents || 0), 0) +
                  serviceFees
                    .filter((f: any) => f.status === "PAID")
                    .reduce((sum: number, f: any) => sum + (f.remainingCents || f.remaining_cents || 0), 0)) /
                Math.max(
                  deposits.filter((d: any) => d.status === "PAID" || d.status === "SUCCEEDED").length +
                    serviceFees.filter((f: any) => f.status === "PAID").length,
                  1,
                ) /
                100
              ).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
