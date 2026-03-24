"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileSignature, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface AgreementState {
  agreement: {
    id: string
    status: string
    version: string
    agreementName: string
    envelopeId: string | null
    signerEmail: string
    signerName: string
    sentAt: string | null
    viewedAt: string | null
    signedAt: string | null
    completedAt: string | null
  } | null
  status: string
}

export default function DealerAgreementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [signing, setSigning] = useState(false)
  const [agreementState, setAgreementState] = useState<AgreementState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dealerId, setDealerId] = useState<string | null>(null)

  const fetchStatus = useCallback(async (dId: string) => {
    try {
      const res = await fetch(`/api/dealer/onboarding/agreement/status?dealerId=${dId}`)
      if (!res.ok) throw new Error("Failed to fetch agreement status")
      const data = await res.json()
      setAgreementState(data)
    } catch {
      setError("Unable to load agreement status. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get dealer ID from session/context
    async function init() {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        const dId = data?.user?.dealerId || data?.dealerId
        if (dId) {
          setDealerId(dId)
          fetchStatus(dId)
        } else {
          setError("Unable to determine dealer. Please contact support.")
          setLoading(false)
        }
      } catch {
        setError("Authentication error. Please sign in again.")
        setLoading(false)
      }
    }
    init()
  }, [fetchStatus])

  const handleSendAgreement = async () => {
    if (!dealerId) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/dealer/onboarding/agreement/send", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message || "Failed to send agreement")
      }
      await fetchStatus(dealerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send agreement")
    } finally {
      setSending(false)
    }
  }

  const handleSignNow = async () => {
    if (!agreementState?.agreement?.id) return
    setSigning(true)
    setError(null)
    try {
      const returnUrl = `${window.location.origin}/dealer/onboarding/agreement/success`
      const res = await fetch("/api/dealer/onboarding/agreement/view", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: agreementState.agreement.id,
          returnUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message || "Failed to generate signing link")
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open signing session")
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const status = agreementState?.status || "REQUIRED"
  const agreement = agreementState?.agreement

  // Completed → redirect to success
  if (status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle>Agreement Completed</CardTitle>
                <CardDescription>
                  Your dealer participation agreement has been signed and completed.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agreement?.completedAt && (
                <p className="text-sm text-muted-foreground">
                  Completed on {new Date(agreement.completedAt).toLocaleDateString()}
                </p>
              )}
              <Button onClick={() => router.push("/dealer/dashboard")}>
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      {/* Agreement Required Banner */}
      <Alert>
        <FileSignature className="h-4 w-4" />
        <AlertTitle>Dealer Agreement Required</AlertTitle>
        <AlertDescription>
          To activate your dealer account, you must review and sign the AutoLenis
          Dealer Participation Agreement. Your account will remain inactive until
          this agreement is completed.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dealer Participation Agreement</span>
            <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
          </CardTitle>
          <CardDescription>
            {agreement?.agreementName || "AutoLenis Dealer Participation Agreement"}
            {agreement?.version && ` — v${agreement.version}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Status-specific content */}
            {status === "REQUIRED" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click below to send the agreement to your email for signing.
                </p>
                <Button onClick={handleSendAgreement} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FileSignature className="mr-2 h-4 w-4" />
                      Send Agreement
                    </>
                  )}
                </Button>
              </div>
            )}

            {(status === "SENT" || status === "DELIVERED" || status === "VIEWED") && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your agreement has been prepared. Click &quot;Sign Now&quot; to review and sign
                  the agreement directly in your browser.
                </p>
                {agreement?.signerEmail && (
                  <p className="text-sm text-muted-foreground">
                    Sent to: <strong>{agreement.signerEmail}</strong>
                  </p>
                )}
                <div className="flex gap-3">
                  <Button onClick={handleSignNow} disabled={signing}>
                    {signing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <FileSignature className="mr-2 h-4 w-4" />
                        Sign Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => dealerId && fetchStatus(dealerId)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              </div>
            )}

            {(status === "SIGNED") && (
              <div className="flex items-center gap-3 text-amber-600">
                <Clock className="h-5 w-5" />
                <p className="text-sm">
                  Your agreement has been signed and is being processed.
                  This page will update when processing is complete.
                </p>
              </div>
            )}

            {(status === "DECLINED" || status === "VOIDED" || status === "EXPIRED") && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Agreement {getStatusLabel(status)}</AlertTitle>
                  <AlertDescription>
                    This agreement is no longer active. Please contact AutoLenis support
                    to have a new agreement sent.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Legal Disclosure */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                By signing this agreement, you acknowledge that your dealer account
                activation depends on the successful completion of this agreement.
                This is an informational tool only and does not constitute legal advice.
                All terms are subject to the full agreement document.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help / Contact */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Need help? Contact{" "}
            <a href="mailto:support@autolenis.com" className="underline">
              support@autolenis.com
            </a>{" "}
            or call <strong>(888) 555-0199</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "COMPLETED": return "default"
    case "SENT":
    case "DELIVERED":
    case "VIEWED":
    case "SIGNED": return "secondary"
    case "DECLINED":
    case "VOIDED":
    case "EXPIRED":
    case "ERROR": return "destructive"
    default: return "outline"
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "REQUIRED": return "Required"
    case "SENT": return "Sent"
    case "DELIVERED": return "Delivered"
    case "VIEWED": return "Viewed"
    case "SIGNED": return "Signed"
    case "COMPLETED": return "Completed"
    case "DECLINED": return "Declined"
    case "VOIDED": return "Voided"
    case "EXPIRED": return "Expired"
    case "ERROR": return "Error"
    default: return status
  }
}
