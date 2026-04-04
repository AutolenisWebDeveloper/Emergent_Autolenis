"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Eye,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

interface Submission {
  id: string
  buyerId: string
  lenderName: string
  approvedAmount: number
  apr: number | null
  termMonths: number | null
  status: string
  documentUrl: string | null
  documentFileName: string | null
  rejectionReason: string | null
  createdAt: string
  buyer: {
    firstName: string
    lastName: string
    userId: string
  }
}

type ReviewAction = "VERIFY" | "REJECT"

export default function AdminPreApprovalsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("SUBMITTED,IN_REVIEW")
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [creditTier, setCreditTier] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const { toast } = useToast()

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/preapprovals?status=${filter}`)
      const data = await res.json()
      if (data.success) {
        setSubmissions(data.data.submissions)
      }
    } catch (error) {
      console.error("Failed to load submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleReview = async (submissionId: string) => {
    if (!reviewAction) return
    setSubmittingReview(true)
    try {
      const body: Record<string, unknown> = {
        action: reviewAction,
      }
      if (reviewAction === "REJECT") {
        body.rejectionReason = rejectionReason
      }
      if (adminNotes) body.adminNotes = adminNotes
      if (creditTier) body.creditTier = creditTier

      const res = await fetch(`/api/admin/preapprovals/${submissionId}/review`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        toast({
          title: reviewAction === "VERIFY" ? "Pre-approval verified" : "Pre-approval rejected",
          description:
            reviewAction === "VERIFY"
              ? "PreQualification has been created for the buyer."
              : "Buyer will be notified of the rejection.",
        })
        setReviewingId(null)
        setReviewAction(null)
        setRejectionReason("")
        setAdminNotes("")
        setCreditTier("")
        await loadSubmissions()
      } else {
        throw new Error(extractApiError(data.error, "Review failed"))
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Review failed",
        description: error instanceof Error ? error.message : "Unable to process review",
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      SUBMITTED: { label: "Submitted", variant: "secondary" },
      IN_REVIEW: { label: "In Review", variant: "outline" },
      APPROVED: { label: "Approved", variant: "default" },
      REJECTED: { label: "Rejected", variant: "destructive" },
      EXPIRED: { label: "Expired", variant: "destructive" },
      SUPERSEDED: { label: "Superseded", variant: "secondary" },
    }
    const info = statusMap[status] || { label: status, variant: "secondary" as const }
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">External Pre-Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and verify buyer-submitted lender pre-approvals
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === "SUBMITTED,IN_REVIEW" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("SUBMITTED,IN_REVIEW")}
          >
            <Clock className="h-4 w-4 mr-1" />
            Pending Review
          </Button>
          <Button
            variant={filter === "APPROVED" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("APPROVED")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approved
          </Button>
          <Button
            variant={filter === "REJECTED" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("REJECTED")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No submissions found</h3>
              <p className="text-muted-foreground">
                No external pre-approval submissions match the current filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {sub.buyer.firstName} {sub.buyer.lastName}
                      </CardTitle>
                      <CardDescription>
                        {sub.lenderName} • ${sub.approvedAmount.toLocaleString()}
                        {sub.apr !== null && ` • ${sub.apr}% APR`}
                        {sub.termMonths !== null && ` • ${sub.termMonths} months`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sub.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Submitted: {new Date(sub.createdAt).toLocaleDateString()}
                      {sub.documentFileName && (
                        <span className="ml-2">
                          <FileText className="h-3 w-3 inline mr-1" />
                          Document attached
                        </span>
                      )}
                    </div>

                    {(sub.status === "SUBMITTED" || sub.status === "IN_REVIEW") && (
                      <div className="flex gap-2">
                        {reviewingId !== sub.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewingId(sub.id)
                              setReviewAction(null)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setReviewingId(null)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {sub.rejectionReason && (
                    <div className="mt-2 text-sm text-destructive">
                      Rejection reason: {sub.rejectionReason}
                    </div>
                  )}

                  {/* Review Panel */}
                  {reviewingId === sub.id && (
                    <div className="mt-4 border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={reviewAction === "VERIFY" ? "default" : "outline"}
                          onClick={() => setReviewAction("VERIFY")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant={reviewAction === "REJECT" ? "destructive" : "outline"}
                          onClick={() => setReviewAction("REJECT")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>

                      {reviewAction === "REJECT" && (
                        <div className="space-y-2">
                          <Label>Rejection Reason *</Label>
                          <Input
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Document is illegible or expired"
                          />
                        </div>
                      )}

                      {reviewAction === "VERIFY" && (
                        <div className="space-y-2">
                          <Label>Credit Tier (optional override)</Label>
                          <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={creditTier}
                            onChange={(e) => setCreditTier(e.target.value)}
                          >
                            <option value="">Auto-detect</option>
                            <option value="EXCELLENT">Excellent</option>
                            <option value="GOOD">Good</option>
                            <option value="FAIR">Fair</option>
                            <option value="POOR">Poor</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Admin Notes</Label>
                        <Input
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes..."
                        />
                      </div>

                      <Button
                        onClick={() => handleReview(sub.id)}
                        disabled={
                          !reviewAction ||
                          submittingReview ||
                          (reviewAction === "REJECT" && !rejectionReason)
                        }
                        variant={reviewAction === "REJECT" ? "destructive" : "default"}
                        className="w-full"
                      >
                        {submittingReview
                          ? "Processing..."
                          : reviewAction === "VERIFY"
                            ? "Confirm Verification"
                            : "Confirm Rejection"}
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
