"use client"

import { use, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AlertCircle } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDealBillingPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/deals/${dealId}/billing`, fetcher)
  const [processing, setProcessing] = useState<string | null>(null)

  const handleMarkReceived = async (paymentRequestId: string) => {
    setProcessing(paymentRequestId)
    await fetch("/api/admin/payments/mark-received", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ paymentRequestId }),
    })
    await mutate()
    setProcessing(null)
  }

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
        <h2 className="text-xl font-semibold">Failed to load billing data</h2>
      </div>
    )
  }

  const billing = data.data

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
            <BreadcrumbPage>Billing</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Deal Billing — {dealId}</h1>

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
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {billing.ledger.map((entry: any) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{entry.id}</td>
                    <td className="py-2 px-3 capitalize">{entry.type}</td>
                    <td className="py-2 px-3">${(entry.amount / 100).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{entry.status}</Badge>
                    </td>
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

      <Card>
        <CardHeader>
          <CardTitle>Buyer Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Request</th>
                  <th className="text-left py-2 px-3 font-medium">Reason</th>
                  <th className="text-left py-2 px-3 font-medium">Amount</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Requested</th>
                  <th className="text-left py-2 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {billing.paymentRequests.map((request: any) => (
                  <tr key={request.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{request.id}</td>
                    <td className="py-2 px-3">{request.reason}</td>
                    <td className="py-2 px-3">${(request.amountCents / 100).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{request.status}</Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      {request.status === "REQUESTED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing === request.id}
                          onClick={() => handleMarkReceived(request.id)}
                        >
                          {processing === request.id ? "Marking…" : "Mark Received"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
