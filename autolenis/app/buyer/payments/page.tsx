"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Card, CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, CreditCard, ArrowRight, Receipt} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BuyerPaymentsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/buyer/payments", fetcher)

  const deposits = data?.deposits || []
  const serviceFees = data?.serviceFees || []
  const allPayments = [...deposits, ...serviceFees].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const totalPaid = allPayments
    .filter((p) => p.status === "COMPLETED" || p.status === "PENDING")
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <PageHeader title="Payments" subtitle="Manage your payments and transactions" />
          <LoadingSkeleton variant="cards" count={4} />
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <PageHeader title="Payments" subtitle="Manage your payments and transactions" />
          <ErrorState message="Failed to load payments" onRetry={() => mutate()} />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          subtitle="Manage your payments and transactions"
        />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7ED321]/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#7ED321]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(totalPaid / 100).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#0066FF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deposits.length}</p>
                  <p className="text-sm text-muted-foreground">Deposits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{serviceFees.length}</p>
                  <p className="text-sm text-muted-foreground">Service Fees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment List */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="fees">Service Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {allPayments.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="h-8 w-8 text-muted-foreground" />}
                title="No payments yet"
                description="Your payment history will appear here once you make your first deposit."
                primaryCta={{ label: "Pay Deposit", href: "/buyer/billing" }}
              />
            ) : (
              <div className="space-y-4">
                {allPayments.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {payment.type === "DEPOSIT" ? (
                              <CreditCard className="h-5 w-5" />
                            ) : (
                              <Receipt className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {payment.type === "DEPOSIT" ? "Refundable Deposit" : "Concierge Fee"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusPill status={payment.status?.toLowerCase() || "pending"} />
                          <p className="font-semibold">
                            ${((payment.amount || 0) / 100).toLocaleString()}
                          </p>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/buyer/payments/${payment.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deposits" className="mt-6">
            {deposits.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
                title="No deposits"
                description="Pay a refundable deposit to start your car buying journey."
                primaryCta={{ label: "Pay Deposit", href: "/buyer/billing" }}
              />
            ) : (
              <div className="space-y-4">
                {deposits.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#7ED321]/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-[#7ED321]" />
                          </div>
                          <div>
                            <p className="font-medium">Refundable Deposit</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusPill status={payment.status?.toLowerCase() || "pending"} />
                          <p className="font-semibold">${((payment.amount || 0) / 100).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            {serviceFees.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
                title="No service fees"
                description="Concierge fee payments will appear here."
              />
            ) : (
              <div className="space-y-4">
                {serviceFees.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Concierge Fee</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusPill status={payment.status?.toLowerCase() || "pending"} />
                          <p className="font-semibold">${((payment.amount || 0) / 100).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
