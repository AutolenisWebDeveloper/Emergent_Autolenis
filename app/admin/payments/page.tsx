"use client"

import { useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, RefreshCw, CreditCard, Undo2, Search, BarChart3, ArrowRight, Users } from "lucide-react"
import { PaymentAnalyticsCharts } from "@/components/admin/payment-analytics-charts"
import Link from "next/link"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminPaymentsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/payments", fetcher, {
    refreshInterval: 30000,
  })
  const hasError = Boolean(error)
  const [searchTerm, setSearchTerm] = useState("")
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean
    paymentId: string
    type: "deposit" | "service_fee"
    amount: number
  }>({ open: false, paymentId: "", type: "deposit", amount: 0 })
  const [refundReason, setRefundReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
      case "SUCCEEDED":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "REFUNDED":
        return <Badge className="bg-muted text-gray-800">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for the refund",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/payments/refund", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          paymentId: refundDialog.paymentId,
          type: refundDialog.type,
          reason: refundReason,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Refund processed",
        description: `Successfully refunded ${formatCurrency(refundDialog.amount)}`,
      })

      setRefundDialog({ open: false, paymentId: "", type: "deposit", amount: 0 })
      setRefundReason("")
      mutate()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Refund failed",
        description: error.message,
      })
    } finally {
      setProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const deposits = data?.data?.deposits || []
  const serviceFees = data?.data?.serviceFees || []

  // Calculate totals
  const totalDeposits = deposits
    .filter((d: any) => d.status === "PAID" || d.status === "SUCCEEDED")
    .reduce((sum: number, d: any) => sum + (d.amountCents || d.amount_cents || 0), 0)

  const totalFees = serviceFees
    .filter((f: any) => f.status === "PAID")
    .reduce((sum: number, f: any) => sum + (f.remainingCents || f.remaining_cents || 0), 0)

  const totalRefunded = [
    ...deposits.filter((d: any) => d.status === "REFUNDED"),
    ...serviceFees.filter((f: any) => f.status === "REFUNDED"),
  ].reduce(
    (sum: number, p: any) => sum + (p.amountCents || p.amount_cents || p.remainingCents || p.remaining_cents || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Monitor and manage all platform payments</p>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {hasError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load payments. Please retry.
        </div>
      )}

      {/* Navigation Cards for sub-pages */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/admin/payments/deposits">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {deposits.filter((d: any) => d.status === "PAID" || d.status === "SUCCEEDED").length} paid deposits
              </p>
              <div className="flex items-center text-xs text-primary mt-2 font-medium">
                Manage Deposits <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments/concierge-fees">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concierge Fees</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {serviceFees.filter((f: any) => f.status === "PAID").length} paid fees
              </p>
              <div className="flex items-center text-xs text-primary mt-2 font-medium">
                Manage Concierge Fees <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments/refunds">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refunds</CardTitle>
              <Undo2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunded)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {deposits.filter((d: any) => d.status === "REFUNDED").length +
                  serviceFees.filter((f: any) => f.status === "REFUNDED").length}{" "}
                refunds
              </p>
              <div className="flex items-center text-xs text-primary mt-2 font-medium">
                Manage Refunds <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments/affiliate-payments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affiliate Payments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">—</div>
              <p className="text-xs text-muted-foreground mt-1">
                Commission payments to affiliates
              </p>
              <div className="flex items-center text-xs text-primary mt-2 font-medium">
                Manage Affiliate Payments <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by buyer name or deal ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payment Tables */}
      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="deposits">Deposits ({deposits.length})</TabsTrigger>
          <TabsTrigger value="fees">Concierge Fees ({serviceFees.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <PaymentAnalyticsCharts deposits={deposits} serviceFees={serviceFees} />
        </TabsContent>

        <TabsContent value="deposits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Payments</CardTitle>
              <CardDescription>$99 refundable deposits for auctions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">ID</th>
                      <th className="text-left py-3 px-4 font-medium">Buyer</th>
                      <th className="text-left py-3 px-4 font-medium">Auction</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((payment: any) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">{payment.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4">
                          {payment.buyer?.user?.email || payment.buyerId?.slice(0, 8) || "N/A"}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{payment.auctionId?.slice(0, 8) || "N/A"}...</td>
                        <td className="py-3 px-4 font-semibold">
                          {formatCurrency(payment.amountCents || payment.amount_cents || 9900)}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 px-4">
                          {(payment.status === "PAID" || payment.status === "SUCCEEDED") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRefundDialog({
                                  open: true,
                                  paymentId: payment.id,
                                  type: "deposit",
                                  amount: payment.amountCents || payment.amount_cents || 9900,
                                })
                              }
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {deposits.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No deposit payments found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Concierge Fee Payments</CardTitle>
              <CardDescription>$499 Premium concierge fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">ID</th>
                      <th className="text-left py-3 px-4 font-medium">Buyer</th>
                      <th className="text-left py-3 px-4 font-medium">Deal</th>
                      <th className="text-left py-3 px-4 font-medium">Base Fee</th>
                      <th className="text-left py-3 px-4 font-medium">Deposit Credit</th>
                      <th className="text-left py-3 px-4 font-medium">Final Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Method</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceFees.map((payment: any) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">{payment.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4">
                          {payment.deal?.buyer?.user?.email || payment.user_id?.slice(0, 8) || "N/A"}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{payment.dealId?.slice(0, 8) || "N/A"}...</td>
                        <td className="py-3 px-4">
                          {formatCurrency(payment.baseFeeCents || payment.base_fee_cents || 0)}
                        </td>
                        <td className="py-3 px-4 text-green-600">
                          -{formatCurrency(payment.depositAppliedCents || payment.deposit_applied_cents || 0)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {formatCurrency(payment.remainingCents || payment.remaining_cents || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {payment.method === "CARD_DIRECT"
                              ? "Card"
                              : payment.method === "LENDER_DIRECT"
                                ? "Loan"
                                : payment.method || "N/A"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                        <td className="py-3 px-4 text-sm">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {payment.status === "PAID" && payment.method === "CARD_DIRECT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setRefundDialog({
                                    open: true,
                                    paymentId: payment.id,
                                    type: "service_fee",
                                    amount: payment.remainingCents || payment.remaining_cents || 0,
                                  })
                                }
                              >
                                <Undo2 className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {serviceFees.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No service fee payments found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onOpenChange={(open) => !open && setRefundDialog({ ...refundDialog, open: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              You are about to refund {formatCurrency(refundDialog.amount)} for this{" "}
              {refundDialog.type === "deposit" ? "deposit" : "service fee"} payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Refund Reason (Required)</Label>
              <Textarea
                id="reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter the reason for this refund..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog({ ...refundDialog, open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={processing}>
              {processing ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
