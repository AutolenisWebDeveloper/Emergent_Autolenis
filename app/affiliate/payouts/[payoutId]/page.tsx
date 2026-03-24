"use client"
import { use } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AffiliatePayoutDetailPage({ params }: { params: Promise<{ payoutId: string }> }) {
  const { payoutId } = use(params)
  const { data, isLoading } = useSWR("/api/affiliate/payouts", fetcher)

  if (isLoading) return <div className="animate-pulse"><div className="h-64 bg-muted rounded" /></div>

  const payout = data?.data?.find((p: any) => p.id === payoutId)
  
  if (!payout) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Payout not found</h2>
        <p className="text-muted-foreground">This payout does not exist or you don't have access to it.</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    SENT: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    FAILED: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/affiliate/portal/payouts">Payouts</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{payoutId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payout Details</h1>
        <Badge className={statusColors[payout.status]}>{payout.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payout Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Payout ID</p><p className="font-medium">{payout.id}</p></div>
            <div><p className="text-sm text-muted-foreground">Amount</p><p className="font-medium text-2xl flex items-center gap-1"><DollarSign className="h-5 w-5" />${(payout.amount / 100).toLocaleString()}</p></div>
            <div><p className="text-sm text-muted-foreground">Commissions Included</p><p className="font-medium">{payout.commissionCount} commissions</p></div>
            <div><p className="text-sm text-muted-foreground">Payment Method</p><p className="font-medium">{payout.method.replace("_", " ")}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 pb-3 border-b">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Requested</p>
                <p className="text-sm text-muted-foreground">{new Date(payout.requestedAt).toLocaleString()}</p>
              </div>
            </div>
            {payout.sentAt && (
              <div className="flex gap-3 pb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">Sent</p>
                  <p className="text-sm text-muted-foreground">{new Date(payout.sentAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
