"use client"

import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDealRefundsPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, error, isLoading } = useSWR(`/api/admin/deals/${dealId}/refunds`, fetcher)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-48 bg-muted rounded" />
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Failed to load refund data</h2>
      </div>
    )
  }

  const refunds = data.data?.refunds || []

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/deals/${dealId}`}>{dealId}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Refunds</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Deal Refunds — {dealId}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Refund</th>
                  <th className="text-left py-2 px-3 font-medium">Reason</th>
                  <th className="text-left py-2 px-3 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund: any) => (
                  <tr key={refund.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{refund.id}</td>
                    <td className="py-2 px-3">{refund.reason}</td>
                    <td className="py-2 px-3">${(refund.amountCents / 100).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{refund.status}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(refund.createdAt).toLocaleDateString()}
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
