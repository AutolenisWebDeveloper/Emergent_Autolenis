"use client"

import { useEffect, useState, useCallback } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Clock,
  DollarSign,
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
  submissionNotes: string | null
  sha256: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  rejectionReason: string | null
  rejectionReasonCode: string | null
  decisionAt: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminExternalPreApprovalsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionReasonCode, setRejectionReasonCode] = useState("")
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/external-preapprovals")
      const data = await response.json()
      if (data.success) {
        setSubmissions(data.data.submissions)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error("Failed to load submissions:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load submissions",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const handleReview = async (submissionId: string) => {
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
            rejectionReason:
              reviewAction === "REJECTED" ? rejectionReason : undefined,
            rejectionReasonCode:
              reviewAction === "REJECTED" ? rejectionReasonCode || undefined : undefined,
          }),
        },
      )
      const data = await response.json()

      if (data.success) {
        toast({
          title: reviewAction === "APPROVED" ? "Approved" : "Rejected",
          description:
            reviewAction === "APPROVED"
              ? "Pre-approval approved and PreQualification created."
              : "Pre-approval rejected.",
        })
        setReviewingId(null)
        setReviewAction(null)
        setReviewNotes("")
        setRejectionReason("")
        setRejectionReasonCode("")
        loadSubmissions()
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
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">External Pre-Approval Review</h1>
          <p className="text-muted-foreground">
            Review and approve buyer-submitted bank pre-approval documents ({total} pending)
          </p>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No Pending Submissions</h3>
              <p className="text-muted-foreground mt-1">
                All external pre-approval submissions have been reviewed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">
                          {submission.lenderName}
                        </CardTitle>
                        <CardDescription>
                          Buyer: {submission.buyerId} •{" "}
                          Submitted:{" "}
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Approved Amount
                        </p>
                        <p className="font-medium">
                          {formatCurrency(submission.approvedAmount)}
                        </p>
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
                          <p className="font-medium">
                            {submission.termMonths} months
                          </p>
                        </div>
                      </div>
                    )}
                    {submission.originalFileName && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Document
                        </p>
                        <p className="font-medium text-sm truncate">
                          {submission.originalFileName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Buyer Notes */}
                  {submission.submissionNotes && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <span className="font-medium">Buyer Notes:</span>{" "}
                      {submission.submissionNotes}
                    </div>
                  )}

                  {/* File Integrity */}
                  {submission.sha256 && (
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      SHA-256: {submission.sha256}
                    </div>
                  )}

                  {/* Review Actions */}
                  {reviewingId === submission.id ? (
                    <div className="space-y-3 p-4 rounded-lg border">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            reviewAction === "APPROVED" ? "default" : "outline"
                          }
                          onClick={() => setReviewAction("APPROVED")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            reviewAction === "REJECTED"
                              ? "destructive"
                              : "outline"
                          }
                          onClick={() => setReviewAction("REJECTED")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Review Notes
                        </label>
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
                              Rejection Reason{" "}
                              <span className="text-destructive">*</span>
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
                          onClick={() => handleReview(submission.id)}
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : null}
                          Confirm{" "}
                          {reviewAction === "APPROVED" ? "Approval" : "Rejection"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReviewingId(null)
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
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingId(submission.id)}
                      >
                        Review Submission
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/admin/external-preapprovals/${submission.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
