"use client"
import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, CreditCard, Receipt, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerPaymentsPage() {
  const { data, isLoading, error } = useSWR("/api/dealer/payments", fetcher)
  const [paying, setPaying] = useState(false)
  const { toast } = useToast()

  const handlePayNow = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/dealer/payments/checkout", {
        method: "POST",
        headers: csrfHeaders(),
      })
      const result = await res.json()
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error(result.error || "Unable to initiate payment")
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: err.message || "Unable to initiate payment. Please try again.",
      })
    } finally {
      setPaying(false)
    }
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load payments</h2>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    )
  }

  const payments = data?.data || []
  const outstanding = payments.filter((p: any) => p.status === "DUE" || p.status === "PENDING" || p.status === "OVERDUE")
  const paid = payments.filter((p: any) => p.status === "PAID")
  const totalDue = outstanding.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments & Fees</h1>
        <p className="text-muted-foreground">View your payment history and outstanding fees</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalDue)}</div>
                <div className="text-sm text-muted-foreground">Total Due Now</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Receipt className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{outstanding.length}</div>
                <div className="text-sm text-muted-foreground">Outstanding Fees</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#7ED321]/10">
                <CreditCard className="h-6 w-6 text-[#7ED321]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{paid.length}</div>
                <div className="text-sm text-muted-foreground">Payments Made</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Now */}
      {totalDue > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <DollarSign className="h-5 w-5" />
              Outstanding Balance: {formatCurrency(totalDue)}
            </CardTitle>
            <CardDescription>Pay your outstanding fees to keep your account in good standing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePayNow}
              disabled={paying}
              className="bg-primary hover:bg-primary/90"
            >
              {paying ? "Processing..." : `Pay Now — ${formatCurrency(totalDue)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Fees */}
      {outstanding.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Outstanding Fees</h2>
          {outstanding.map((payment: any) => {
            const statusColors: Record<string, string> = {
              DUE: "bg-red-100 text-red-800",
              PENDING: "bg-yellow-100 text-yellow-800",
              OVERDUE: "bg-red-100 text-red-800",
            }
            return (
              <Card key={payment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {payment.description}
                    </CardTitle>
                    <Badge className={statusColors[payment.status] || "bg-muted"}>{payment.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatCurrency(payment.amount)}</p></div>
                    <div><p className="text-muted-foreground">Due Date</p><p className="font-medium">{new Date(payment.dueDate).toLocaleDateString()}</p></div>
                    <div><p className="text-muted-foreground">Fee Type</p><p className="font-medium">{payment.feeType || "Service Fee"}</p></div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Payment History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payment History</h2>
        {paid.length > 0 ? (
          paid.map((payment: any) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {payment.description}
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-800">PAID</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatCurrency(payment.amount)}</p></div>
                  {payment.paidAt && <div><p className="text-muted-foreground">Paid On</p><p className="font-medium">{new Date(payment.paidAt).toLocaleDateString()}</p></div>}
                  <div><p className="text-muted-foreground">Fee Type</p><p className="font-medium">{payment.feeType || "Service Fee"}</p></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payment history</h3>
              <p className="text-muted-foreground">Your completed payments will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
