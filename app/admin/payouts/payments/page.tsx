"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  Ban,
  Send,
  Eye,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PayoutRecord {
  id: string
  affiliateId: string
  amount: number
  method: string | null
  status: string
  externalTransactionId: string | null
  paidAt: string | null
  createdAt: string
  affiliate: {
    referralCode: string
    user: {
      email: string
      firstName: string
      lastName: string
    } | null
  } | null
}

export default function AdminAffiliatePaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [initiateOpen, setInitiateOpen] = useState(false)
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; payment: PayoutRecord | null }>({
    open: false,
    payment: null,
  })
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    payment: PayoutRecord | null
    action: "PAID" | "CANCELED" | null
  }>({ open: false, payment: null, action: null })

  // Initiate form state
  const [initiateForm, setInitiateForm] = useState({
    affiliateId: "",
    amount: "",
    method: "bank_transfer",
  })
  const [initiating, setInitiating] = useState(false)
  const [actionProcessing, setActionProcessing] = useState(false)
  const [externalTxnId, setExternalTxnId] = useState("")

  const apiUrl = `/api/admin/affiliates/payments?status=${statusFilter}`

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 30000,
  })

  const hasError = Boolean(error)
  const payments: PayoutRecord[] = data?.payments || []

  const filteredPayments = search
    ? payments.filter((p) => {
        const name = `${p.affiliate?.user?.firstName || ""} ${p.affiliate?.user?.lastName || ""}`.toLowerCase()
        const code = (p.affiliate?.referralCode || "").toLowerCase()
        const q = search.toLowerCase()
        return name.includes(q) || code.includes(q)
      })
    : payments

  const handleInitiatePayment = async () => {
    const amount = Math.round(parseFloat(initiateForm.amount) * 100)
    if (!initiateForm.affiliateId.trim() || isNaN(amount) || amount <= 0 || !initiateForm.method) {
      return
    }

    setInitiating(true)
    try {
      const response = await fetch("/api/admin/affiliates/payments/initiate", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          affiliateId: initiateForm.affiliateId.trim(),
          amount,
          method: initiateForm.method,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to initiate payment")
      }

      setInitiateOpen(false)
      setInitiateForm({ affiliateId: "", amount: "", method: "bank_transfer" })
      mutate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setInitiating(false)
    }
  }

  const handleAction = async () => {
    if (!actionDialog.payment || !actionDialog.action) return

    setActionProcessing(true)
    try {
      const response = await fetch(`/api/admin/affiliates/payments/${actionDialog.payment.id}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          status: actionDialog.action,
          externalTransactionId: externalTxnId || undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to update payment")
      }

      setActionDialog({ open: false, payment: null, action: null })
      setExternalTxnId("")
      mutate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionProcessing(false)
    }
  }

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
    })
  }

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: "Bank Transfer",
      paypal: "PayPal",
      wire: "Wire Transfer",
      check: "Check",
    }
    return labels[method] || method
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "INITIATED":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Send className="h-3 w-3 mr-1" />Initiated
          </Badge>
        )
      case "PROCESSING":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing
          </Badge>
        )
      case "PAID":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />Paid
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />Failed
          </Badge>
        )
      case "CANCELED":
        return (
          <Badge variant="outline" className="bg-muted/50 text-gray-700 border-gray-200">
            <Ban className="h-3 w-3 mr-1" />Canceled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/affiliates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Affiliate Payments</h1>
            <p className="text-muted-foreground">Initiate and manage payments to affiliates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => mutate()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setInitiateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Initiate Payment
          </Button>
        </div>
      </div>

      {hasError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load payments. Please retry.
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>Admin-initiated payments to affiliates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or referral code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="INITIATED">Initiated</TabsTrigger>
                <TabsTrigger value="PROCESSING">Processing</TabsTrigger>
                <TabsTrigger value="PAID">Paid</TabsTrigger>
                <TabsTrigger value="FAILED">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Payments Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.affiliate?.user?.firstName} {payment.affiliate?.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Code: {payment.affiliate?.referralCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{getMethodLabel(payment.method || "")}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm">{formatDate(payment.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsDialog({ open: true, payment })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(payment.status === "INITIATED" || payment.status === "PROCESSING") && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  setActionDialog({ open: true, payment, action: "PAID" })
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setActionDialog({ open: true, payment, action: "CANCELED" })
                                }
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initiate Payment Dialog */}
      <Dialog open={initiateOpen} onOpenChange={setInitiateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Payment</DialogTitle>
            <DialogDescription>
              Create a new payment to an affiliate. The affiliate will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="affiliateId">Affiliate ID</Label>
              <Input
                id="affiliateId"
                placeholder="Enter affiliate ID..."
                value={initiateForm.affiliateId}
                onChange={(e) => setInitiateForm({ ...initiateForm, affiliateId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={initiateForm.amount}
                onChange={(e) => setInitiateForm({ ...initiateForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select
                value={initiateForm.method}
                onValueChange={(v) => setInitiateForm({ ...initiateForm, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (ACH)</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInitiatePayment}
              disabled={initiating || !initiateForm.affiliateId.trim() || !initiateForm.amount}
            >
              {initiating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Initiate Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ open, payment: open ? detailsDialog.payment : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Full details for this payment transaction</DialogDescription>
          </DialogHeader>
          {detailsDialog.payment && (
            <div className="space-y-3">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <code className="text-xs">{detailsDialog.payment.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affiliate:</span>
                  <span className="font-medium">
                    {detailsDialog.payment.affiliate?.user?.firstName}{" "}
                    {detailsDialog.payment.affiliate?.user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referral Code:</span>
                  <code>{detailsDialog.payment.affiliate?.referralCode}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(detailsDialog.payment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span>{getMethodLabel(detailsDialog.payment.method || "")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(detailsDialog.payment.status)}
                </div>
                {detailsDialog.payment.externalTransactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <code className="text-xs">{detailsDialog.payment.externalTransactionId}</code>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(detailsDialog.payment.createdAt)}</span>
                </div>
                {detailsDialog.payment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid At:</span>
                    <span>{formatDate(detailsDialog.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog({ open: false, payment: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid / Cancel Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, payment: null, action: null })
            setExternalTxnId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "PAID" ? "Mark Payment as Paid" : "Cancel Payment"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "PAID"
                ? "Confirm that this payment has been completed."
                : "This will cancel the payment. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.payment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affiliate:</span>
                  <span className="font-medium">
                    {actionDialog.payment.affiliate?.user?.firstName}{" "}
                    {actionDialog.payment.affiliate?.user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(actionDialog.payment.amount)}
                  </span>
                </div>
              </div>
              {actionDialog.action === "PAID" && (
                <div className="space-y-2">
                  <Label htmlFor="externalTxnId">External Transaction ID (optional)</Label>
                  <Input
                    id="externalTxnId"
                    placeholder="Enter reference number..."
                    value={externalTxnId}
                    onChange={(e) => setExternalTxnId(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, payment: null, action: null })
                setExternalTxnId("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "CANCELED" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionProcessing}
            >
              {actionProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionDialog.action === "PAID" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Paid
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
