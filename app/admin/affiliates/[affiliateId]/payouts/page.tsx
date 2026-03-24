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

export default function AdminAffiliatePayoutsPage({ params }: { params: Promise<{ affiliateId: string }> }) {
  const { affiliateId } = use(params)
  const { data, error, isLoading } = useSWR(`/api/admin/affiliates/${affiliateId}/payouts`, fetcher)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-48 bg-muted rounded" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Failed to load affiliate payouts</h2>
      </div>
    )
  }

  const payouts = data.payouts || []

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/affiliates">Affiliates</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/affiliates/${affiliateId}`}>{affiliateId}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payouts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Affiliate Payouts — {affiliateId}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Payout</th>
                  <th className="text-left py-2 px-3 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Created</th>
                  <th className="text-left py-2 px-3 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout: any) => (
                  <tr key={payout.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{payout.id}</td>
                    <td className="py-2 px-3">${(payout.amountCents / 100).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{payout.status}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString() : "—"}
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
