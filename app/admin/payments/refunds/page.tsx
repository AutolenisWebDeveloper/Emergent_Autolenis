"use client"

import { useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, ArrowLeft, Eye, Undo2 } from "lucide-react"
import Link from "next/link"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminRefundsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/payments/refunds", fetcher, {
    refreshInterval: 30000,
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [showInitiate, setShowInitiate] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [form, setForm] = useState({
    buyerId: "",
    relatedPaymentId: "",
    relatedPaymentType: "manual",
    amount: "",
    reason: "",
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
      case "SUCCEEDED":
        return <Badge className="bg-green-100 text-green-800">Succeeded</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "CANCELLED":
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case "deposit":
        return <Badge variant="outline">Deposit</Badge>
      case "service_fee":
        return <Badge variant="outline">Service Fee</Badge>
      case "deposit_request":
        return <Badge variant="outline">Deposit Request</Badge>
      case "concierge_fee_request":
        return <Badge variant="outline">Concierge Fee</Badge>
      case "manual":
        return <Badge variant="outline">Manual</Badge>
      default:
        return <Badge variant="outline">{type || "—"}</Badge>
    }
  }

  const handleSubmit = async () => {
    if (!form.buyerId || !form.amount || Number(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Buyer and a positive amount are required" })
      return
    }
    if (!form.reason.trim()) {
      toast({ variant: "destructive", title: "Error", description: "A reason is required for refunds" })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/payments/refunds/initiate", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          buyerId: form.buyerId,
          relatedPaymentId: form.relatedPaymentId || undefined,
          relatedPaymentType: form.relatedPaymentType || "manual",
          amount: Math.round(Number(form.amount) * 100),
          reason: form.reason,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast({ title: "Refund initiated", description: "The buyer will be notified." })
      setShowInitiate(false)
      setForm({ buyerId: "", relatedPaymentId: "", relatedPaymentType: "manual", amount: "", reason: "" })
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

  const refunds = data?.data || []
  const filtered = refunds.filter(
    (d: any) =>
      !searchTerm ||
      (d.buyerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.buyerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
            <h1 className="text-3xl font-bold">Refunds</h1>
            <p className="text-muted-foreground">Manage payment refunds</p>
          </div>
        </div>
        <Button onClick={() => setShowInitiate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Initiate Refund
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load refunds. Please retry.
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by buyer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refund Records</CardTitle>
          <CardDescription>All refunds including deposit and concierge fee refunds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Buyer</th>
                  <th className="text-left py-3 px-4 font-medium">Related Payment</th>
                  <th className="text-left py-3 px-4 font-medium">Refund Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Created</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.buyerName || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{item.buyerEmail || ""}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getPaymentTypeBadge(item.relatedPaymentType)}
                        {item.relatedPaymentId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.relatedPaymentId.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-red-600">{formatCurrency(item.amount)}</td>
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
                {searchTerm ? "No matching refunds found" : "No refunds yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initiate Refund Dialog */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Refund</DialogTitle>
            <DialogDescription>
              Initiate a refund to a buyer. Select an original payment or create a manual refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ref-buyer">Buyer ID *</Label>
              <Input
                id="ref-buyer"
                placeholder="Enter buyer ID (e.g. buyer_gold_001)"
                value={form.buyerId}
                onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ref-type">Payment Type</Label>
              <select
                id="ref-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.relatedPaymentType}
                onChange={(e) => setForm({ ...form, relatedPaymentType: e.target.value })}
              >
                <option value="manual">Manual Refund</option>
                <option value="deposit">Deposit</option>
                <option value="service_fee">Concierge Fee</option>
              </select>
            </div>
            {form.relatedPaymentType !== "manual" && (
              <div>
                <Label htmlFor="ref-payment">Original Payment ID</Label>
                <Input
                  id="ref-payment"
                  placeholder="Enter original payment ID"
                  value={form.relatedPaymentId}
                  onChange={(e) => setForm({ ...form, relatedPaymentId: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="ref-amount">Refund Amount ($) *</Label>
              <Input
                id="ref-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="99.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ref-reason">Reason *</Label>
              <Textarea
                id="ref-reason"
                placeholder="Reason for this refund..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={processing}>
              <Undo2 className="h-4 w-4 mr-1" />
              {processing ? "Processing..." : "Submit Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{detailItem.id}</span>
                <span className="text-muted-foreground">Buyer:</span>
                <span>{detailItem.buyerName || detailItem.buyerId}</span>
                <span className="text-muted-foreground">Email:</span>
                <span>{detailItem.buyerEmail || "—"}</span>
                <span className="text-muted-foreground">Related Payment:</span>
                <span className="font-mono">{detailItem.relatedPaymentId || "Manual"}</span>
                <span className="text-muted-foreground">Payment Type:</span>
                <span>{getPaymentTypeBadge(detailItem.relatedPaymentType)}</span>
                <span className="text-muted-foreground">Refund Amount:</span>
                <span className="font-semibold text-red-600">{formatCurrency(detailItem.amount)}</span>
                <span className="text-muted-foreground">Status:</span>
                <span>{getStatusBadge(detailItem.status)}</span>
                <span className="text-muted-foreground">Reason:</span>
                <span>{detailItem.reason || "—"}</span>
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
