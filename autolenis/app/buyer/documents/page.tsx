"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  Shield,
  CreditCard,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Pencil,
  Replace,
  Trash2,
  FileCheck,
} from "lucide-react"
import { Suspense } from "react"
import { useToast } from "@/hooks/use-toast"
import { ACCEPTED_DOCUMENT_MIME_TYPES_INPUT, MAX_DOCUMENT_FILE_SIZE } from "@/lib/utils/documents"
import { csrfHeaders, getCsrfToken } from "@/lib/csrf-client"
import { extractApiError } from "@/lib/utils/error-message"

interface DealDocument {
  id: string
  ownerUserId: string
  dealId: string | null
  type: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileUrl: string
  status: string
  rejectionReason: string | null
  requestId: string | null
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
  decidedByUserId: string | null
  decisionNotes: string | null
  decidedAt: string | null
  createdAt: string
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

const typeIcons: Record<string, typeof FileText> = {
  ID: CreditCard,
  INSURANCE_PROOF: Shield,
  PAY_STUB: FileText,
  BANK_STATEMENT: FileText,
  TRADE_IN_TITLE: Car,
  PRE_APPROVAL_LETTER: FileCheck,
  OTHER: FileText,
}

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  REQUESTED: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  UPLOADED: { color: "bg-blue-100 text-blue-800", icon: Upload },
  APPROVED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  REJECTED: { color: "bg-red-100 text-red-800", icon: XCircle },
  PENDING_REVIEW: { color: "bg-blue-100 text-blue-800", icon: Clock },
}

const Loading = () => null

export default function BuyerDocumentsPage() {
  const [documents, setDocuments] = useState<DealDocument[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState("ID")
  const [uploadFileName, setUploadFileName] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFileUrl, setUploadFileUrl] = useState("")
  const [uploadRequestId, setUploadRequestId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editDoc, setEditDoc] = useState<DealDocument | null>(null)
  const [editFileName, setEditFileName] = useState("")
  const [editType, setEditType] = useState("ID")
  const [editSubmitting, setEditSubmitting] = useState(false)
  // Replace modal state
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [replaceDoc, setReplaceDoc] = useState<DealDocument | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replaceSubmitting, setReplaceSubmitting] = useState(false)
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [docsRes, reqsRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/document-requests"),
      ])
      const docsData = await docsRes.json()
      const reqsData = await reqsRes.json()
      setDocuments(docsData.documents || [])
      setRequests(reqsData.requests || [])
    } catch (err) {
      console.error("Error fetching documents:", err)
      toast({
        variant: "destructive",
        title: "Failed to load documents",
        description: "Unable to fetch your documents. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpload = async () => {
    if (!uploadFileName || (!uploadFileUrl && !uploadFile)) {
      toast({
        variant: "destructive",
        title: "Missing document",
        description: "Please select a file or provide a URL.",
      })
      return
    }
    if (uploadFile && uploadFile.size > MAX_DOCUMENT_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 25 MB. Please choose a smaller file.",
      })
      return
    }
    setUploading(true)
    try {
      const csrfToken = getCsrfToken()
      const res = uploadFile
        ? await fetch("/api/documents", {
            method: "POST",
            headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
            body: (() => {
              const formData = new FormData()
              formData.append("type", uploadType)
              formData.append("fileName", uploadFileName)
              formData.append("file", uploadFile)
              if (uploadRequestId) formData.append("requestId", uploadRequestId)
              return formData
            })(),
          })
        : await fetch("/api/documents", {
            method: "POST",
            headers: csrfHeaders(),
            body: JSON.stringify({
              type: uploadType,
              fileName: uploadFileName,
              fileUrl: uploadFileUrl,
              requestId: uploadRequestId,
            }),
          })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setShowUploadModal(false)
        setUploadFileName("")
        setUploadFile(null)
        setUploadFileUrl("")
        setUploadRequestId(null)
        setUploadType("ID")
        if (data.document) {
          setDocuments((prev) => [data.document, ...prev])
        }
        toast({
          title: "Document uploaded",
          description: "Your document has been uploaded successfully.",
        })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errMsg = extractApiError(errorData.error, "Upload failed")
        throw new Error(errMsg)
      }
    } catch (err) {
      console.error("Upload error:", err)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unable to upload document",
      })
    } finally {
      setUploading(false)
    }
  }

  const openUploadForRequest = (req: DocumentRequest) => {
    setUploadType(req.type)
    setUploadRequestId(req.id)
    setShowUploadModal(true)
  }

  const openEditModal = (doc: DealDocument) => {
    setEditDoc(doc)
    setEditFileName(doc.fileName)
    setEditType(doc.type)
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!editDoc || !editFileName) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/documents/${editDoc.id}`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ fileName: editFileName, type: editType }),
      })
      if (res.ok) {
        setShowEditModal(false)
        setEditDoc(null)
        toast({ title: "Document updated", description: "Document details have been saved." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Update failed", description: extractApiError(errorData.error, "Unable to update document.") })
      }
    } catch {
      toast({ variant: "destructive", title: "Update failed", description: "Unable to update document. Please try again." })
    } finally {
      setEditSubmitting(false)
    }
  }

  const openReplaceModal = (doc: DealDocument) => {
    setReplaceDoc(doc)
    setReplaceFile(null)
    setShowReplaceModal(true)
  }

  const handleReplace = async () => {
    if (!replaceDoc || !replaceFile) return
    if (replaceFile.size > MAX_DOCUMENT_FILE_SIZE) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 25 MB." })
      return
    }
    setReplaceSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", replaceFile)
      const replaceCsrfToken = getCsrfToken()
      const res = await fetch(`/api/documents/${replaceDoc.id}`, {
        method: "PUT",
        headers: replaceCsrfToken ? { "x-csrf-token": replaceCsrfToken } : undefined,
        body: formData,
      })
      if (res.ok) {
        setShowReplaceModal(false)
        setReplaceDoc(null)
        setReplaceFile(null)
        toast({ title: "Document replaced", description: "The file has been replaced successfully." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Replace failed", description: extractApiError(errorData.error, "Unable to replace document.") })
      }
    } catch {
      toast({ variant: "destructive", title: "Replace failed", description: "Unable to replace document. Please try again." })
    } finally {
      setReplaceSubmitting(false)
    }
  }

  const handleDelete = async (docId: string) => {
    setDeletingId(docId)
    try {
      const deleteToken = getCsrfToken()
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: deleteToken ? { "x-csrf-token": deleteToken } : undefined,
      })
      if (res.ok) {
        toast({ title: "Document deleted", description: "The document has been removed." })
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Delete failed", description: extractApiError(errorData.error, "Unable to delete document.") })
      }
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Unable to delete document. Please try again." })
    } finally {
      setDeletingId(null)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "REQUESTED")
  const filteredDocs = documents.filter((d) =>
    searchQuery ? d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  return (
    <Suspense fallback={<Loading />}>
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <PageHeader
            title="Document Center"
            subtitle="Upload and manage your documents"
            primaryAction={{
              label: "Upload Document",
              onClick: () => {
                setUploadRequestId(null)
                setShowUploadModal(true)
              },
              icon: <Upload className="h-4 w-4 mr-2" />,
            }}
          />

          {/* Requested Documents Section */}
          {pendingRequests.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Requested Documents ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  {pendingRequests.map((req) => {
                    const Icon = typeIcons[req.type] || FileText
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-yellow-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {typeLabels[req.type] || req.type}
                            </p>
                            {req.notes && (
                              <p className="text-xs text-muted-foreground truncate">{req.notes}</p>
                            )}
                            {req.dueDate && (
                              <p className="text-xs text-yellow-700">
                                Due: {new Date(req.dueDate).toLocaleDateString()}
                              </p>
                            )}
                            {req.required && (
                              <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 flex-shrink-0 ml-2"
                          onClick={() => openUploadForRequest(req)}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Document Tabs */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="requests">
                All Requests
                {requests.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{requests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                  title="No documents uploaded"
                  description="Upload your driver's license and other documents to get started with your vehicle purchase."
                  primaryCta={{
                    label: "Upload Document",
                    onClick: () => setShowUploadModal(true),
                  }}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDocs.map((doc) => {
                    const Icon = typeIcons[doc.type] || FileText
                    const statusInfo = statusConfig[doc.status] || statusConfig.UPLOADED
                    return (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{doc.fileName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {typeLabels[doc.type] || doc.type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                              <div className="mt-2">
                                <Badge className={statusInfo.color}>
                                  {doc.status}
                                </Badge>
                              </div>
                              {doc.rejectionReason && (
                                <p className="text-xs text-red-600 mt-1">{doc.rejectionReason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              asChild
                            >
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              asChild
                            >
                              <a href={doc.fileUrl} download>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => openEditModal(doc)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent"
                              onClick={() => openReplaceModal(doc)}
                            >
                              <Replace className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                            >
                              {deletingId === doc.id ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              {requests.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                  title="No document requests"
                  description="When a dealer or admin requests documents for your deal, they will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const Icon = typeIcons[req.type] || FileText
                    const statusInfo = statusConfig[req.status] || statusConfig.REQUESTED
                    return (
                      <Card key={req.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">{typeLabels[req.type] || req.type}</p>
                                {req.notes && (
                                  <p className="text-sm text-muted-foreground truncate">{req.notes}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={statusInfo.color}>{req.status}</Badge>
                                  {req.required && (
                                    <Badge variant="outline" className="text-xs">Required</Badge>
                                  )}
                                  {req.dueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {new Date(req.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {req.decisionNotes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Note: {req.decisionNotes}
                                  </p>
                                )}
                              </div>
                            </div>
                            {req.status === "REQUESTED" && (
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => openUploadForRequest(req)}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Upload Modal */}
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className="max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  {uploadRequestId
                    ? "Upload a document to satisfy the request."
                    : "Upload a document to your account."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <Select value={uploadType} onValueChange={setUploadType} disabled={!!uploadRequestId}>
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
                  <label className="text-sm font-medium">File Name</label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. drivers-license.pdf"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Upload File</label>
                    <Input
                      className="mt-1"
                      type="file"
                      accept={ACCEPTED_DOCUMENT_MIME_TYPES_INPUT}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setUploadFile(file)
                      if (file) {
                        setUploadFileName(file.name)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Accepted: PDF or image files.</p>
                </div>
                <div>
                  <label className="text-sm font-medium">File URL (optional)</label>
                  <Input
                    className="mt-1"
                    placeholder="https://storage.example.com/file.pdf"
                    value={uploadFileUrl}
                    onChange={(e) => setUploadFileUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can paste a link instead of uploading a file.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleUpload}
                  disabled={!uploadFileName || (!uploadFileUrl && !uploadFile) || uploading}
                >
                  {uploading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Document Modal */}
          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent className="max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Edit Document</DialogTitle>
                <DialogDescription>Update document details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">File Name</label>
                  <Input
                    className="mt-1"
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ID">Government ID</SelectItem>
                      <SelectItem value="INSURANCE_PROOF">Insurance Proof</SelectItem>
                      <SelectItem value="PAY_STUB">Pay Stub</SelectItem>
                      <SelectItem value="BANK_STATEMENT">Bank Statement</SelectItem>
                      <SelectItem value="TRADE_IN_TITLE">Trade-In Title</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleEdit}
                  disabled={!editFileName || editSubmitting}
                >
                  {editSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Replace Document Modal */}
          <Dialog open={showReplaceModal} onOpenChange={setShowReplaceModal}>
            <DialogContent className="max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Replace Document File</DialogTitle>
                <DialogDescription>
                  Upload a new file to replace &ldquo;{replaceDoc?.fileName}&rdquo;. The document type and settings will be preserved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">New File</label>
                  <Input
                    className="mt-1"
                    type="file"
                    accept={ACCEPTED_DOCUMENT_MIME_TYPES_INPUT}
                    onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Accepted: PDF or image files (max 25 MB).</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReplaceModal(false)}>Cancel</Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleReplace}
                  disabled={!replaceFile || replaceSubmitting}
                >
                  {replaceSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Replace className="h-4 w-4 mr-2" />}
                  Replace File
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ProtectedRoute>
    </Suspense>
  )
}
