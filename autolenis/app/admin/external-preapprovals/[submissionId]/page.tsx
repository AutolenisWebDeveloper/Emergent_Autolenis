"use client"

import { useEffect, useState, useCallback } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  Clock,
  Download,
  Shield,
  User,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"

interface Submission {
  id: string
  buyerId: string
  lenderName: string
  approvedAmount: number
  apr: number | null
  termMonths: number | null
  status: string
  documentStoragePath: string | null
  originalFileName: string | null
  fileSizeBytes: number | null
  mimeType: string | null
  submissionNotes: string | null
  sha256: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  rejectionReason: string | null
  rejectionReasonCode: string | null
  decisionAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminSubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const submissionId = params.submissionId as string

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionReasonCode, setRejectionReasonCode] = useState("")
  const [processing, setProcessing] = useState(false)
  const [documentLoading, setDocumentLoading] = useState(false)

  const loadSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/external-preapprovals/${submissionId}/review`, {
        method: "GET",
      })
      if (response.status === 405) {
        // GET not available on review endpoint, fetch from list and filter
        const listRes = await fetch("/api/admin/external-preapprovals?perPage=100")
        const listData = await listRes.json()
        if (listData.success) {
          const found = listData.data.submissions.find(
            (s: Submission) => s.id === submissionId,
          )
          setSubmission(found || null)
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    loadSubmission()
  }, [loadSubmission])

  const handleViewDocument = async () => {
    setDocumentLoading(true)
    try {
      const response = await fetch(
        `/api/admin/external-preapprovals/${submissionId}/document`,
      )
      const data = await response.json()
      if (data.success && data.data.signedUrl) {
        window.open(data.data.signedUrl, "_blank", "noopener,noreferrer")
      } else {
        toast({
          variant: "destructive",
          title: "Document unavailable",
          description: data.error || "Unable to generate document URL",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load document",
      })
    } finally {
      setDocumentLoading(false)
    }
  }

  const handleReview = async () => {
    if (!reviewAction) return
    setProcessing(true)
    try {
      const response = await fetch(
        `/api/admin/external-preapprovals/${submissionId}/review`,
        {
          method: "POST",
          headers: csrfHeaders(),
          body: JSON.stringify({
            action: reviewAction,
            reviewNotes: reviewNotes || undefined,
            rejectionReason: reviewAction === "REJECTED" ? rejectionReason : undefined,
            rejectionReasonCode: reviewAction === "REJECTED" ? rejectionReasonCode || undefined : undefined,
          }),
        },
      )
      const data = await response.json()

      if (data.success) {
        toast({
          title: reviewAction === "APPROVED" ? "Approved" : "Rejected",
          description:
            reviewAction === "APPROVED"
              ? "Pre-approval verified and PreQualification created."
              : "Pre-approval rejected.",
        })
        setReviewAction(null)
        loadSubmission()
      } else {
        throw new Error(extractApiError(data.error, "Review failed"))
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Review failed",
        description: error instanceof Error ? error.message : "Review failed",
      })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      SUBMITTED: { variant: "secondary", label: "Submitted" },
      IN_REVIEW: { variant: "outline", label: "In Review" },
      APPROVED: { variant: "default", label: "Approved" },
      REJECTED: { variant: "destructive", label: "Rejected" },
      EXPIRED: { variant: "secondary", label: "Expired" },
      SUPERSEDED: { variant: "secondary", label: "Superseded" },
    }
    const style = styles[status] || { variant: "secondary" as const, label: status }
    return <Badge variant={style.variant}>{style.label}</Badge>
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!submission) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/external-preapprovals")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Queue
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Submission Not Found</h3>
              <p className="text-muted-foreground mt-1">
                The requested submission could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  const isPending = submission.status === "SUBMITTED" || submission.status === "IN_REVIEW"

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/external-preapprovals")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Queue
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Submission Detail</h1>
            <p className="text-muted-foreground text-sm">{submission.id}</p>
          </div>
          {getStatusBadge(submission.status)}
        </div>

        {/* Submission Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">{submission.lenderName}</CardTitle>
                <CardDescription>
                  Submitted {new Date(submission.createdAt).toLocaleString()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Financial Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Approved Amount</p>
                  <p className="font-medium">{formatCurrency(submission.approvedAmount)}</p>
                </div>
              </div>
              {submission.apr !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">APR</p>
                  <p className="font-medium">{submission.apr}%</p>
                </div>
              )}
              {submission.termMonths !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Term</p>
                    <p className="font-medium">{submission.termMonths} months</p>
                  </div>
                </div>
              )}
              {submission.expiresAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {new Date(submission.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Buyer Info */}
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="text-muted-foreground">Buyer ID:</span>{" "}
                <span className="font-mono text-xs">{submission.buyerId}</span>
              </span>
            </div>

            {/* Buyer Notes */}
            {submission.submissionNotes && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <span className="font-medium">Buyer Notes:</span> {submission.submissionNotes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Card */}
        {submission.documentStoragePath && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Document
              </CardTitle>
              <CardDescription>
                Secure document access via time-limited signed URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {submission.originalFileName && (
                  <div>
                    <span className="text-muted-foreground">Original Filename</span>
                    <p className="font-medium truncate">{submission.originalFileName}</p>
                  </div>
                )}
                {submission.mimeType && (
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium">{submission.mimeType}</p>
                  </div>
                )}
                {submission.fileSizeBytes && (
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <p className="font-medium">
                      {(submission.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
              {submission.sha256 && (
                <div className="text-xs text-muted-foreground font-mono truncate">
                  SHA-256: {submission.sha256}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDocument}
                disabled={documentLoading}
              >
                {documentLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                View Document (Signed URL)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Review History */}
        {(submission.reviewedBy || submission.reviewNotes || submission.rejectionReason) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {submission.reviewedBy && (
                <div>
                  <span className="text-muted-foreground">Reviewed By:</span>{" "}
                  <span className="font-mono text-xs">{submission.reviewedBy}</span>
                </div>
              )}
              {submission.reviewedAt && (
                <div>
                  <span className="text-muted-foreground">Reviewed At:</span>{" "}
                  {new Date(submission.reviewedAt).toLocaleString()}
                </div>
              )}
              {submission.decisionAt && (
                <div>
                  <span className="text-muted-foreground">Decision At:</span>{" "}
                  {new Date(submission.decisionAt).toLocaleString()}
                </div>
              )}
              {submission.reviewNotes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">Notes:</span> {submission.reviewNotes}
                </div>
              )}
              {submission.rejectionReason && (
                <div className="p-3 rounded-lg bg-destructive/10">
                  <span className="font-medium text-destructive">Rejection Reason:</span>{" "}
                  {submission.rejectionReason}
                  {submission.rejectionReasonCode && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {submission.rejectionReasonCode}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Actions (only for pending submissions) */}
        {isPending && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Actions</CardTitle>
              <CardDescription>Approve or reject this submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={reviewAction === "APPROVED" ? "default" : "outline"}
                  onClick={() => setReviewAction("APPROVED")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant={reviewAction === "REJECTED" ? "destructive" : "outline"}
                  onClick={() => setReviewAction("REJECTED")}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>

              {reviewAction && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Review Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                      placeholder="Optional review notes..."
                    />
                  </div>

                  {reviewAction === "REJECTED" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-destructive">
                          Rejection Reason Code
                        </label>
                        <select
                          value={rejectionReasonCode}
                          onChange={(e) => setRejectionReasonCode(e.target.value)}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select a reason code</option>
                          <option value="EXPIRED_DOCUMENT">Expired Document</option>
                          <option value="UNVERIFIABLE_LENDER">Unverifiable Lender</option>
                          <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
                          <option value="ILLEGIBLE_DOCUMENT">Illegible Document</option>
                          <option value="INCOMPLETE_INFORMATION">Incomplete Information</option>
                          <option value="SUSPECTED_FRAUD">Suspected Fraud</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-destructive">
                          Rejection Reason <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-1 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm min-h-[60px]"
                          placeholder="Explain why this pre-approval is being rejected..."
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={
                        processing ||
                        !reviewAction ||
                        (reviewAction === "REJECTED" && !rejectionReason)
                      }
                      onClick={handleReview}
                    >
                      {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Confirm {reviewAction === "APPROVED" ? "Approval" : "Rejection"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReviewAction(null)
                        setReviewNotes("")
                        setRejectionReason("")
                        setRejectionReasonCode("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
