"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, FileText, Clock, CheckCircle, XCircle, Eye, RefreshCw, Download, AlertTriangle, Plus, Trash2 } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { useToast } from "@/hooks/use-toast"

interface Document {
  id: string
  type: string
  status: string
  fileName: string
  fileUrl?: string
  storagePath?: string
  dealId?: string
  ownerUserId?: string
  rejectionReason?: string
  uploadVisibility?: string
  requestId?: string
  createdAt: string
  updatedAt: string
}

interface AffiliateDocument {
  id: string
  affiliateId: string
  workspaceId?: string
  type: string
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string
  status: string
  visibility: string
  reviewNotes?: string
  createdAt: string
  updatedAt: string
}

interface DocumentRequest {
  id: string
  dealId: string
  buyerId: string
  requestedByUserId: string
  requestedByRole: string
  type: string
  required: boolean
  notes: string | null
  dueDate: string | null
  status: string
  decisionNotes: string | null
  createdAt: string
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [affiliateDocs, setAffiliateDocs] = useState<AffiliateDocument[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Document | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  // Request form state
  const [reqDealId, setReqDealId] = useState("")
  const [reqBuyerId, setReqBuyerId] = useState("")
  const [reqType, setReqType] = useState("ID")
  const [reqNotes, setReqNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)

      const [docsRes, reqsRes, affiliateRes] = await Promise.all([
        fetch(`/api/admin/documents?${params}`),
        fetch("/api/document-requests"),
        fetch("/api/admin/affiliate-documents"),
      ])
      const docsData = await docsRes.json()
      const reqsData = await reqsRes.json()
      const affiliateData = await affiliateRes.json()
      setDocuments(docsData.documents || [])
      setRequests(reqsData.requests || [])
      setAffiliateDocs(affiliateData.documents || [])
    } catch (err) {
      console.error("Error fetching documents:", err)
      toast({
        variant: "destructive",
        title: "Failed to load documents",
        description: "Unable to fetch documents. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, search, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateRequest = async () => {
    if (!reqDealId || !reqBuyerId || !reqType) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/document-requests", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          dealId: reqDealId,
          buyerId: reqBuyerId,
          type: reqType,
          required: true,
          notes: reqNotes || null,
        }),
      })
      if (res.ok) {
        setShowRequestModal(false)
        setReqDealId("")
        setReqBuyerId("")
        setReqType("ID")
        setReqNotes("")
        toast({ title: "Request created", description: "Document request sent to buyer." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({
          variant: "destructive",
          title: "Request failed",
          description: errorData.error || "Failed to create document request.",
        })
      }
    } catch (err) {
      console.error("Create request error:", err)
      toast({
        variant: "destructive",
        title: "Request failed",
        description: "Unable to create document request. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (docId: string) => {
    try {
      // Use the admin-scoped endpoint — the buyer /api/documents route returns 403 for admins
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: "APPROVED" }),
      })
      if (res.ok) {
        toast({ title: "Document approved", description: "The document has been approved." })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Approval failed", description: err.error || "Unable to approve document." })
      }
      fetchData()
      setShowReviewModal(false)
    } catch (err) {
      console.error("Approve error:", err)
      toast({ variant: "destructive", title: "Approval failed", description: "Unable to approve document. Please try again." })
    }
  }

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Rejection reason required", description: "Please provide a reason before rejecting." })
      return
    }
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: "REJECTED", rejectionReason }),
      })
      if (res.ok) {
        toast({ title: "Document rejected", description: "The document has been rejected." })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Rejection failed", description: err.error || "Unable to reject document." })
      }
      setRejectionReason("")
      fetchData()
      setShowReviewModal(false)
    } catch (err) {
      console.error("Reject error:", err)
      toast({ variant: "destructive", title: "Rejection failed", description: "Unable to reject document. Please try again." })
    }
  }

  const handleAffiliateReview = async (docId: string, status: "APPROVED" | "REJECTED", notes?: string) => {
    try {
      const res = await fetch(`/api/admin/affiliate-documents/${docId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status, reviewNotes: notes }),
      })
      if (res.ok) {
        toast({ title: `Affiliate document ${status.toLowerCase()}` })
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Update failed", description: err.error || "Unable to update affiliate document." })
      }
    } catch (err) {
      console.error("Affiliate review error:", err)
      toast({ variant: "destructive", title: "Update failed", description: "Unable to update affiliate document. Please try again." })
    }
  }

  const handleDelete = async (docId: string) => {
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, { method: "DELETE", headers: csrfHeaders() })
      if (res.ok) {
        toast({ title: "Document deleted", description: "The document has been removed." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Delete failed", description: errorData.error || "Unable to delete document." })
      }
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Unable to delete document. Please try again." })
    } finally {
      setDeletingId(null)
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    UPLOADED: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    PENDING_REVIEW: "bg-blue-100 text-blue-800",
    REQUESTED: "bg-yellow-100 text-yellow-800",
  }

  const typeLabels: Record<string, string> = {
    ID: "Government ID",
    INSURANCE_PROOF: "Insurance Proof",
    PAY_STUB: "Pay Stub",
    BANK_STATEMENT: "Bank Statement",
    TRADE_IN_TITLE: "Trade-In Title",
    PRE_APPROVAL_LETTER: "Pre-Approval Letter",
    CONTRACT: "Contract",
    BILL_OF_SALE: "Bill of Sale",
    OTHER: "Other",
  }

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "UPLOADED" || d.status === "PENDING_REVIEW").length,
    verified: documents.filter((d) => d.status === "APPROVED").length,
    rejected: documents.filter((d) => d.status === "REJECTED").length,
  }

  return (
      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Documents"
          subtitle="Review and manage all uploaded documents"
          primaryAction={{
            label: "Request Document",
            onClick: () => setShowRequestModal(true),
            icon: <Plus className="h-4 w-4 mr-2" />,
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
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
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
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
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">
              Buyer / Dealer Docs
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="affiliate">
              Affiliate Docs
              {affiliateDocs.filter(d => d.status === "PENDING").length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {affiliateDocs.filter(d => d.status === "PENDING").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {requests.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{requests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-6 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by file name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchData()}
                      className="pl-10"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ID">Government ID</SelectItem>
                      <SelectItem value="INSURANCE_PROOF">Insurance</SelectItem>
                      <SelectItem value="PAY_STUB">Pay Stub</SelectItem>
                      <SelectItem value="BANK_STATEMENT">Bank Statement</SelectItem>
                      <SelectItem value="TRADE_IN_TITLE">Trade-In Title</SelectItem>
                      <SelectItem value="PRE_APPROVAL_LETTER">Pre-Approval Letter</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="UPLOADED">Uploaded</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No documents found
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium truncate max-w-[200px]">
                                  {doc.fileName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {typeLabels[doc.type] || doc.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm truncate">{doc.ownerUserId?.slice(0, 8)}…</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[doc.status] || "bg-muted"}>
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(doc.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {doc.fileUrl && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {doc.fileUrl && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {doc.status === "UPLOADED" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setReviewDoc(doc); setShowReviewModal(true) }}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deletingId === doc.id}
                                >
                                  {deletingId === doc.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
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
          </TabsContent>

          {/* Affiliate Documents Tab */}
          <TabsContent value="affiliate" className="mt-6 space-y-4">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading affiliate documents...</p>
              </div>
            ) : affiliateDocs.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No affiliate documents"
                description="Affiliate-uploaded documents (W-9, bank, ID) will appear here for review."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateDocs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium truncate max-w-[200px]">{doc.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{typeLabels[doc.type] || doc.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">{doc.affiliateId.slice(0, 8)}…</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[doc.status] || "bg-muted"}>{doc.status}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(doc.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {doc.status === "PENDING" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleAffiliateReview(doc.id, "APPROVED")}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleAffiliateReview(doc.id, "REJECTED", "Does not meet requirements")}
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {doc.reviewNotes && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={doc.reviewNotes}>
                                    {doc.reviewNotes}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            {requests.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                title="No document requests"
                description="Create document requests for buyers to complete their deals."
                primaryCta={{ label: "Create Request", onClick: () => setShowRequestModal(true) }}
              />
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{typeLabels[req.type] || req.type}</p>
                          <p className="text-sm text-muted-foreground">
                            Deal: {req.dealId.slice(0, 8)}… | Buyer: {req.buyerId.slice(0, 8)}… | By: {req.requestedByRole}
                          </p>
                          {req.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{req.notes}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={statusColors[req.status] || "bg-muted"}>{req.status}</Badge>
                            {req.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                            <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Document Modal */}
        <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Request Document from Buyer</DialogTitle>
              <DialogDescription>
                Request a required document from a buyer to complete their deal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Deal ID</label>
                <Input className="mt-1" placeholder="Enter deal ID" value={reqDealId} onChange={(e) => setReqDealId(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Buyer User ID</label>
                <Input className="mt-1" placeholder="Enter buyer user ID" value={reqBuyerId} onChange={(e) => setReqBuyerId(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select value={reqType} onValueChange={setReqType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ID">Government ID</SelectItem>
                    <SelectItem value="INSURANCE_PROOF">Insurance Proof</SelectItem>
                    <SelectItem value="PAY_STUB">Pay Stub</SelectItem>
                    <SelectItem value="BANK_STATEMENT">Bank Statement</SelectItem>
                    <SelectItem value="TRADE_IN_TITLE">Trade-In Title</SelectItem>
                    <SelectItem value="PRE_APPROVAL_LETTER">Pre-Approval Letter</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes / Instructions</label>
                <Textarea className="mt-1" placeholder="Instructions for the buyer..." value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleCreateRequest}
                disabled={!reqDealId || !reqBuyerId || submitting}
              >
                {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Document Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Review Document</DialogTitle>
              <DialogDescription>Approve or reject this uploaded document.</DialogDescription>
            </DialogHeader>
            {reviewDoc && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">File Name</p>
                    <p className="font-medium">{reviewDoc.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{typeLabels[reviewDoc.type] || reviewDoc.type}</p>
                  </div>
                </div>
                {reviewDoc.fileUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={reviewDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-2" />View Document
                    </a>
                  </Button>
                )}
                <div>
                  <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                  <Textarea className="mt-1" placeholder="Reason for rejection..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => reviewDoc && handleReject(reviewDoc.id)} disabled={!rejectionReason}>
                <XCircle className="h-4 w-4 mr-2" />Reject
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => reviewDoc && handleApprove(reviewDoc.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ProtectedRoute>
  )
}
