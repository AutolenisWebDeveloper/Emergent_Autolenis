"use client"

import type React from "react"
import { csrfHeaders, getCsrfToken } from "@/lib/csrf-client"
import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import {
  Shield,
  Upload,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText,
  AlertCircle,
} from "lucide-react"
import { INSURANCE_DASHBOARD_CONFIG } from "@/lib/constants/insurance"

interface InsuranceUploadRecord {
  id: string
  fileUrl: string
  fileType: string
  documentTag: string
  status: string
  createdAt: string
}

interface InsuranceStatusData {
  dealId: string | null
  insuranceReadinessStatus: string
  deliveryBlockFlag: boolean
  uploads: InsuranceUploadRecord[]
}

const DOCUMENT_TAG_OPTIONS = [
  { value: "insurance_card", label: "Insurance Card" },
  { value: "insurance_declarations", label: "Insurance Declarations Page" },
  { value: "insurance_binder", label: "Insurance Binder" },
  { value: "insurance_other", label: "Other Insurance Document" },
] as const

export default function BuyerInsurancePage() {
  const [statusData, setStatusData] = useState<InsuranceStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>("insurance_card")
  const { toast } = useToast()

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/insurance/status")
      const data = await res.json()
      if (data.success) {
        setStatusData(data.data)
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load insurance status",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!statusData?.dealId) {
      toast({ variant: "destructive", title: "No active deal", description: "You need an active deal to upload insurance." })
      return
    }
    setSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const file = formData.get("file") as File | null
      if (!file) throw new Error("Please select a file")

      // Upload the file directly to the insurance upload endpoint.
      // This handles file storage and insurance readiness transition in one call.
      const csrfToken = getCsrfToken()
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      if (statusData.dealId) uploadFormData.append("dealId", statusData.dealId)
      uploadFormData.append("documentTag", selectedTag)

      const uploadHeaders: HeadersInit = csrfToken ? { "x-csrf-token": csrfToken } : {}
      const res = await fetch("/api/buyer/insurance/upload", {
        method: "POST",
        headers: uploadHeaders,
        body: uploadFormData,
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "File upload failed"))
      }

      toast({ title: "Insurance uploaded!", description: "Your proof has been submitted for review." })
      await loadStatus()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePending = async () => {
    if (!statusData?.dealId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/buyer/insurance/status", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ action: "pending", dealId: statusData.dealId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Operation failed"))
      toast({ title: "Insurance marked as pending", description: "You can continue shopping. Insurance will be required before delivery." })
      await loadStatus()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleHelpRequest = async () => {
    if (!statusData?.dealId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/buyer/insurance/status", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ action: "help", dealId: statusData.dealId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Operation failed"))
      toast({ title: "Help requested!", description: "Our team will contact you to assist with insurance." })
      await loadStatus()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </ProtectedRoute>
    )
  }

  const currentStatus = statusData?.insuranceReadinessStatus || "NOT_STARTED"
  const dashboardConfig = INSURANCE_DASHBOARD_CONFIG[currentStatus as keyof typeof INSURANCE_DASHBOARD_CONFIG]
    || INSURANCE_DASHBOARD_CONFIG.NOT_STARTED

  const variantStyles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    default: { bg: "bg-muted/30", border: "border-muted", text: "text-muted-foreground", icon: <Shield className="h-5 w-5" /> },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-900/40", text: "text-amber-700 dark:text-amber-300", icon: <AlertCircle className="h-5 w-5 text-amber-600" /> },
    success: { bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-900/40", text: "text-green-700 dark:text-green-300", icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
    info: { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-900/40", text: "text-blue-700 dark:text-blue-300", icon: <Clock className="h-5 w-5 text-blue-600" /> },
  }
  const style = variantStyles[dashboardConfig.variant] || variantStyles.default

  const noDeal = !statusData?.dealId
  const isTerminal = currentStatus === "VERIFIED"

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Insurance</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Proof of insurance is required before vehicle delivery. You can continue shopping
            and browsing without insurance — it{"'"}s only needed before pickup or delivery.
          </p>
        </div>

        {/* Current Status Banner */}
        <Card className={`${style.border} ${style.bg} shadow-sm`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">{style.icon}</div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  Insurance Status: {dashboardConfig.label}
                </CardTitle>
                <CardDescription className={style.text}>
                  {currentStatus === "NOT_STARTED" && "Choose one of the options below to get started."}
                  {currentStatus === "CURRENT_INSURANCE_UPLOADED" && "Your proof has been submitted and is awaiting review."}
                  {currentStatus === "INSURANCE_PENDING" && "You've acknowledged that insurance will be provided before delivery."}
                  {currentStatus === "HELP_REQUESTED" && "Our team will reach out to help you with insurance."}
                  {currentStatus === "UNDER_REVIEW" && "Your insurance documents are being reviewed."}
                  {currentStatus === "VERIFIED" && "Your insurance is verified! You're cleared for delivery."}
                  {currentStatus === "REQUIRED_BEFORE_DELIVERY" && "Insurance is required before your vehicle can be released."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {noDeal && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No active deal found. Insurance options will appear once you have a deal in progress.
              </p>
            </CardContent>
          </Card>
        )}

        {!noDeal && !isTerminal && (
          <>
            {/* Option A: Upload Insurance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5" />
                  Option A: Upload Current Insurance
                </CardTitle>
                <CardDescription>
                  Upload your insurance card, declarations page, binder, or other proof of coverage.
                  Accepted formats: PDF, PNG, JPG, JPEG, HEIC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="documentTag">Document Type</Label>
                    <select
                      id="documentTag"
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {DOCUMENT_TAG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="insuranceFile">Upload File</Label>
                    <Input
                      id="insuranceFile"
                      name="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/png,image/jpeg,image/heic"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Uploading..." : "Upload Insurance Proof"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Option B: Continue with Insurance Pending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Option B: Continue with Insurance Pending
                </CardTitle>
                <CardDescription>
                  Acknowledge that you will provide proof of insurance before vehicle delivery.
                  This will not block your shopping, shortlist, or auction activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  By continuing, you acknowledge that valid insurance proof will be required before
                  vehicle pickup or delivery release.
                </p>
                <Button
                  onClick={handlePending}
                  disabled={submitting || currentStatus === "INSURANCE_PENDING"}
                  variant="outline"
                  className="w-full"
                >
                  {currentStatus === "INSURANCE_PENDING"
                    ? "Already Marked as Pending"
                    : submitting
                      ? "Processing..."
                      : "Continue with Insurance Pending"}
                </Button>
              </CardContent>
            </Card>

            {/* Option C: Request Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5" />
                  Option C: Request Help with Insurance
                </CardTitle>
                <CardDescription>
                  Not sure about your insurance options? Our team can help you find coverage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleHelpRequest}
                  disabled={submitting || currentStatus === "HELP_REQUESTED"}
                  variant="outline"
                  className="w-full"
                >
                  {currentStatus === "HELP_REQUESTED"
                    ? "Help Already Requested — We'll Contact You"
                    : submitting
                      ? "Requesting..."
                      : "Request Insurance Assistance"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Upload History */}
        {statusData?.uploads && statusData.uploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Upload History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusData.uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {upload.documentTag.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {upload.fileType} — {new Date(upload.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        upload.status === "APPROVED"
                          ? "default"
                          : upload.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {upload.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
