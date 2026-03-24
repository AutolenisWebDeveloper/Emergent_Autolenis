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
import { ArrowLeft, DollarSign, Clock, CheckCircle, XCircle, Send, RefreshCw, Search } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Payout {
  id: string
  affiliateId: string
  amount: number
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  method: string
  providerRef: string | null
  createdAt: string
  processedAt: string | null
  affiliate: {
    id: string
    referralCode: string
    bankDetails: any
    user: {
      email: string
      firstName: string
      lastName: string
    }
  }
}

export default function AdminPayoutsPage() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "PENDING")
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [processDialog, setProcessDialog] = useState<{ open: boolean; payout: Payout | null }>({
    open: false,
    payout: null,
  })
  const [transactionId, setTransactionId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [processing, setProcessing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/affiliates/payouts?status=${statusFilter}&search=${search}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const hasError = Boolean(error)
  const payouts: Payout[] = data?.payouts || []
  const stats = data?.stats || { pending: 0, completed: 0, totalPending: 0, totalPaid: 0 }

  const handleProcessPayout = async () => {
    if (!processDialog.payout || !transactionId.trim()) return

    setProcessing(true)
    try {
      const response = await fetch(
        `/api/admin/affiliates/payouts/${processDialog.payout.id}/process`,
        {
          method: "POST",
          headers: csrfHeaders(),
          body: JSON.stringify({
            providerRef: transactionId,
            method: paymentMethod === "bank_transfer" ? "Bank Transfer" : "PayPal",
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process payout")
      }

      setProcessDialog({ open: false, payout: null })
      setTransactionId("")
      mutate()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setProcessing(false)
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
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "PROCESSING":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case "COMPLETED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case "FAILED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
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
            <h1 className="text-2xl font-bold">Affiliate Payouts</h1>
            <p className="text-muted-foreground">Process and manage affiliate payout requests</p>
          </div>
        </div>
        <Button onClick={() => mutate()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {hasError && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load payouts. Please retry.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</div>
            <p className="text-xs text-muted-foreground">Total to be paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Queue</CardTitle>
          <CardDescription>Review and process affiliate payout requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Payouts Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payouts found</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payout.affiliate?.user?.firstName} {payout.affiliate?.user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{payout.affiliate?.user?.email}</p>
                          <p className="text-xs text-muted-foreground">Code: {payout.affiliate?.referralCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">{formatCurrency(payout.amount)}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        {payout.affiliate?.bankDetails ? (
                          <div className="text-sm">
                            <p>{payout.affiliate.bankDetails.bankName}</p>
                            <p className="text-muted-foreground">****{payout.affiliate.bankDetails.accountNumber?.slice(-4)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(payout.createdAt)}</TableCell>
                      <TableCell>
                        {payout.providerRef ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">{payout.providerRef}</code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {payout.status === "PENDING" && (
                          <Button
                            size="sm"
                            onClick={() => setProcessDialog({ open: true, payout })}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Payout Dialog */}
      <Dialog open={processDialog.open} onOpenChange={(open) => setProcessDialog({ open, payout: open ? processDialog.payout : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Complete the payment externally, then enter the transaction reference below.
            </DialogDescription>
          </DialogHeader>
          
          {processDialog.payout && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affiliate:</span>
                  <span className="font-medium">
                    {processDialog.payout.affiliate?.user?.firstName} {processDialog.payout.affiliate?.user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{processDialog.payout.affiliate?.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-green-600">{formatCurrency(processDialog.payout.amount)}</span>
                </div>
                {processDialog.payout.affiliate?.bankDetails && (
                  <>
                    <hr className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span>{processDialog.payout.affiliate.bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account:</span>
                      <span>****{processDialog.payout.affiliate.bankDetails.accountNumber?.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Routing:</span>
                      <span>{processDialog.payout.affiliate.bankDetails.routingNumber}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer (ACH)</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID / Reference</Label>
                <Input
                  id="transactionId"
                  placeholder="Enter bank transfer or PayPal reference..."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The affiliate will receive an email confirmation once processed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog({ open: false, payout: null })}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayout} disabled={processing || !transactionId.trim()}>
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

