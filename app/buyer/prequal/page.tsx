"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { extractApiError } from "@/lib/utils/error-message"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  RefreshCw,
  Car,
  Shield,
  AlertTriangle,
  Upload,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PreQualData {
  id: string
  status: string
  creditTier: string
  maxOtdAmountCents: number
  minMonthlyPaymentCents: number
  maxMonthlyPaymentCents: number
  dtiRatio: number
  expiresAt: string
  providerName: string
  source?: string
  createdAt: string
}

interface ExternalSubmission {
  id: string
  status: string
  lenderName: string
  approvedAmount: number
  apr: number | null
  termMonths: number | null
  reviewNotes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export default function BuyerPreQualPage() {
  const [preQual, setPreQual] = useState<PreQualData | null>(null)
  const [externalSubmission, setExternalSubmission] = useState<ExternalSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadPreQual = async () => {
      try {
        const prequalRes = await fetch("/api/buyer/prequal")
        const data = await prequalRes.json()

        if (data.success && data.data?.preQualification) {
          setPreQual(data.data.preQualification)
        } else {
          setPreQual(null)
        }

        if (data.data?.externalSubmission) {
          setExternalSubmission(data.data.externalSubmission)
        }
      } catch (error) {
        console.error("[v0] Failed to load pre-qualification:", error)
        toast({
          variant: "destructive",
        title: "Error",
        description: "Failed to load pre-qualification status",
      })
    } finally {
      setLoading(false)
    }
    }
    loadPreQual()
  }, [toast])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/buyer/prequal/refresh", {
        method: "POST",
        headers: csrfHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        setPreQual(data.data.preQualification)
        toast({
          title: "Pre-qualification refreshed",
          description: "Your pre-qualification has been updated.",
        })
      } else {
        throw new Error(extractApiError(data.error, "Failed to refresh"))
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: error.message || "Unable to refresh pre-qualification",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const formatCurrency = (cents: number | undefined | null) => {
    if (cents === undefined || cents === null) return "$0"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatDollars = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return "$0"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDaysUntilExpiry = () => {
    if (!preQual?.expiresAt) return null
    const expiresAt = new Date(preQual.expiresAt)
    const now = new Date()
    const diff = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const extractLenderName = (providerName: string | undefined | null) => {
    if (!providerName) return ""
    return providerName
      .replace("External Verified: ", "")
      .replace("External:", "")
  }

  const isExpired = () => {
    const days = getDaysUntilExpiry()
    return days !== null && days <= 0
  }

  const getCreditTierInfo = (tier: string | undefined) => {
    const tiers: Record<string, { label: string; color: string; description: string }> = {
      EXCELLENT: { label: "Excellent", color: "bg-green-500", description: "Best rates available" },
      PRIME: { label: "Prime", color: "bg-blue-500", description: "Great rates available" },
      NEAR_PRIME: { label: "Near Prime", color: "bg-yellow-500", description: "Good rates available" },
      SUBPRIME: { label: "Subprime", color: "bg-orange-500", description: "Standard rates" },
      GOOD: { label: "Good", color: "bg-blue-500", description: "Great rates available" },
      FAIR: { label: "Fair", color: "bg-yellow-500", description: "Good rates available" },
    }
    return tiers[tier || ""] || { label: tier || "Unknown", color: "bg-gray-500", description: "" }
  }

  const getSubmissionStatusBadge = (status: string) => {
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

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!preQual) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pre-Qualification</h1>
            <p className="text-muted-foreground">Get approved to start shopping for vehicles</p>
          </div>

          <Card className="border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Get Pre-Qualified Today</CardTitle>
              <CardDescription className="text-base max-w-md mx-auto">
                Complete a quick soft credit check to see your buying power. It won't affect your credit score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-medium">2 Minutes</div>
                  <div className="text-sm text-muted-foreground">Quick application</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-medium">Soft Pull</div>
                  <div className="text-sm text-muted-foreground">No credit impact</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="font-medium">30 Days</div>
                  <div className="text-sm text-muted-foreground">Approval valid</div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full">
                <Link href="/buyer/onboarding">Start Pre-Qualification</Link>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => router.push("/buyer/prequal/manual-preapproval")}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Bank Pre-Approval
              </Button>
            </CardContent>
          </Card>

          {/* External Submission Status */}
          {externalSubmission && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  External Pre-Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lender</span>
                  <span className="font-medium">{externalSubmission.lenderName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatDollars(externalSubmission.approvedAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getSubmissionStatusBadge(externalSubmission.status)}
                </div>
                {externalSubmission.rejectionReason && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-sm">
                    <span className="font-medium text-destructive">Rejection Reason:</span>{" "}
                    {externalSubmission.rejectionReason}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {externalSubmission.status === "REJECTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/buyer/prequal/manual-preapproval")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Resubmit
                    </Button>
                  )}
                  {(externalSubmission.status === "SUBMITTED" || externalSubmission.status === "IN_REVIEW") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/buyer/prequal/manual-preapproval")}
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
                        Contact Support
                      </Button>
                    </a>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/buyer/prequal/manual-preapproval/status")}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ProtectedRoute>
    )
  }

  const daysUntilExpiry = getDaysUntilExpiry()
  const expired = isExpired()
  const tierInfo = getCreditTierInfo(preQual.creditTier)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Pre-Qualification Status</h1>
            <p className="text-muted-foreground">Your current approval and financing information</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="w-full sm:w-auto bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>

        {expired && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Pre-Qualification Expired</h3>
                <p className="text-sm text-muted-foreground">
                  Your pre-qualification has expired. Please refresh to get updated approval.
                </p>
              </div>
              <Button onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!expired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="flex items-center gap-4 py-4">
              <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Expiring Soon</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your pre-qualification expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}. Consider
                  refreshing to extend your approval.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Source indicator for external approvals */}
        {preQual.source === "EXTERNAL_MANUAL" && (
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="flex items-center gap-4 py-4">
              <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">External Bank Pre-Approval</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This pre-qualification is based on your verified bank pre-approval from {extractLenderName(preQual.providerName)}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
              {expired ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={expired ? "destructive" : "default"}>{expired ? "Expired" : "Active"}</Badge>
                <Badge className={`${tierInfo.color} text-white`}>{tierInfo.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{tierInfo.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maximum Purchase Price</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(preQual.maxOtdAmountCents)}</div>
              <p className="text-xs text-muted-foreground mt-1">Out-the-door price</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. Monthly Payment</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(preQual.minMonthlyPaymentCents)} - {formatCurrency(preQual.maxMonthlyPaymentCents)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on 60-month term</p>
            </CardContent>
          </Card>
        </div>

        {/* Financing Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Financing Details</CardTitle>
            <CardDescription>Based on your credit profile and income verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Debt-to-Income Ratio</span>
                </div>
                <p className="text-2xl font-bold">
                  {preQual.dtiRatio !== undefined && preQual.dtiRatio !== null ? `${preQual.dtiRatio.toFixed(1)}%` : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {preQual.dtiRatio && preQual.dtiRatio < 36
                    ? "Excellent - well within healthy range"
                    : preQual.dtiRatio && preQual.dtiRatio < 43
                      ? "Good - within acceptable range"
                      : preQual.source === "EXTERNAL_MANUAL"
                        ? "Not applicable for external pre-approvals"
                        : "Moderate - may affect loan options"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Approval Valid Until</span>
                </div>
                <p className="text-2xl font-bold">
                  {preQual.expiresAt
                    ? new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(preQual.expiresAt))
                    : "N/A"}
                </p>
                {daysUntilExpiry !== null && !expired && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">What's Next?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span>Shop for vehicles up to your maximum approved amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span>Add vehicles to your shortlist and start an auction</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                  <span>Final approval subject to full credit check and income verification</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => router.push("/buyer/search")} size="lg" className="flex-1" disabled={expired}>
            <Car className="h-5 w-5 mr-2" />
            Start Shopping
          </Button>
          <Button variant="outline" onClick={() => router.push("/buyer/onboarding")} size="lg" className="flex-1">
            Update Information
          </Button>
        </div>

      </div>
    </ProtectedRoute>
  )
}
