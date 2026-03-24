"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FinanceReportPage() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const queryString = params.toString()
    return `/api/admin/reports/finance${queryString ? `?${queryString}` : ""}`
  }, [from, to])

  const { data, isLoading } = useSWR(query, fetcher)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded" />
        ))}
      </div>
    )
  }

  const report = data?.data || { summary: {}, ledger: [] }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format((amount || 0) / 100)

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/reports">Reports</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Finance</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deposits Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.depositsReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Buyer Payments Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.buyerPaymentsRequested)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Buyer Payments Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.buyerPaymentsReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.platformFees)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Affiliate Payouts (Pending)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.affiliatePayoutsPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Affiliate Payouts (Paid)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.affiliatePayoutsPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dealer Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.dealerPayouts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.refunds)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(report.summary.netRevenue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Entry</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 font-medium">Deal</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {report.ledger.map((entry: any) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{entry.id}</td>
                    <td className="py-2 px-3 capitalize">{entry.type}</td>
                    <td className="py-2 px-3">{formatCurrency(entry.amount)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{entry.dealId}</td>
                    <td className="py-2 px-3">{entry.status}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
