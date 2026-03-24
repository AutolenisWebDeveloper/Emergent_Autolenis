"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { useToast } from "@/hooks/use-toast"

/**
 * /dealer/apply — Authenticated dealer onboarding continuation route.
 *
 * This is NOT the public marketing page (/dealer-application).
 * This route handles:
 *  - Continuation from quick-offer conversion path
 *  - Direct authenticated application for dealers already signed in
 *  - Resume onboarding flow with prefill from prospect data
 */
export default function DealerApplyPage() {
  return (
    <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
      <DealerApplyContent />
    </ProtectedRoute>
  )
}

function DealerApplyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const prospectId = searchParams.get("prospectId")

  const [loading, setLoading] = useState(true)
  const [conversionStatus, setConversionStatus] = useState<{
    status: string
    businessDocsUploaded: boolean
    agreementAccepted: boolean
    operationalSetup: boolean
  } | null>(null)

  const [step, setStep] = useState<"docs" | "agreement" | "setup" | "complete">("docs")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/dealer/onboarding/conversion-status")
        const data = await res.json()
        if (data.success && data.data) {
          setConversionStatus(data.data)
          // Determine current step based on progress
          if (data.data.operationalSetup) {
            setStep("complete")
          } else if (data.data.agreementAccepted) {
            setStep("setup")
          } else if (data.data.businessDocsUploaded) {
            setStep("agreement")
          }
        }
      } catch {
        // No conversion in progress — show docs step
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [])

  async function handleUploadDocs() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/dealer/onboarding/upload-docs", { method: "POST", headers: csrfHeaders() })
      if (res.ok) {
        setStep("agreement")
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Upload failed", description: data.error || "Please try again." })
      }
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "A network error occurred. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAcceptAgreement() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/dealer/onboarding/accept-agreement", { method: "POST", headers: csrfHeaders() })
      if (res.ok) {
        setStep("setup")
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ variant: "destructive", title: "Agreement failed", description: data.error || "Please try again." })
      }
    } catch {
      toast({ variant: "destructive", title: "Agreement failed", description: "A network error occurred. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  function handleCompleteSetup() {
    setSubmitting(true)
    setStep("complete")
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Onboarding Complete!</h2>
            <p className="text-muted-foreground">
              Your dealer account is set up. You can now manage inventory, receive auction invitations, and participate in deals.
            </p>
            <Button onClick={() => router.push("/dealer/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Dealer Setup</CardTitle>
            <CardDescription>
              {prospectId
                ? "Thank you for your offer! Complete these steps to become an AutoLenis partner dealer."
                : "Complete the steps below to finish setting up your dealer account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Badge variant={step === "docs" ? "default" : "secondary"}>
                1. Documents
              </Badge>
              <Badge variant={step === "agreement" ? "default" : "secondary"}>
                2. Agreement
              </Badge>
              <Badge variant={step === "setup" ? "default" : "secondary"}>
                3. Setup
              </Badge>
            </div>
          </CardContent>
        </Card>

        {step === "docs" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Business Documents</CardTitle>
              <CardDescription>
                Please upload your dealer license, business registration, and insurance documentation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="license">Dealer License</Label>
                <Input id="license" type="file" accept=".pdf,.jpg,.png" />
              </div>
              <div>
                <Label htmlFor="registration">Business Registration</Label>
                <Input id="registration" type="file" accept=".pdf,.jpg,.png" />
              </div>
              <div>
                <Label htmlFor="insurance">Insurance Certificate</Label>
                <Input id="insurance" type="file" accept=".pdf,.jpg,.png" />
              </div>
              <Button onClick={handleUploadDocs} disabled={submitting} className="w-full">
                {submitting ? "Uploading..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "agreement" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AutoLenis Partner Agreement</CardTitle>
              <CardDescription>
                Review and accept the AutoLenis partner dealer agreement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm max-h-60 overflow-y-auto">
                <p className="font-semibold mb-2">AutoLenis Partner Dealer Agreement</p>
                <p>By accepting this agreement, you agree to:</p>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li>Process all AutoLenis-sourced deals through the platform</li>
                  <li>Maintain accurate inventory listings</li>
                  <li>Honor pricing commitments made through the platform</li>
                  <li>Comply with consumer protection regulations</li>
                  <li>Maintain required business licenses and insurance</li>
                </ul>
                <p className="mt-2 text-muted-foreground italic">
                  This is an informational summary only and does not constitute legal advice.
                </p>
              </div>
              <Button onClick={handleAcceptAgreement} disabled={submitting} className="w-full">
                {submitting ? "Processing..." : "Accept Agreement"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "setup" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operational Setup</CardTitle>
              <CardDescription>
                Configure your dealer operations on AutoLenis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Business Timezone</Label>
                <Input id="timezone" defaultValue="America/New_York" />
              </div>
              <div>
                <Label htmlFor="hours">Business Hours</Label>
                <Input id="hours" defaultValue="Mon-Sat 9AM-7PM" />
              </div>
              <div>
                <Label htmlFor="delivery">Delivery Radius (miles)</Label>
                <Input id="delivery" type="number" defaultValue="50" />
              </div>
              <Button onClick={handleCompleteSetup} disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Complete Setup"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
