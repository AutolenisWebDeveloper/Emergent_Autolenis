"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, TrendingUp, CheckCircle, Clock, XCircle, ExternalLink, RefreshCw, Mail, Ban } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { toast } from "sonner"
import Link from "next/link"

interface Affiliate {
  id: string
  userId: string
  status: string
  referralCode: string
  totalReferrals: number
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  createdAt: string
  user: {
    email: string
    firstName?: string
    lastName?: string
  } | null
  bankDetails?: {
    accountName?: string
    bankName?: string
  } | null
}

interface AffiliateStats {
  totalAffiliates: number
  activeAffiliates: number
  totalReferrals: number
  totalEarnings: number
  pendingPayouts: number
  paidPayouts: number
}

interface Payout {
  id: string
  affiliateId: string
  amount: number
  status: string
  requestedAt: string
  processedAt?: string
  transactionId?: string
  affiliate?: {
    user?: {
      email: string
      firstName?: string
      lastName?: string
    } | null
    referralCode: string
    bankDetails?: {
      accountName?: string
      bankName?: string
      accountNumber?: string
      routingNumber?: string
    } | null
  }
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [pendingPayouts, setPendingPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [committedSearch, setCommittedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("payouts")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

  // Dialog states
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [processingAction, setProcessingAction] = useState(false)

  // Payout dialog states
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)
  const [transactionId, setTransactionId] = useState("")

  const fetchAffiliates = useCallback(async () => {
    setFetchLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", String(page))
      if (committedSearch) params.append("search", committedSearch)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/admin/affiliates?${params}`)
      if (!response.ok) throw new Error("Failed to fetch affiliates")

      const data = await response.json()
      setAffiliates(data.affiliates || [])
      setStats(data.stats || null)
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Error fetching affiliates:", error)
      toast.error("Failed to load affiliates")
    } finally {
      setFetchLoading(false)
    }
  }, [committedSearch, statusFilter, page])

  const handleSearch = useCallback(() => {
    setCommittedSearch(searchTerm)
    setPage(1)
  }, [searchTerm])

  const fetchPendingPayouts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/affiliates/payouts?status=PENDING")
      if (!response.ok) throw new Error("Failed to fetch payouts")

      const data = await response.json()
      setPendingPayouts(data.payouts || [])
    } catch (error) {
      console.error("Error fetching payouts:", error)
      toast.error("Failed to load pending payouts")
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchAffiliates(), fetchPendingPayouts()])
      setLoading(false)
    }
    loadData()
  }, [fetchAffiliates, fetchPendingPayouts])

  const handleStatusChange = async (affiliateId: string, newStatus: string, reason?: string) => {
    setProcessingAction(true)
    try {
      const response = await fetch(`/api/admin/affiliates/${affiliateId}/status`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: newStatus, reason }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      toast.success(`Affiliate status updated to ${newStatus}`)
      setSuspendOpen(false)
      setSuspendReason("")
      setSelectedAffiliate(null)
      await fetchAffiliates()
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update affiliate status")
    } finally {
      setProcessingAction(false)
    }
  }

  const handleProcessPayout = async () => {
    if (!selectedPayout || !transactionId.trim()) {
      toast.error("Transaction ID is required")
      return
    }

    setProcessingAction(true)
    try {
      const response = await fetch(`/api/admin/affiliates/payouts/${selectedPayout.id}/process`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ transactionId: transactionId.trim() }),
      })

      if (!response.ok) throw new Error("Failed to process payout")

      toast.success("Payout processed successfully")
      setPayoutDialogOpen(false)
      setTransactionId("")
      setSelectedPayout(null)
      await Promise.all([fetchAffiliates(), fetchPendingPayouts()])
    } catch (error) {
      console.error("Error processing payout:", error)
      toast.error("Failed to process payout")
    } finally {
      setProcessingAction(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      ACTIVE: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      PENDING: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      SUSPENDED: { variant: "destructive", icon: <Ban className="h-3 w-3 mr-1" /> },
      INACTIVE: { variant: "outline", icon: <XCircle className="h-3 w-3 mr-1" /> },
    }
    const config = (variants[status] ?? variants["PENDING"]) as { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {status}
      </Badge>
    )
  }

  const getPayoutStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: "default",
      PENDING: "secondary",
      FAILED: "destructive",
      CANCELLED: "outline",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const affiliateColumns: AdminListColumn<Affiliate>[] = [
    {
      header: "Name",
      key: "name",
      render: (affiliate) => (
        <div>
          <div className="font-medium">
            {affiliate.user?.firstName && affiliate.user?.lastName
              ? `${affiliate.user.firstName} ${affiliate.user.lastName}`
              : "N/A"}
          </div>
          <div className="text-sm text-muted-foreground">{affiliate.user?.email || "No email"}</div>
        </div>
      ),
    },
    {
      header: "Referral Code",
      key: "referralCode",
      render: (affiliate) => (
        <code className="px-2 py-1 bg-muted rounded text-sm">{affiliate.referralCode}</code>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (affiliate) => getStatusBadge(affiliate.status),
    },
    {
      header: "Referrals",
      key: "totalReferrals",
      render: (affiliate) => <span className="font-medium">{affiliate.totalReferrals}</span>,
    },
    {
      header: "Total Earnings",
      key: "totalEarnings",
      render: (affiliate) => <span className="font-medium">{formatCurrency(affiliate.totalEarnings)}</span>,
    },
    {
      header: "Pending",
      key: "pendingEarnings",
      render: (affiliate) =>
        affiliate.pendingEarnings > 0 ? (
          <span className="text-amber-600 font-medium">{formatCurrency(affiliate.pendingEarnings)}</span>
        ) : (
          <span className="text-muted-foreground">$0.00</span>
        ),
    },
    {
      header: "Joined",
      key: "joined",
      render: (affiliate) => <>{formatDate(affiliate.createdAt)}</>,
    },
    {
      header: "Actions",
      key: "actions",
      render: (affiliate) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/affiliates/${affiliate.id}`}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ]

  return loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <AdminListPageShell
            title="Affiliate Management"
            subtitle="Manage affiliates, track performance, and process payouts"
            headerActions={
              <>
                <Link href="/admin/affiliates/create">
                  <Button className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF]">Create Affiliate</Button>
                </Link>
                <Button onClick={async () => { await Promise.all([fetchAffiliates(), fetchPendingPayouts()]) }} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </>
            }
            searchPlaceholder="Search by email or referral code..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onSearch={handleSearch}
            filterSlot={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
            stats={stats ? [
              { label: "Total Affiliates", value: stats.totalAffiliates, icon: <Users className="h-8 w-8 text-primary" /> },
              { label: "Total Referrals", value: stats.totalReferrals, icon: <TrendingUp className="h-8 w-8 text-primary" /> },
              { label: "Total Earnings", value: formatCurrency(stats.totalEarnings), icon: <DollarSign className="h-8 w-8 text-primary" /> },
              { label: "Pending Payouts", value: formatCurrency(stats.pendingPayouts), icon: <Clock className="h-8 w-8 text-primary" /> },
            ] : []}
            columns={affiliateColumns}
            items={affiliates}
            rowKey={(affiliate) => affiliate.id}
            isLoading={fetchLoading}
            emptyText="No affiliates found"
            loadingText="Loading affiliates..."
            errorText="Failed to load affiliates"
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />

          {/* Pending Payouts Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="payouts" className="relative">
                Pending Payouts
                {pendingPayouts.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingPayouts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments" asChild>
                <Link href="/admin/payouts/payments">Payments</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Payout Requests</CardTitle>
                  <CardDescription>Review and process affiliate payout requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayouts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No pending payout requests
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingPayouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {payout.affiliate?.user?.firstName && payout.affiliate?.user?.lastName
                                      ? `${payout.affiliate.user.firstName} ${payout.affiliate.user.lastName}`
                                      : "N/A"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{payout.affiliate?.user?.email || "No email"}</div>
                                  <code className="text-xs text-muted-foreground">{payout.affiliate?.referralCode}</code>
                                </div>
                              </TableCell>
                              <TableCell>
                                {payout.affiliate?.bankDetails ? (
                                  <div className="text-sm">
                                    <div>{payout.affiliate.bankDetails.bankName}</div>
                                    <div className="text-muted-foreground">{payout.affiliate.bankDetails.accountName}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Not provided</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-lg">{formatCurrency(payout.amount)}</TableCell>
                              <TableCell>{formatDate(payout.requestedAt)}</TableCell>
                              <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayout(payout)
                                    setPayoutDialogOpen(true)
                                  }}
                                >
                                  Process
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Affiliate Details Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Affiliate Details</DialogTitle>
                <DialogDescription>View detailed information about this affiliate</DialogDescription>
              </DialogHeader>
              {selectedAffiliate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">
                        {selectedAffiliate.user?.firstName && selectedAffiliate.user?.lastName
                          ? `${selectedAffiliate.user.firstName} ${selectedAffiliate.user.lastName}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedAffiliate.user?.email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Referral Code</Label>
                      <code className="px-2 py-1 bg-muted rounded">{selectedAffiliate.referralCode}</code>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedAffiliate.status)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Referrals</Label>
                      <p className="font-medium">{selectedAffiliate.totalReferrals}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Joined</Label>
                      <p className="font-medium">{formatDate(selectedAffiliate.createdAt)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Earnings Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{formatCurrency(selectedAffiliate.totalEarnings)}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(selectedAffiliate.pendingEarnings)}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedAffiliate.paidEarnings)}</p>
                        <p className="text-xs text-muted-foreground">Paid</p>
                      </div>
                    </div>
                  </div>
                  {selectedAffiliate.bankDetails && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Bank Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Bank:</span> {selectedAffiliate.bankDetails.bankName}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account:</span> {selectedAffiliate.bankDetails.accountName}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                {selectedAffiliate?.user?.email && (
                  <Button variant="secondary" asChild>
                    <a href={`mailto:${selectedAffiliate.user.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Suspend Dialog */}
          <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suspend Affiliate</DialogTitle>
                <DialogDescription>
                  This will suspend the affiliate and prevent them from earning commissions. Please provide a reason.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Suspension Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for suspension..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={processingAction}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedAffiliate && handleStatusChange(selectedAffiliate.id, "SUSPENDED", suspendReason)}
                  disabled={processingAction || !suspendReason.trim()}
                >
                  {processingAction ? "Suspending..." : "Suspend Affiliate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Process Payout Dialog */}
          <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Process Payout</DialogTitle>
                <DialogDescription>
                  Enter the transaction ID after completing the bank transfer to mark this payout as processed.
                </DialogDescription>
              </DialogHeader>
              {selectedPayout && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {selectedPayout.affiliate?.user?.firstName} {selectedPayout.affiliate?.user?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedPayout.affiliate?.user?.email}</p>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(selectedPayout.amount)}</p>
                    </div>
                  </div>
                  {selectedPayout.affiliate?.bankDetails && (
                    <div className="text-sm space-y-1">
                      <p><strong>Bank:</strong> {selectedPayout.affiliate.bankDetails.bankName}</p>
                      <p><strong>Account Name:</strong> {selectedPayout.affiliate.bankDetails.accountName}</p>
                      <p><strong>Account #:</strong> ****{selectedPayout.affiliate.bankDetails.accountNumber?.slice(-4)}</p>
                      <p><strong>Routing #:</strong> {selectedPayout.affiliate.bankDetails.routingNumber}</p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="transactionId">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      placeholder="Enter bank transfer transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} disabled={processingAction}>
                  Cancel
                </Button>
                <Button onClick={handleProcessPayout} disabled={processingAction || !transactionId.trim()}>
                  {processingAction ? "Processing..." : "Mark as Paid"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
}