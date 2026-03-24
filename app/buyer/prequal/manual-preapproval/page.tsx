"use client"

import { useState, useRef } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { extractApiError } from "@/lib/utils/error-message"
import { getCsrfToken } from "@/lib/csrf-client"
import {
  Upload,
  Loader2,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ManualPreApprovalPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [lenderName, setLenderName] = useState("")
  const [approvedAmount, setApprovedAmount] = useState("")
  const [apr, setApr] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [submissionNotes, setSubmissionNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<"form" | "confirm" | "success">("form")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    if (selected) {
      const maxSize = 10 * 1024 * 1024
      if (selected.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 10 MB.",
        })
        return
      }
      const allowed = ["application/pdf", "image/png", "image/jpeg"]
      if (!allowed.includes(selected.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Only PDF, PNG, and JPEG files are accepted.",
        })
        return
      }
    }
    setFile(selected)
  }

  const handleSubmit = async () => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append(
        "metadata",
        JSON.stringify({
          lenderName,
          approvedAmount: parseFloat(approvedAmount),
          apr: apr ? parseFloat(apr) : undefined,
          termMonths: termMonths ? parseInt(termMonths, 10) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          submissionNotes: submissionNotes || undefined,
        }),
      )

      if (file) {
        formData.append("file", file)
      }

      const csrfToken = getCsrfToken()
      const response = await fetch("/api/buyer/prequal/external", {
        method: "POST",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
        body: formData,
      })
      const data = await response.json()

      if (data.success) {
        setStep("success")
        toast({
          title: "Pre-approval submitted",
          description: "Your bank pre-approval has been submitted for admin review.",
        })
      } else {
        throw new Error(extractApiError(data.error, "Submission failed"))
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Unable to submit pre-approval",
      })
    } finally {
      setUploading(false)
    }
  }

  if (step === "success") {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-green-500/30">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold">Submission Received</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your bank pre-approval from <strong>{lenderName}</strong> has been submitted.
                An admin will review it shortly.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => router.push("/buyer/prequal/manual-preapproval/status")}>
                  View Status
                </Button>
                <Button variant="outline" onClick={() => router.push("/buyer/prequal")}>
                  Back to Pre-Qualification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/buyer/prequal")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Upload Bank Pre-Approval</h1>
            <p className="text-muted-foreground text-sm">
              Already have a pre-approval from your bank or lender? Submit it here for verification.
            </p>
          </div>
        </div>

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pre-Approval Details</CardTitle>
              <CardDescription>
                Enter the details from your lender pre-approval letter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="lenderName" className="text-sm font-medium">
                    Lender Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="lenderName"
                    type="text"
                    required
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g., Chase Bank, Capital One"
                  />
                </div>
                <div>
                  <label htmlFor="approvedAmount" className="text-sm font-medium">
                    Maximum Approved Amount ($) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="approvedAmount"
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g., 35000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="apr" className="text-sm font-medium">APR (%)</label>
                    <input
                      id="apr"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={apr}
                      onChange={(e) => setApr(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g., 5.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="termMonths" className="text-sm font-medium">Term (months)</label>
                    <input
                      id="termMonths"
                      type="number"
                      min="1"
                      max="120"
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g., 60"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="expiresAt" className="text-sm font-medium">
                    Pre-Approval Expiry Date
                  </label>
                  <input
                    id="expiresAt"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="submissionNotes" className="text-sm font-medium">Notes (optional)</label>
                  <textarea
                    id="submissionNotes"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    placeholder="Any additional details about your pre-approval"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Pre-Approval Document</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Accepted formats: PDF, PNG, JPEG (max 10 MB)
                  </p>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to select your pre-approval document
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={!lenderName || !approvedAmount}
                    className="flex-1"
                  >
                    Review & Submit
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/buyer/prequal")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirm Submission</CardTitle>
              <CardDescription>
                Please review your details before submitting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Lender</span>
                  <p className="font-medium">{lenderName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Approved Amount</span>
                  <p className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(parseFloat(approvedAmount) || 0)}
                  </p>
                </div>
                {apr && (
                  <div>
                    <span className="text-muted-foreground">APR</span>
                    <p className="font-medium">{apr}%</p>
                  </div>
                )}
                {termMonths && (
                  <div>
                    <span className="text-muted-foreground">Term</span>
                    <p className="font-medium">{termMonths} months</p>
                  </div>
                )}
                {expiresAt && (
                  <div>
                    <span className="text-muted-foreground">Expires</span>
                    <p className="font-medium">
                      {new Date(expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {file && (
                  <div>
                    <span className="text-muted-foreground">Document</span>
                    <p className="font-medium">{file.name}</p>
                  </div>
                )}
              </div>
              {submissionNotes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="font-medium">{submissionNotes}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted/50 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Your submission will be reviewed by an admin. You will receive an email when a decision is made.
                  This is an informational tool only; it does not guarantee financing or approval terms.
                </span>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit for Review
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setStep("form")}>
                  Edit Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
