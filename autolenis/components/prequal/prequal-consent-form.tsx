"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, FileText, AlertCircle, ArrowRight, Loader2 } from "lucide-react"

/**
 * Default written-instruction consent text for prequalification.
 * This exact text is versioned and retained for FCRA compliance.
 * Must be exportable for MicroBilt review/approval.
 */
export const PREQUAL_CONSENT_TEXT = `WRITTEN INSTRUCTIONS FOR OBTAINING CONSUMER REPORT

By checking the box below, I am providing my written instructions to AutoLenis, Inc. and its designated service providers (including MicroBilt Corporation and Experian) authorizing AutoLenis to obtain my consumer credit report and/or credit score for the purpose of evaluating my eligibility for vehicle financing pre-qualification.

I understand and acknowledge that:

1. This authorization constitutes my "written instructions" under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681b(a)(2).

2. This is a consumer-initiated soft inquiry that will NOT affect my credit score.

3. The pre-qualification results are conditional estimates and do NOT constitute a final credit decision or guarantee of approval. Final approval is subject to lender underwriting criteria.

4. My personal information will be handled in accordance with AutoLenis's Privacy Policy and applicable federal and state laws.

5. I have the right to obtain a free copy of my consumer report from the reporting agency and to dispute any inaccurate information.

6. This pre-qualification does not obligate me to accept any financing offer.

This consent is valid for 30 days from the date of authorization.`

/**
 * Default forwarding authorization text.
 * Separate from consent — required before forwarding consumer data to third parties.
 */
export const FORWARDING_AUTHORIZATION_TEXT = `AUTHORIZATION FOR DATA FORWARDING

By checking the box below, I authorize AutoLenis, Inc. to forward my consumer-supplied information to participating auto financing lenders and financial institutions for the purpose of obtaining financing offers.

I understand that:

1. Only information I have provided directly will be forwarded. No additional consumer report data will be shared without separate authorization.

2. Each participating lender may have their own privacy policies and terms governing their use of my information.

3. This authorization is separate from and in addition to my consent for the soft credit inquiry.

4. I may revoke this authorization at any time by contacting AutoLenis support.`

interface PrequalConsentFormProps {
  onConsentComplete: (data: {
    consentGiven: boolean
    consentText: string
    consentVersionId: string
  }) => void
  onForwardingAuthComplete?: (data: {
    authorized: boolean
    authorizationText: string
    recipientDescription: string
  }) => void
  showForwardingAuth?: boolean
  loading?: boolean
  consentVersionId?: string
}

export function PrequalConsentForm({
  onConsentComplete,
  onForwardingAuthComplete,
  showForwardingAuth = false,
  loading = false,
  consentVersionId = "1.0.0",
}: PrequalConsentFormProps) {
  const [consentChecked, setConsentChecked] = useState(false)
  const [forwardingChecked, setForwardingChecked] = useState(false)
  const [step, setStep] = useState<"consent" | "forwarding" | "complete">("consent")

  const handleConsentSubmit = () => {
    if (!consentChecked) return
    onConsentComplete({
      consentGiven: true,
      consentText: PREQUAL_CONSENT_TEXT,
      consentVersionId,
    })
    if (showForwardingAuth) {
      setStep("forwarding")
    } else {
      setStep("complete")
    }
  }

  const handleForwardingSubmit = () => {
    onForwardingAuthComplete?.({
      authorized: forwardingChecked,
      authorizationText: FORWARDING_AUTHORIZATION_TEXT,
      recipientDescription: "Participating auto financing lenders and financial institutions",
    })
    setStep("complete")
  }

  if (step === "consent") {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Written Instruction Consent</CardTitle>
          </div>
          <CardDescription>
            Please review and accept the following authorization before proceeding with pre-qualification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
            {PREQUAL_CONSENT_TEXT}
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This is a <strong>soft inquiry</strong> that will not affect your credit score.
              Pre-qualification provides conditional estimates only and is not a guarantee of approval.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(checked) => setConsentChecked(checked === true)}
            />
            <label
              htmlFor="consent"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the above written instructions for obtaining my consumer report.
            </label>
          </div>

          <Button
            onClick={handleConsentSubmit}
            disabled={!consentChecked || loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {loading ? "Processing..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "forwarding") {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Data Forwarding Authorization</CardTitle>
          </div>
          <CardDescription>
            This separate authorization is required before your information can be shared with lenders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
            {FORWARDING_AUTHORIZATION_TEXT}
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="forwarding"
              checked={forwardingChecked}
              onCheckedChange={(checked) => setForwardingChecked(checked === true)}
            />
            <label
              htmlFor="forwarding"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I authorize AutoLenis to forward my information to participating lenders.
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onForwardingAuthComplete?.({
                  authorized: false,
                  authorizationText: FORWARDING_AUTHORIZATION_TEXT,
                  recipientDescription: "Participating auto financing lenders and financial institutions",
                })
                setStep("complete")
              }}
              className="flex-1"
            >
              Skip (Don&apos;t Forward)
            </Button>
            <Button
              onClick={handleForwardingSubmit}
              disabled={!forwardingChecked || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Authorize & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}

/**
 * Processing state display for prequalification.
 */
export function PrequalProcessingState() {
  return (
    <Card className="border-primary/20">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">Running Pre-Qualification</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          We're processing your pre-qualification request. This typically takes just a few moments.
          Please do not close this page.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          This is a soft inquiry and will not affect your credit score.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Normalized prequal results display component.
 */
interface PrequalResultsProps {
  result: {
    id: string
    status: string
    sourceType: string
    provider: string
    creditTier: string
    maxOtd: number | null
    estimatedMonthlyMin: number | null
    estimatedMonthlyMax: number | null
    expiresAt: string | null
    disclosuresAccepted: boolean
    forwardingAuthorized: boolean
    createdAt: string
  }
  onStartOver?: () => void
}

export function PrequalResultsReview({ result, onStartOver }: PrequalResultsProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "$0"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const tierColors: Record<string, string> = {
    EXCELLENT: "text-green-600 bg-green-50 dark:bg-green-950/20",
    GOOD: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    FAIR: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
    POOR: "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
    DECLINED: "text-red-600 bg-red-50 dark:bg-red-950/20",
  }

  const tierColor = tierColors[result.creditTier] || tierColors["POOR"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-Qualification Results</CardTitle>
        <CardDescription>
          {result.status === "ACTIVE"
            ? "You are pre-qualified for vehicle financing."
            : "Pre-qualification was not successful."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.status === "ACTIVE" ? (
          <>
            <div className={`rounded-lg p-4 ${tierColor}`}>
              <div className="text-sm font-medium">Credit Tier</div>
              <div className="text-2xl font-bold">{result.creditTier}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Max Approved Amount</div>
                <div className="text-xl font-bold">{formatCurrency(result.maxOtd)}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Monthly Payment Range</div>
                <div className="text-xl font-bold">
                  {formatCurrency(result.estimatedMonthlyMin)} – {formatCurrency(result.estimatedMonthlyMax)}
                </div>
              </div>
            </div>

            {result.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Valid until {new Date(result.expiresAt).toLocaleDateString()}
              </p>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Important:</strong> This pre-qualification is a conditional estimate and does not
                constitute a final credit decision. Final approval depends on lender underwriting.
              </p>
              <p>Provider: {result.provider} | Source: {result.sourceType}</p>
              {result.forwardingAuthorized && (
                <p>✓ Data forwarding authorized to participating lenders</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              We were unable to complete your pre-qualification at this time.
              Please try again or contact support for assistance.
            </p>
          </div>
        )}

        {onStartOver && (
          <Button variant="outline" onClick={onStartOver} className="w-full">
            Start New Pre-Qualification
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
