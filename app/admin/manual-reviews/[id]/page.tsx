"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldX,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Upload,
  FileText,
  User,
  Building2,
  Car,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ROOT_CAUSE_OPTIONS = [
  { value: "FALSE_POSITIVE_SCAN", label: "False Positive Scan" },
  { value: "INTERNAL_DATA_MISMATCH", label: "Internal Data Mismatch" },
  { value: "DEPENDENCY_FAILURE", label: "Dependency Failure" },
  { value: "POLICY_RULES_DISCREPANCY", label: "Policy Rules Discrepancy" },
  { value: "MISSING_INTERNAL_ATTESTATION", label: "Missing Internal Attestation" },
  { value: "OTHER", label: "Other" },
]

const QUEUE_OPTIONS = [
  { value: "OPS", label: "Operations" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "POLICY", label: "Policy" },
]

export default function ManualReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [rootCauseCategory, setRootCauseCategory] = useState("")
  const [rootCauseNotes, setRootCauseNotes] = useState("")
  const [vinMatch, setVinMatch] = useState(false)
  const [buyerIdentityMatch, setBuyerIdentityMatch] = useState(false)
  const [otdMathValidated, setOtdMathValidated] = useState(false)
  const [feesValidated, setFeesValidated] = useState(false)
  const [termsValidated, setTermsValidated] = useState(false)
  const [disclosuresPresent, setDisclosuresPresent] = useState(false)
  const [attestationAccepted, setAttestationAccepted] = useState(false)
  const [exceptionJustification, setExceptionJustification] = useState("")
  const [internalFixQueue, setInternalFixQueue] = useState("")
  const [internalFixNotes, setInternalFixNotes] = useState("")
  const [revokeReason, setRevokeReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savingChecklist, setSavingChecklist] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(`/api/admin/manual-reviews/${id}`, fetcher, {
    refreshInterval: 15000,
  })

  const review = data?.data

  // Sync form state from loaded review
  const syncFromReview = () => {
    if (!review) return
    setRootCauseCategory(review.rootCauseCategory || "")
    setRootCauseNotes(review.rootCauseNotes || "")
    setVinMatch(review.vinMatch || false)
    setBuyerIdentityMatch(review.buyerIdentityMatch || false)
    setOtdMathValidated(review.otdMathValidated || false)
    setFeesValidated(review.feesValidated || false)
    setTermsValidated(review.termsValidated || false)
    setDisclosuresPresent(review.disclosuresPresent || false)
    setAttestationAccepted(review.attestationAccepted || false)
  }

  // Check if checklist is complete
  const allChecksComplete =
    rootCauseCategory &&
    vinMatch &&
    buyerIdentityMatch &&
    otdMathValidated &&
    feesValidated &&
    termsValidated &&
    disclosuresPresent &&
    attestationAccepted

  const handleSaveChecklist = async () => {
    setSavingChecklist(true)
    try {
      const res = await fetch(`/api/admin/manual-reviews/${id}/checklist`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          rootCauseCategory,
          rootCauseNotes: rootCauseNotes || undefined,
          vinMatch,
          buyerIdentityMatch,
          otdMathValidated,
          feesValidated,
          termsValidated,
          disclosuresPresent,
          attestationAccepted,
          evidenceAttachmentIds: ["placeholder-evidence"],
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Checklist saved" })
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error?.message || "Save failed" })
      }
    } catch {
      toast({ variant: "destructive", title: "Save failed" })
    } finally {
      setSavingChecklist(false)
    }
  }

  const handleAction = async (
    endpoint: string,
    body?: Record<string, unknown>,
    successMsg?: string,
  ) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/manual-reviews/${id}/${endpoint}`, {
        method: "POST",
        headers: csrfHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: successMsg || "Action completed" })
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error?.message || "Action failed" })
      }
    } catch {
      toast({ variant: "destructive", title: "Action failed" })
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Manual review not found</h2>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const isOpen = review.status === "OPEN"
  const isPendingSecond = review.status === "PENDING_SECOND_APPROVAL"
  const isApproved = review.status === "APPROVED"
  const isRevoked = review.status === "REVOKED"
  const isInternalFix = review.status === "RETURNED_INTERNAL_FIX"

  const statusColors: Record<string, string> = {
    OPEN: "border-yellow-300 bg-yellow-50",
    PENDING_SECOND_APPROVAL: "border-orange-300 bg-orange-50",
    APPROVED: "border-green-300 bg-green-50",
    RETURNED_INTERNAL_FIX: "border-blue-300 bg-blue-50",
    REVOKED: "border-red-300 bg-red-50",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              CMA Review
            </h1>
            <p className="text-muted-foreground">
              Controlled Manual Approval — Non-dealer-correctable review
            </p>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={`border-2 ${statusColors[review.status] || ""}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {isApproved ? (
              <ShieldCheck className="h-10 w-10 text-green-600" />
            ) : isRevoked ? (
              <ShieldX className="h-10 w-10 text-red-600" />
            ) : isPendingSecond ? (
              <AlertTriangle className="h-10 w-10 text-orange-600" />
            ) : isInternalFix ? (
              <Clock className="h-10 w-10 text-blue-600" />
            ) : (
              <Shield className="h-10 w-10 text-yellow-600" />
            )}
            <div>
              <div className="text-sm text-muted-foreground">CMA Status</div>
              <div className="text-2xl font-bold">{review.status.replace(/_/g, " ")}</div>
              {review.approvalMode && (
                <Badge variant="outline" className="mt-1">
                  Mode: {review.approvalMode.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal Info */}
      {review.deal && (
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-semibold">Deal ID</div>
                  <div className="text-sm text-muted-foreground">{review.dealId}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-semibold">Created</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(review.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Findings */}
      {review.overriddenScan && (
        <Card>
          <CardHeader>
            <CardTitle>Original Scan Findings</CardTitle>
            <CardDescription>Issues identified by Contract Shield that triggered this review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {review.overriddenScan.fixList?.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg ${
                    item.severity === "CRITICAL" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        item.severity === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {item.severity}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{item.category}</span>
                  </div>
                  <p className="text-sm mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CMA Checklist — only shown when OPEN */}
      {isOpen && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              CMA Verification Checklist
            </CardTitle>
            <CardDescription>
              Complete all checks before approving. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Root Cause */}
            <div className="space-y-2">
              <Label>Root Cause Category *</Label>
              <Select value={rootCauseCategory} onValueChange={setRootCauseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select root cause..." />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Root Cause Notes</Label>
              <Textarea
                placeholder="Additional details about the root cause..."
                value={rootCauseNotes}
                onChange={(e) => setRootCauseNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Verification Checks */}
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="font-semibold text-sm">Verification Checks</h4>
              {[
                { id: "vin", label: "VIN Match Confirmed", checked: vinMatch, set: setVinMatch },
                { id: "buyer", label: "Buyer Identity Match Confirmed", checked: buyerIdentityMatch, set: setBuyerIdentityMatch },
                { id: "otd", label: "OTD Math Validated", checked: otdMathValidated, set: setOtdMathValidated },
                { id: "fees", label: "Fees Validated", checked: feesValidated, set: setFeesValidated },
                { id: "terms", label: "Financing Terms Validated", checked: termsValidated, set: setTermsValidated },
                { id: "disclosures", label: "Required Disclosures Present", checked: disclosuresPresent, set: setDisclosuresPresent },
              ].map((check) => (
                <div key={check.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={check.id}
                    checked={check.checked}
                    onCheckedChange={(v) => check.set(v === true)}
                  />
                  <Label htmlFor={check.id} className="cursor-pointer">{check.label}</Label>
                </div>
              ))}
            </div>

            {/* Attestation */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attestation"
                  checked={attestationAccepted}
                  onCheckedChange={(v) => setAttestationAccepted(v === true)}
                />
                <Label htmlFor="attestation" className="cursor-pointer text-sm font-medium">
                  I certify this packet meets AutoLenis contract standards and accept manual-approval accountability.
                </Label>
              </div>
            </div>

            {/* Save Checklist */}
            <Button
              onClick={handleSaveChecklist}
              disabled={savingChecklist || !rootCauseCategory}
              className="w-full"
            >
              {savingChecklist ? "Saving..." : "Save Checklist"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons — only when OPEN and checklist complete */}
      {isOpen && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>CMA Decision</CardTitle>
            <CardDescription>
              Choose the appropriate action. All decisions are immutably audited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Manual Validated */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Manual Validation
                </h4>
                <p className="text-xs text-muted-foreground">
                  Scan was a false positive or internal error. Contract is valid.
                </p>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!allChecksComplete || submitting}
                  onClick={() =>
                    handleAction("approve/manual-validated", undefined, "Manual validation approved")
                  }
                >
                  Approve via Manual Validation
                </Button>
              </div>

              {/* Exception Override */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Exception Override
                </h4>
                <p className="text-xs text-muted-foreground">
                  Override with stronger justification. May require second approval.
                </p>
                <Textarea
                  placeholder="Detailed justification (min 10 chars)..."
                  value={exceptionJustification}
                  onChange={(e) => setExceptionJustification(e.target.value)}
                  rows={2}
                />
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={!allChecksComplete || submitting || exceptionJustification.length < 10}
                  onClick={() =>
                    handleAction(
                      "approve/exception-override",
                      { justification: exceptionJustification },
                      "Exception override submitted",
                    )
                  }
                >
                  Approve with Exception
                </Button>
              </div>

              {/* Return to Internal Fix */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Return to Internal Fix
                </h4>
                <p className="text-xs text-muted-foreground">
                  Route to internal team for resolution. Requires queue assignment.
                </p>
                <Select value={internalFixQueue} onValueChange={setInternalFixQueue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign queue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {QUEUE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Fix notes..."
                  value={internalFixNotes}
                  onChange={(e) => setInternalFixNotes(e.target.value)}
                  rows={2}
                />
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={submitting || !internalFixQueue || !internalFixNotes}
                  onClick={() =>
                    handleAction(
                      "return-internal-fix",
                      { assignedQueue: internalFixQueue, notes: internalFixNotes },
                      "Returned to internal fix",
                    )
                  }
                >
                  Return to Internal Fix
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Second Approval */}
      {isPendingSecond && (
        <Card className="border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Second Approval Required
            </CardTitle>
            <CardDescription>
              A different CMA approver must confirm this decision.
              First approver: {review.approvedByAdmin?.first_name} {review.approvedByAdmin?.last_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
              onClick={() => handleAction("second-approve", undefined, "Second approval completed")}
            >
              Confirm as Second Approver
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revoke Panel — for approved reviews */}
      {isApproved && (
        <Card className="border-2 border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-red-600" />
              Revoke Approval
            </CardTitle>
            <CardDescription>
              Revoke this manual approval. This will reset the deal to manual review required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Reason for revocation (required)..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={2}
            />
            <Button
              variant="destructive"
              disabled={submitting || !revokeReason}
              onClick={() =>
                handleAction("revoke", { reason: revokeReason }, "Approval revoked")
              }
            >
              Revoke Approval
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revoked Info */}
      {isRevoked && (
        <Card className="border-2 border-red-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">This approval has been revoked</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Reason: {review.revokedReason}
                </p>
                <p className="text-sm text-muted-foreground">
                  Revoked at: {review.revokedAt ? new Date(review.revokedAt).toLocaleString() : "N/A"}
                </p>
                {review.revokedByAdmin && (
                  <p className="text-sm text-muted-foreground">
                    By: {review.revokedByAdmin.first_name} {review.revokedByAdmin.last_name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal Fix Info */}
      {isInternalFix && (
        <Card className="border-2 border-blue-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Returned to Internal Fix</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Queue: {review.assignedQueue}
                </p>
                <p className="text-sm text-muted-foreground">
                  Notes: {review.rootCauseNotes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Audit Trail */}
      {(isApproved || isPendingSecond) && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Primary Approver</Label>
                <p className="text-sm">
                  {review.approvedByAdmin?.first_name} {review.approvedByAdmin?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {review.approvedAt ? new Date(review.approvedAt).toLocaleString() : "N/A"}
                </p>
              </div>
              {review.secondApproverAdmin && (
                <div>
                  <Label className="text-xs">Second Approver</Label>
                  <p className="text-sm">
                    {review.secondApproverAdmin.first_name} {review.secondApproverAdmin.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {review.secondApprovedAt ? new Date(review.secondApprovedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Document hash at approval: {review.documentHashAtApproval || "N/A"}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
