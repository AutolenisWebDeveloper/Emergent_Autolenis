"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, DollarSign, Users, Calendar, Copy, CheckCircle,
  MousePointerClick, FileText, TrendingUp, Clock, Shield
} from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-muted text-gray-800",
  SUSPENDED: "bg-red-100 text-red-800",
  PENDING: "bg-yellow-100 text-yellow-800",
}

const DOC_STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  REJECTED: "bg-red-100 text-red-800",
}

interface AffiliateDetail {
  id: string
  userId: string
  status: string
  referralCode: string
  totalReferrals: number
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  createdAt: string
  totalClicks: number
  conversionRate: number
  user: {
    email: string
    firstName: string | null
    lastName: string | null
  } | null
  bankDetails: {
    bankName?: string
    accountNumber?: string
    routingNumber?: string
    paypalEmail?: string
    accountName?: string
  } | null
}

interface Referral {
  id: string
  status: string
  createdAt: string
  level?: number
  attributedAt?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  referredBuyerId?: string
  dealId?: string
  buyer?: {
    firstName: string
    lastName: string
  }
}

interface Commission {
  id: string
  amount: number
  status: string
  type: string
  createdAt: string
  dealId?: string
  level?: number
  baseAmount?: number
  commissionRate?: number
  payoutId?: string
}

interface ClickEvent {
  id: string
  affiliateId: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  landingPage?: string
  clickedAt: string
}

interface PayoutRecord {
  id: string
  amount: number
  status: string
  method?: string | null
  providerRef?: string | null
  createdAt: string
  paidAt?: string | null
}

interface AffiliateDocument {
  id: string
  affiliateId: string
  type: string
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string
  status: string
  createdAt: string
  updatedAt: string
}

interface AuditLog {
  id: string
  action: string
  userId?: string
  details?: Record<string, unknown>
  createdAt: string
}

export default function AdminAffiliateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const affiliateId = params["affiliateId"] as string

  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [clicks, setClicks] = useState<ClickEvent[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [documents, setDocuments] = useState<AffiliateDocument[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchAffiliateDetail = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`)
      if (!res.ok) throw new Error("Failed to fetch affiliate")
      const data = await res.json()
      setAffiliate(data.affiliate)
      setReferrals(data.referrals || [])
      setCommissions(data.commissions || [])
      setClicks(data.clicks || [])
      setPayouts(data.payouts || [])
      setDocuments(data.documents || [])
      setAuditLogs([...(data.auditLogs || []), ...(data.complianceEvents || [])])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [affiliateId])

  useEffect(() => {
    fetchAffiliateDetail()
  }, [fetchAffiliateDetail])

  async function handleStatusChange(newStatus: string) {
    try {
      setUpdatingStatus(true)
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/status`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      setAffiliate((prev) => prev ? { ...prev, status: newStatus } : null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleInitiatePayment() {
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/payouts`, {
        method: "POST",
        headers: csrfHeaders(),
      })
      if (!res.ok) throw new Error("Failed to initiate payment")
      fetchAffiliateDetail()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to initiate payment")
    }
  }

  function copyReferralLink() {
    if (affiliate?.referralCode) {
      navigator.clipboard.writeText(`${window.location.origin}/ref/${affiliate.referralCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !affiliate) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error || "Affiliate not found"}</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/affiliates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {affiliate.user?.firstName || affiliate.user?.lastName
                  ? `${affiliate.user.firstName || ""} ${affiliate.user.lastName || ""}`.trim()
                  : "Affiliate"}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {affiliate.referralCode}
              </Badge>
              <Badge className={STATUS_COLORS[affiliate.status] || "bg-muted"}>
                {affiliate.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{affiliate.user?.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={affiliate.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={copyReferralLink}>
            {copied ? <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="outline" onClick={handleInitiatePayment}>
            <DollarSign className="h-4 w-4 mr-1" />
            Initiate Payment
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/affiliates/${affiliateId}/payouts`}>View Payouts</Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{affiliate.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(affiliate.totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(affiliate.pendingEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold">{formatCurrency(affiliate.paidEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MousePointerClick className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{affiliate.totalClicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {affiliate.conversionRate ? `${affiliate.conversionRate.toFixed(1)}%` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
              {`${typeof window !== "undefined" ? window.location.origin : ""}/ref/${affiliate.referralCode}`}
            </code>
            <Button variant="outline" size="sm" onClick={copyReferralLink}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="clicks">Clicks ({clicks.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
          <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs ({auditLogs.length})</TabsTrigger>
        </TabsList>

        {/* A. Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Affiliate Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {affiliate.user?.firstName || affiliate.user?.lastName
                      ? `${affiliate.user.firstName || ""} ${affiliate.user.lastName || ""}`.trim()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{affiliate.user?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referral Code</p>
                  <p className="font-medium font-mono">{affiliate.referralCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[affiliate.status] || "bg-muted"}>
                    {affiliate.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(affiliate.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="font-medium">{formatCurrency(affiliate.totalEarnings)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Information</CardTitle>
              <CardDescription>Bank details for affiliate payouts</CardDescription>
            </CardHeader>
            <CardContent>
              {affiliate.bankDetails ? (
                <div className="grid grid-cols-2 gap-4">
                  {affiliate.bankDetails.accountName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">{affiliate.bankDetails.accountName}</p>
                    </div>
                  )}
                  {affiliate.bankDetails.bankName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{affiliate.bankDetails.bankName}</p>
                    </div>
                  )}
                  {affiliate.bankDetails.accountNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium">****{affiliate.bankDetails.accountNumber.slice(-4)}</p>
                    </div>
                  )}
                  {affiliate.bankDetails.routingNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Routing Number</p>
                      <p className="font-medium">{affiliate.bankDetails.routingNumber}</p>
                    </div>
                  )}
                  {affiliate.bankDetails.paypalEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">PayPal Email</p>
                      <p className="font-medium">{affiliate.bankDetails.paypalEmail}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No bank details on file</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* B. Referrals Tab */}
        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {referrals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No referrals yet
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Attributed At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deal</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((ref) => (
                        <TableRow key={ref.id}>
                          <TableCell>
                            {ref.referredBuyerId ? (
                              <Link href={`/admin/buyers/${ref.referredBuyerId}`} className="text-blue-600 hover:underline">
                                {ref.buyer ? `${ref.buyer.firstName} ${ref.buyer.lastName}` : ref.referredBuyerId}
                              </Link>
                            ) : (
                              ref.buyer ? `${ref.buyer.firstName} ${ref.buyer.lastName}` : "Unknown"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">L{ref.level || 1}</Badge>
                          </TableCell>
                          <TableCell>{ref.attributedAt ? formatDate(ref.attributedAt) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ref.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {ref.dealId ? (
                              <Link href={`/admin/deals/${ref.dealId}`} className="text-blue-600 hover:underline font-mono text-xs">
                                {ref.dealId}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{formatDate(ref.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* C. Clicks & Attribution Tab */}
        <TabsContent value="clicks" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Click Events &amp; Attribution</CardTitle>
              <CardDescription>
                Attribution window: 30 days from first click. Clicks are tracked with IP deduplication.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {clicks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No click events recorded
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Landing Page</TableHead>
                        <TableHead>Source / Referer</TableHead>
                        <TableHead>User Agent</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clicks.map((click) => (
                        <TableRow key={click.id}>
                          <TableCell>{formatDateTime(click.clickedAt)}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate" title={click.landingPage || ""}>
                            {click.landingPage || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={click.referer || ""}>
                            {click.referer || "Direct"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs" title={click.userAgent || ""}>
                            {click.userAgent || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{click.ipAddress || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* D. Commissions Tab */}
        <TabsContent value="commissions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {commissions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No commissions yet
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell>
                            {comm.dealId ? (
                              <Link href={`/admin/deals/${comm.dealId}`} className="text-blue-600 hover:underline font-mono text-xs">
                                {comm.dealId}
                              </Link>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {comm.level != null ? (
                              <Badge variant="secondary">L{comm.level}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{comm.commissionRate ? `${comm.commissionRate}%` : "—"}</TableCell>
                          <TableCell>{comm.baseAmount ? formatCurrency(comm.baseAmount) : "—"}</TableCell>
                          <TableCell>{formatCurrency(comm.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{comm.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(comm.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E. Payouts Tab */}
        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No payouts yet
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Provider Ref</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Paid At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-mono text-xs">
                            <Link
                              href={`/admin/payouts/${payout.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {payout.id}
                            </Link>
                          </TableCell>
                          <TableCell>{formatCurrency(payout.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payout.status}</Badge>
                          </TableCell>
                          <TableCell>{payout.method || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{payout.providerRef || "—"}</TableCell>
                          <TableCell>{formatDate(payout.createdAt)}</TableCell>
                          <TableCell>{payout.paidAt ? formatDate(payout.paidAt) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* G. Documents / Compliance Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No documents uploaded yet
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Badge variant="secondary">{doc.type}</Badge>
                          </TableCell>
                          <TableCell>{doc.fileName}</TableCell>
                          <TableCell>
                            <Badge className={DOC_STATUS_COLORS[doc.status] || "bg-muted"}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(doc.createdAt)}</TableCell>
                          <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* H. Audit Logs Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No audit logs recorded
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action || log.details?.eventType as string || "—"}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </TableCell>
                          <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Meta Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(affiliate.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
