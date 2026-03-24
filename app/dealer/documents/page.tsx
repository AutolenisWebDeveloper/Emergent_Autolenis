"use client"

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Textarea } from "@/components/ui/textarea"
import { Suspense } from "react"
import {
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  Building2,
  FileCheck,
  Car,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { useToast } from "@/hooks/use-toast"
import { ACCEPTED_DOCUMENT_MIME_TYPES_INPUT, MAX_DOCUMENT_FILE_SIZE } from "@/lib/utils/documents"
import Loading from "./loading"
import { csrfHeaders, getCsrfToken } from "@/lib/csrf-client"

interface DealDocument {
  id: string
  ownerUserId: string
  dealId: string | null
  type: string
  fileName: string
  fileUrl: string
  status: string
  rejectionReason: string | null
  uploadVisibility?: string
  createdAt: string
}

interface DocumentRequest {
  id: string
  dealId: string
  buyerId: string
  type: string
  required: boolean
  notes: string | null
  dueDate: string | null
  status: string
  createdAt: string
}

interface DealOption {
  id: string
  label: string
}

const typeLabels: Record<string, string> = {
  ID: "Government ID",
  INSURANCE_PROOF: "Insurance Proof",
  PAY_STUB: "Pay Stub",
  BANK_STATEMENT: "Bank Statement",
  TRADE_IN_TITLE: "Trade-In Title",
  PRE_APPROVAL_LETTER: "Pre-Approval Letter",
  OTHER: "Other",
}

const statusColors: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  UPLOADED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PENDING_REVIEW: "bg-blue-100 text-blue-800",
}

export default function DealerDocumentsPage() {
  const [documents, setDocuments] = useState<DealDocument[]>([])
  const [dealerUploads, setDealerUploads] = useState<DealDocument[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [deals, setDeals] = useState<DealOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<DealDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  // Request form state
  const [reqDealId, setReqDealId] = useState("")
  const [reqBuyerId, setReqBuyerId] = useState("")
  const [reqType, setReqType] = useState("ID")
  const [reqNotes, setReqNotes] = useState("")
  const [reqRequired, setReqRequired] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Dealer upload form state
  const [uploadDealId, setUploadDealId] = useState("")
  const [uploadType, setUploadType] = useState("OTHER")
  const [uploadVisibility, setUploadVisibility] = useState("BUYER_ADMIN")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadSubmitting, setUploadSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [docsRes, reqsRes, dealerDocsRes, dealsRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/document-requests"),
        fetch("/api/dealer/documents"),
        fetch("/api/dealer/deals"),
      ])
      const docsData = await docsRes.json()
      const reqsData = await reqsRes.json()
      const dealerDocsData = await dealerDocsRes.json()
      const dealsData = await dealsRes.json()
      setDocuments(docsData.documents || [])
      setRequests(reqsData.requests || [])
      setDealerUploads(dealerDocsData.documents || [])
      const dealsList = (dealsData.deals || []).map((d: any) => ({
        id: d.id,
        label: `${d.vehicle || "Deal"} — ${d.buyerName || d.id.slice(0, 8)}`,
      }))
      setDeals(dealsList)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          required: reqRequired,
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
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: "APPROVED" }),
      })
      if (res.ok) {
        toast({ title: "Document approved", description: "The document has been approved." })
      } else {
        toast({ variant: "destructive", title: "Approval failed", description: "Unable to approve document." })
      }
      fetchData()
      setShowReviewModal(false)
    } catch (err) {
      console.error("Approve error:", err)
      toast({ variant: "destructive", title: "Approval failed", description: "Unable to approve document. Please try again." })
    }
  }

  const handleReject = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: "REJECTED", rejectionReason }),
      })
      if (res.ok) {
        toast({ title: "Document rejected", description: "The document has been rejected." })
      } else {
        toast({ variant: "destructive", title: "Rejection failed", description: "Unable to reject document." })
      }
      setRejectionReason("")
      fetchData()
      setShowReviewModal(false)
    } catch (err) {
      console.error("Reject error:", err)
      toast({ variant: "destructive", title: "Rejection failed", description: "Unable to reject document. Please try again." })
    }
  }

  const handleDealerUpload = async () => {
    if (!uploadFile) return
    if (uploadFile.size > MAX_DOCUMENT_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 25 MB. Please choose a smaller file.",
      })
      return
    }
    setUploadSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("type", uploadType)
      formData.append("visibility", uploadVisibility)
      if (uploadDealId) formData.append("dealId", uploadDealId)

      const csrfToken = getCsrfToken()
      const uploadHeaders: Record<string, string> = {}
      if (csrfToken) uploadHeaders["x-csrf-token"] = csrfToken

      const res = await fetch("/api/dealer/documents/upload", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      })

      if (res.ok) {
        setShowUploadModal(false)
        setUploadFile(null)
        setUploadDealId("")
        setUploadType("OTHER")
        setUploadVisibility("BUYER_ADMIN")
        toast({ title: "Document uploaded", description: "Your document has been uploaded successfully." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: errorData.error || "Failed to upload document.",
        })
      }
    } catch (err) {
      console.error("Dealer upload error:", err)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Unable to upload document. Please try again.",
      })
    } finally {
      setUploadSubmitting(false)
    }
  }

  const handleDeleteDealerUpload = async (docId: string) => {
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE", headers: csrfHeaders() })
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

  return (
    <Suspense fallback={<Loading />}>
      <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Documents"
          subtitle="Manage deal documents and request buyer documents"
          primaryAction={{
            label: "Request Document",
            onClick: () => setShowRequestModal(true),
            icon: <Plus className="h-4 w-4 mr-2" />,
          }}
        />

        {/* Tabs: Documents / Requests / Dealer Uploads */}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">
              Buyer Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{documents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Document Requests
              {requests.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{requests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dealer-uploads">
              Dealer Uploads
              {dealerUploads.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{dealerUploads.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No buyer documents"
                description="Buyer documents for your deals will appear here. Request documents from buyers to complete deals."
                primaryCta={{ label: "Request Document", onClick: () => setShowRequestModal(true) }}
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
                                <span className="font-medium truncate max-w-[200px]">{doc.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{typeLabels[doc.type] || doc.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[doc.status] || "bg-muted"}>{doc.status}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(doc.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                {doc.status === "UPLOADED" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setReviewDoc(doc); setShowReviewModal(true) }}
                                  >
                                    <FileCheck className="h-4 w-4" />
                                  </Button>
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
                description="Request required documents from buyers to complete deals."
                primaryCta={{ label: "Request Document", onClick: () => setShowRequestModal(true) }}
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
                            Deal: {req.dealId.slice(0, 8)}… | Buyer: {req.buyerId.slice(0, 8)}…
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
          <TabsContent value="dealer-uploads" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowUploadModal(true)} className="bg-primary hover:bg-primary/90">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
            {dealerUploads.length === 0 ? (
              <EmptyState
                icon={<Upload className="h-8 w-8 text-muted-foreground" />}
                title="No dealer uploads"
                description="Upload documents related to deals or for internal use."
                primaryCta={{ label: "Upload Document", onClick: () => setShowUploadModal(true) }}
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
                          <TableHead>Visibility</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dealerUploads.map((doc) => (
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
                              <Badge className={
                                doc.uploadVisibility === "ADMIN_ONLY" ? "bg-yellow-100 text-yellow-800" :
                                doc.uploadVisibility === "DEALER_ONLY" ? "bg-gray-100 text-gray-800" :
                                "bg-green-100 text-green-800"
                              }>
                                {doc.uploadVisibility === "ADMIN_ONLY" ? "Admin Only" :
                                 doc.uploadVisibility === "DEALER_ONLY" ? "Internal" :
                                 "Shared"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(doc.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteDealerUpload(doc.id)}
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
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Document Modal */}
        <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Request Document from Buyer</DialogTitle>
              <DialogDescription>
                Request a required document from the buyer to complete the deal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Deal ID</label>
                <Input
                  className="mt-1"
                  placeholder="Enter deal ID"
                  value={reqDealId}
                  onChange={(e) => setReqDealId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Buyer User ID</label>
                <Input
                  className="mt-1"
                  placeholder="Enter buyer user ID"
                  value={reqBuyerId}
                  onChange={(e) => setReqBuyerId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select value={reqType} onValueChange={setReqType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
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
                <Textarea
                  className="mt-1"
                  placeholder="Any specific instructions for the buyer..."
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                />
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
              <DialogDescription>
                Approve or reject this uploaded document.
              </DialogDescription>
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
                <div>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={reviewDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-2" />View Document
                    </a>
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                  <Textarea
                    className="mt-1"
                    placeholder="Reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => reviewDoc && handleReject(reviewDoc.id)}
                disabled={!rejectionReason}
              >
                <XCircle className="h-4 w-4 mr-2" />Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => reviewDoc && handleApprove(reviewDoc.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Upload Document Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a document associated with a deal or for internal use.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Deal (optional)</label>
                <Select value={uploadDealId} onValueChange={setUploadDealId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No deal — internal document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No deal — internal document</SelectItem>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>{deal.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
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
                <label className="text-sm font-medium">Visibility</label>
                <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER_ADMIN">Shared (buyer + admin can see)</SelectItem>
                    <SelectItem value="ADMIN_ONLY">Admin Only (buyer cannot see)</SelectItem>
                    <SelectItem value="DEALER_ONLY">Internal (dealer only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">File</label>
                <Input
                  className="mt-1"
                  type="file"
                  accept={ACCEPTED_DOCUMENT_MIME_TYPES_INPUT}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleDealerUpload}
                disabled={!uploadFile || uploadSubmitting}
              >
                {uploadSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </ProtectedRoute>
    </Suspense>
  )
}
