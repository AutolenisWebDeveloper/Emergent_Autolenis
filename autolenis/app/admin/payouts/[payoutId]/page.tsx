"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, DollarSign } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminPayoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const payoutId = params.payoutId as string
  const { data, error, isLoading } = useSWR(`/api/admin/payouts/${payoutId}`, fetcher)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data?.payout) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load payout details.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const payout = data.payout

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Payout Details</h1>
          <p className="text-muted-foreground font-mono text-sm">{payoutId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Payout Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge>{payout.status || "PENDING"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-medium">${((payout.amount || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Affiliate</span>
            <span className="text-sm">{payout.affiliateId}</span>
          </div>
          {payout.reference && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reference</span>
              <span className="text-sm">{payout.reference}</span>
            </div>
          )}
          {payout.createdAt && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{new Date(payout.createdAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
