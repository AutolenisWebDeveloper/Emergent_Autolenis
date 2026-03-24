"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function OperationsReportPage() {
  const { data, isLoading } = useSWR("/api/admin/reports/operations", fetcher)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded" />
        ))}
      </div>
    )
  }

  const report = data?.data || { summary: {}, lifecycle: [], payments: {}, financing: {} }

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
            <BreadcrumbPage>Operations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Operations Report</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary?.totalAuctions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary?.totalBids || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Bid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${((report.summary?.avgBid || 0) / 100).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Close</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary?.avgDaysToClose || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.lifecycle?.map((item: any) => (
                <div key={item.label} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">Status: {item.status}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments & Financing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Deposit Status</p>
              <p className="text-lg font-semibold">{report.payments?.deposit?.status || "—"}</p>
              <p className="text-sm text-muted-foreground">
                ${(report.payments?.deposit?.amountCents || 0) / 100} held in escrow
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fees Paid</p>
              <p className="text-lg font-semibold">${(report.payments?.fees?.amountCents || 0) / 100}</p>
              <p className="text-sm text-muted-foreground">Escrow: {report.payments?.escrowStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Financing</p>
              <p className="text-lg font-semibold">{report.financing?.lender || "—"}</p>
              <p className="text-sm text-muted-foreground">
                {report.financing?.apr}% APR · {report.financing?.term} months
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
