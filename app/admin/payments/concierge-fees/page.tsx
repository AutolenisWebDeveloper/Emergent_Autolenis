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
import { Plus, Search, ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"


const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminConciergeFeesPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/payments/concierge-fees", fetcher, {
    refreshInterval: 30000,
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [showInitiate, setShowInitiate] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [form, setForm] = useState({ buyerId: "", dealId: "", amount: "", notes: "" })
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
      case "PAID":
      case "SUCCEEDED":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case "REQUESTED":
        return <Badge className="bg-blue-100 text-blue-800">Requested</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "REFUNDED":
        return <Badge className="bg-muted text-gray-800">Refunded</Badge>
      case "CANCELLED":
        return <Badge className="bg-muted text-muted-foreground">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSubmit = async () => {
    if (!form.buyerId || !form.dealId || !form.amount || Number(form.amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Buyer, Deal, and a positive amount are required",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/admin/payments/concierge-fees/request", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          buyerId: form.buyerId,
          dealId: form.dealId,
          amount: Math.round(Number(form.amount) * 100),
          notes: form.notes || undefined,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast({ title: "Concierge fee request created", description: "The buyer will be notified." })
      setShowInitiate(false)
      setForm({ buyerId: "", dealId: "", amount: "", notes: "" })
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

  const fees = data?.data || []
  const filtered = fees.filter(
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
            <h1 className="text-3xl font-bold">Concierge Fees</h1>
            <p className="text-muted-foreground">Manage concierge fee requests and charges</p>
          </div>
        </div>
        <Button onClick={() => setShowInitiate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Initiate Concierge Fee Request
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load concierge fees. Please retry.
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
          <CardTitle>Concierge Fee Requests</CardTitle>
          <CardDescription>Admin-initiated concierge fee requests sent to buyers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Buyer</th>
                  <th className="text-left py-3 px-4 font-medium">Deal</th>
                  <th className="text-left py-3 px-4 font-medium">Fee Amount</th>
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
                    <td className="py-3 px-4 font-mono text-sm">
                      {item.dealId ? `${item.dealId.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(item.amount)}</td>
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
                {searchTerm ? "No matching concierge fees found" : "No concierge fee requests yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initiate Concierge Fee Request Dialog */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Concierge Fee Request</DialogTitle>
            <DialogDescription>Send a concierge fee request to a buyer. They will be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cf-buyer">Buyer ID *</Label>
              <Input
                id="cf-buyer"
                placeholder="Enter buyer ID (e.g. buyer_gold_001)"
                value={form.buyerId}
                onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-deal">Deal ID *</Label>
              <Input
                id="cf-deal"
                placeholder="Enter deal ID (required)"
                value={form.dealId}
                onChange={(e) => setForm({ ...form, dealId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-amount">Fee Amount ($) *</Label>
              <Input
                id="cf-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="499.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-notes">Notes</Label>
              <Textarea
                id="cf-notes"
                placeholder="Notes for this fee request..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concierge Fee Details</DialogTitle>
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
                <span className="text-muted-foreground">Deal:</span>
                <span className="font-mono">{detailItem.dealId || "—"}</span>
                <span className="text-muted-foreground">Fee Amount:</span>
                <span className="font-semibold">{formatCurrency(detailItem.amount)}</span>
                <span className="text-muted-foreground">Status:</span>
                <span>{getStatusBadge(detailItem.status)}</span>
                <span className="text-muted-foreground">Notes:</span>
                <span>{detailItem.notes || "—"}</span>
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
