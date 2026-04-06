"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Clock, CheckCircle2, AlertCircle, DollarSign, FileText, ArrowRight } from "lucide-react"

interface Payment {
  id: string
  amount: number
  status: string
  type: string
  description: string | null
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Completed", variant: "default" },
  PENDING: { label: "Pending", variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "secondary" },
  FAILED: { label: "Failed", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "outline" },
}

export default function DealPaymentPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [dealStatus, setDealStatus] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/deal/payments")
      const data = await res.json()
      setPayments(data?.data?.payments || data?.payments || [])
      setDealStatus(data?.data?.dealStatus || data?.dealStatus || null)
    } catch {
      // Empty state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="payment-loading">
        <h1 className="text-2xl font-semibold tracking-tight">Payment</h1>
        <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="deal-payment-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payments for your vehicle purchase.
        </p>
      </div>

      {!dealStatus || dealStatus === "NO_DEAL" ? (
        <Card className="border-dashed" data-testid="no-deal-empty">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No active deal</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Payment options will appear here once you have an active deal with a dealer. Browse vehicles and make an offer to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  payments.map((payment) => {
                    const config = STATUS_MAP[payment.status] || STATUS_MAP.PENDING
                    return (
                      <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-muted p-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{payment.description || payment.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">${(payment.amount / 100).toLocaleString()}</span>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
