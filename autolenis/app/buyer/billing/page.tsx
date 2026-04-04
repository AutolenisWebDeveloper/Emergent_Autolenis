"use client"
import useSWR from "swr"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, DollarSign, CheckCircle2, Clock, XCircle, RefreshCw, Receipt } from "lucide-react"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BuyerBillingPage() {
  const { data, isLoading, mutate } = useSWR("/api/buyer/billing", fetcher, {
    refreshInterval: 30000,
  })

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

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProtectedRoute>
    )
  }

  const deposits = data?.data?.deposits || []
  const serviceFees = data?.data?.serviceFees || []

  // Calculate totals
  const totalPaid = [...deposits, ...serviceFees]
    .filter((p: any) => p.status === "PAID" || p.status === "SUCCEEDED")
    .reduce(
      (sum: number, p: any) => sum + (p.amountCents || p.amount_cents || p.remainingCents || p.remaining_cents || 0),
      0,
    )

  const depositStatus = deposits.find((d: any) => d.status === "PAID" || d.status === "SUCCEEDED")
    ? "PAID"
    : deposits.find((d: any) => d.status === "PENDING")
      ? "PENDING"
      : "NOT_PAID"

  const feeStatus = serviceFees.find((f: any) => f.status === "PAID")
    ? "PAID"
    : serviceFees.find((f: any) => f.status === "PENDING")
      ? "PENDING"
      : "NOT_PAID"

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Payments</h1>
            <p className="text-muted-foreground">View your payment history and manage billing</p>
          </div>
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">Across all transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposit Status</CardTitle>
              {depositStatus === "PAID" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : depositStatus === "PENDING" ? (
                <Clock className="h-4 w-4 text-yellow-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {depositStatus === "PAID" ? "Paid" : depositStatus === "PENDING" ? "Pending" : "Not Paid"}
              </div>
              <p className="text-xs text-muted-foreground">$99 refundable deposit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concierge Fee</CardTitle>
              {feeStatus === "PAID" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : feeStatus === "PENDING" ? (
                <Clock className="h-4 w-4 text-yellow-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {feeStatus === "PAID" ? "Paid" : feeStatus === "PENDING" ? "Pending" : "Not Started"}
              </div>
              <p className="text-xs text-muted-foreground">$499 Premium concierge fee (Free plan: no cost)</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>All your AutoLenis transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="fees">Concierge Fees</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-4">
                  {[
                    ...deposits.map((d: any) => ({ ...d, type: "DEPOSIT" })),
                    ...serviceFees.map((f: any) => ({ ...f, type: "SERVICE_FEE" })),
                  ]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            {payment.type === "DEPOSIT" ? (
                              <DollarSign className="h-5 w-5 text-primary" />
                            ) : (
                              <CreditCard className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {payment.type === "DEPOSIT" ? "Auction Deposit" : "Concierge Fee"}
                            </p>
                            <p className="text-sm text-muted-foreground">{formatDate(payment.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(payment.status)}
                          <span className="font-semibold">
                            {formatCurrency(
                              payment.amountCents ||
                                payment.amount_cents ||
                                payment.remainingCents ||
                                payment.remaining_cents ||
                                0,
                            )}
                          </span>
                        </div>
                      </div>
                    ))}

                  {deposits.length === 0 && serviceFees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No payment history yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="deposits" className="mt-4">
                <div className="space-y-4">
                  {deposits.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Auction Deposit</p>
                          <p className="text-sm text-muted-foreground">{formatDate(payment.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(payment.status)}
                        <span className="font-semibold">
                          {formatCurrency(payment.amountCents || payment.amount_cents || 9900)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {deposits.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No deposit payments</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="fees" className="mt-4">
                <div className="space-y-4">
                  {serviceFees.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Concierge Fee</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.createdAt)}
                            {payment.method && (
                              <span className="ml-2">
                                ({payment.method === "CARD_DIRECT" ? "Card" : "Loan Inclusion"})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(payment.status)}
                        <div className="text-right">
                          <span className="font-semibold">
                            {formatCurrency(payment.remainingCents || payment.remaining_cents || 0)}
                          </span>
                          {(payment.depositAppliedCents || payment.deposit_applied_cents) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Deposit applied:{" "}
                              {formatCurrency(payment.depositAppliedCents || payment.deposit_applied_cents)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {serviceFees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No concierge fee payments</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Fee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Understanding Your Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-[#7ED321]" />
                  Deposit ($99)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Refundable deposit to start your vehicle auction. Applied toward your concierge fee when you complete
                  a purchase.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-[#0066FF]" />
                  Concierge Fee ($499 Premium)
                </h4>
                <p className="text-sm text-muted-foreground">
                  One-time fee for the Premium concierge plan. Your $99 Serious Buyer Deposit is credited toward this
                  fee ($400 remaining).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
