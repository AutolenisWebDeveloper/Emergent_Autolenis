"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  RefreshCw,
  Mail,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExternalSubmission {
  id: string
  status: string
  lenderName: string
  approvedAmount: number
  apr: number | null
  termMonths: number | null
  submissionNotes: string | null
  reviewNotes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export default function ManualPreApprovalStatusPage() {
  const [submission, setSubmission] = useState<ExternalSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const response = await fetch("/api/buyer/prequal/external")
        const data = await response.json()
        if (data.success && data.data?.submission) {
          setSubmission(data.data.submission)
        }
      } catch (error) {
        console.error("Failed to load submission:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load submission status",
        })
      } finally {
        setLoading(false)
      }
    }
    loadSubmission()
  }, [toast])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)

  const getStatusConfig = (status: string) => {
    const configs: Record<string, {
      variant: "default" | "destructive" | "secondary" | "outline"
      label: string
      icon: typeof Clock
      color: string
      description: string
    }> = {
      SUBMITTED: {
        variant: "secondary",
        label: "Submitted",
        icon: Clock,
        color: "text-blue-600",
        description: "Your pre-approval has been submitted and is awaiting review.",
      },
      IN_REVIEW: {
        variant: "outline",
        label: "In Review",
        icon: FileText,
        color: "text-yellow-600",
        description: "An admin is currently reviewing your pre-approval documents.",
      },
      APPROVED: {
        variant: "default",
        label: "Approved",
        icon: CheckCircle2,
        color: "text-green-600",
        description: "Your pre-approval has been approved! You are now pre-qualified to shop for vehicles.",
      },
      REJECTED: {
        variant: "destructive",
        label: "Rejected",
        icon: XCircle,
        color: "text-red-600",
        description: "Your pre-approval was not approved. You may resubmit with updated documentation.",
      },
      EXPIRED: {
        variant: "secondary",
        label: "Expired",
        icon: Clock,
        color: "text-gray-500",
        description: "Your pre-approval submission has expired. Please submit a new one.",
      },
      SUPERSEDED: {
        variant: "secondary",
        label: "Superseded",
        icon: RefreshCw,
        color: "text-gray-500",
        description: "This submission has been replaced by a newer one.",
      },
    }
    return configs[status] || {
      variant: "secondary" as const,
      label: status,
      icon: Clock,
      color: "text-gray-500",
      description: "",
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!submission) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/buyer/prequal")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Pre-Approval Status</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">No Submission Found</h3>
              <p className="text-muted-foreground">
                You haven&apos;t submitted a bank pre-approval yet.
              </p>
              <Button onClick={() => router.push("/buyer/prequal/manual-preapproval")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Pre-Approval
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  const statusConfig = getStatusConfig(submission.status)
  const StatusIcon = statusConfig.icon

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/buyer/prequal")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Pre-Approval Status</h1>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
                <div>
                  <CardTitle className="text-xl">{statusConfig.label}</CardTitle>
                  <CardDescription>{statusConfig.description}</CardDescription>
                </div>
              </div>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Lender</span>
                <p className="font-medium">{submission.lenderName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Approved Amount</span>
                <p className="font-medium">{formatCurrency(submission.approvedAmount)}</p>
              </div>
              {submission.apr !== null && (
                <div>
                  <span className="text-muted-foreground">APR</span>
                  <p className="font-medium">{submission.apr}%</p>
                </div>
              )}
              {submission.termMonths !== null && (
                <div>
                  <span className="text-muted-foreground">Term</span>
                  <p className="font-medium">{submission.termMonths} months</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Submitted</span>
                <p className="font-medium">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated</span>
                <p className="font-medium">
                  {new Date(submission.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {submission.submissionNotes && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <span className="font-medium">Your Notes:</span> {submission.submissionNotes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rejection Reason */}
        {submission.status === "REJECTED" && submission.rejectionReason && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Rejection Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{submission.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        {/* Review Notes (if any) */}
        {submission.reviewNotes && submission.status === "APPROVED" && (
          <Card className="border-green-500/30">
            <CardHeader>
              <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Reviewer Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{submission.reviewNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {submission.status === "REJECTED" && (
            <Button onClick={() => router.push("/buyer/prequal/manual-preapproval")} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Resubmit Pre-Approval
            </Button>
          )}
          {submission.status === "APPROVED" && (
            <Button onClick={() => router.push("/buyer/search")} className="flex-1">
              Start Shopping
            </Button>
          )}
          {(submission.status === "SUBMITTED" || submission.status === "IN_REVIEW") && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push("/buyer/prequal/manual-preapproval")}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Submission
              </Button>
              <a href="mailto:support@autolenis.com">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </a>
            </>
          )}
          {(submission.status === "EXPIRED" || submission.status === "SUPERSEDED") && (
            <Button onClick={() => router.push("/buyer/prequal/manual-preapproval")} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Pre-Approval
            </Button>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
