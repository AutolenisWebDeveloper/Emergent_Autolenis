"use client"

import { useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, ArrowLeft, Eye, RefreshCw } from "lucide-react"
import Link from "next/link"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminAffiliatePaymentsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/affiliates/payments", fetcher, {
    refreshInterval: 30000,
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showInitiate, setShowInitiate] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [form, setForm] = useState({
    affiliateId: "",
    amount: "",
    method: "BANK_TRANSFER",
  })
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "INITIATED":
        return <Badge className="bg-blue-100 text-blue-800">Initiated</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "PROCESSING":
        return <Badge className="bg-purple-100 text-purple-800">Processing</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "CANCELLED":
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSubmit = async () => {
    if (!form.affiliateId || !form.amount || Number(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Affiliate ID and a positive amount are required" })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/affiliates/payments/initiate", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          affiliateId: form.affiliateId,
          amount: Math.round(Number(form.amount) * 100),
          method: form.method,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast({ title: "Payment initiated", description: "The affiliate payment has been initiated." })
      setShowInitiate(false)
      setForm({ affiliateId: "", amount: "", method: "BANK_TRANSFER" })
      mutate()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message })
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

  const payments = data?.payments || []
  const filtered = payments.filter((p: any) => {
    const matchesSearch =
      !searchTerm ||
      (p.affiliate?.user?.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.affiliate?.user?.firstName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.affiliate?.user?.lastName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.affiliate?.referralCode || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPaid = payments
    .filter((p: any) => p.status === "COMPLETED" || p.status === "PAID")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  const totalPending = payments
    .filter((p: any) => p.status === "PENDING" || p.status === "INITIATED" || p.status === "PROCESSING")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/payments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Affiliate Payments</h1>
            <p className="text-muted-foreground">Manage affiliate commission payments and payouts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowInitiate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Initiate Payment
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load affiliate payments. Please retry.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter((p: any) => p.status === "COMPLETED" || p.status === "PAID").length} completed payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending / Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter((p: any) => ["PENDING", "INITIATED", "PROCESSING"].includes(p.status)).length} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time affiliate payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by affiliate name, email, or referral code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="INITIATED">Initiated</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Affiliate Payment Records</CardTitle>
          <CardDescription>Commission payments issued to affiliates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Affiliate</th>
                  <th className="text-left py-3 px-4 font-medium">Referral Code</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Method</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Created</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {item.affiliate?.user
                          ? `${item.affiliate.user.firstName || ""} ${item.affiliate.user.lastName || ""}`.trim() || "N/A"
                          : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">{item.affiliate?.user?.email || ""}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{item.affiliate?.referralCode || "—"}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4 text-sm">{(item.method || "").replace(/_/g, " ")}</td>
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(item.createdAt)}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" onClick={() => setDetailItem(item)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No matching affiliate payments found"
                  : "No affiliate payments yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initiate Payment Dialog */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Affiliate Payment</DialogTitle>
            <DialogDescription>Create a new commission payment for an affiliate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="aff-id">Affiliate ID *</Label>
              <Input
                id="aff-id"
                placeholder="Enter affiliate ID"
                value={form.affiliateId}
                onChange={(e) => setForm({ ...form, affiliateId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="aff-amount">Amount ($) *</Label>
              <Input
                id="aff-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="150.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="aff-method">Payment Method *</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger id="aff-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing ? "Submitting..." : "Initiate Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{detailItem.id}</span>
                <span className="text-muted-foreground">Affiliate:</span>
                <span>
                  {detailItem.affiliate?.user
                    ? `${detailItem.affiliate.user.firstName || ""} ${detailItem.affiliate.user.lastName || ""}`.trim()
                    : detailItem.affiliateId}
                </span>
                <span className="text-muted-foreground">Email:</span>
                <span>{detailItem.affiliate?.user?.email || "—"}</span>
                <span className="text-muted-foreground">Referral Code:</span>
                <span className="font-mono">{detailItem.affiliate?.referralCode || "—"}</span>
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{formatCurrency(detailItem.amount)}</span>
                <span className="text-muted-foreground">Method:</span>
                <span>{(detailItem.method || "").replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">Status:</span>
                <span>{getStatusBadge(detailItem.status)}</span>
                <span className="text-muted-foreground">External Ref:</span>
                <span className="font-mono">{detailItem.externalTransactionId || "—"}</span>
                <span className="text-muted-foreground">Paid At:</span>
                <span>{detailItem.paidAt ? formatDate(detailItem.paidAt) : "—"}</span>
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(detailItem.createdAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
