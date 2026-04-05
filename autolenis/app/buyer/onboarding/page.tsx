"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { ProfileStep } from "@/components/buyer/onboarding/profile-step"
import { ConsentStep } from "@/components/buyer/onboarding/consent-step"
import { ResultStep } from "@/components/buyer/onboarding/result-step"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

const CONSENT_TEXT =
  "I authorize AutoLenis and its partners to obtain my credit report for the purpose of " +
  "pre-qualifying me for vehicle financing. I understand this is a soft inquiry that will " +
  "not affect my credit score. I acknowledge that I have read and agree to the Privacy " +
  "Policy and Terms of Service."

export default function BuyerOnboardingPage() {
  const [step, setStep] = useState(1)
  const [profileData, setProfileData] = useState<any>(null)
  const [preQualResult, setPreQualResult] = useState<any>(null)
  const [prequalFailed, setPrequalFailed] = useState(false)
  const [failureMessage, setFailureMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkExistingPreQual = async () => {
      try {
        const response = await fetch("/api/buyer/prequal")
        const data = await response.json()

        if (data.success && data.data?.preQualification && data.data?.active) {
          toast({
            title: "Already pre-qualified",
            description: "Redirecting to your pre-qualification status...",
          })
          router.push("/buyer/prequal")
          return
        }
      } catch (error) {
        console.error("[Onboarding] Error checking existing prequal:", error)
      } finally {
        setCheckingExisting(false)
      }
    }

    checkExistingPreQual()
  }, [router, toast])

  const handleProfileComplete = (data: any) => {
    setProfileData(data)
    setStep(2)
  }

  const handleConsentComplete = async (consentData: { ssn: string; consentGiven: boolean }) => {
    setLoading(true)
    setPrequalFailed(false)
    setFailureMessage("")

    try {
      // Step 1: Create a prequal session
      const sessionRes = await fetch("/api/buyer/prequal/session", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ sourceType: "INTERNAL" }),
      })
      const sessionResult = await sessionRes.json()
      if (!sessionResult.success) {
        throw new Error(sessionResult.error?.message || "Failed to create pre-qualification session")
      }
      const { sessionId } = sessionResult.data

      // Step 2: Capture written-instruction consent
      const consentRes = await fetch("/api/buyer/prequal/session/consent", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          sessionId,
          consentVersionId: "v1.0.0-onboarding",
          consentText: CONSENT_TEXT,
          consentGiven: consentData.consentGiven,
        }),
      })
      const consentResult = await consentRes.json()
      if (!consentResult.success) {
        throw new Error(consentResult.error?.message || "Failed to capture consent")
      }

      // Step 3: Run pre-qualification
      const runRes = await fetch("/api/buyer/prequal/session/run", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          sessionId,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          dateOfBirth: profileData.dateOfBirth,
          addressLine1: profileData.address,
          city: profileData.city,
          state: profileData.state,
          postalCode: profileData.zip,
          phone: profileData.phone,
          employerName: profileData.employer,
          monthlyIncomeCents: Math.round((profileData.annualIncome / 12) * 100),
          monthlyHousingCents: Math.round(profileData.monthlyHousing * 100),
          ssn: consentData.ssn,
        }),
      })
      const runResult = await runRes.json()
      if (!runResult.success) {
        throw new Error(runResult.error?.message || "Pre-qualification failed")
      }

      const result = runResult.data?.prequalResult
      if (!result) {
        throw new Error("Invalid response from server")
      }

      // Check if prequal was approved or declined
      if (result.status === "FAILED" || result.creditTier === "DECLINED") {
        setPrequalFailed(true)
        setFailureMessage(
          "Based on the information provided, we're unable to pre-qualify you at this time. " +
          "This does not affect your credit score. You may try again later or contact support for assistance."
        )
        setStep(3)
        return
      }

      // Map normalized result to the format expected by ResultStep
      setPreQualResult({
        maxOtdAmountCents: result.maxOtd ? Math.round(result.maxOtd * 100) : 0,
        minMonthlyPaymentCents: result.estimatedMonthlyMin ? Math.round(result.estimatedMonthlyMin * 100) : 0,
        maxMonthlyPaymentCents: result.estimatedMonthlyMax ? Math.round(result.estimatedMonthlyMax * 100) : 0,
        creditTier: result.creditTier,
        expiresAt: result.expiresAt,
      })
      setStep(3)

      toast({
        title: "Pre-qualification complete",
        description: "You're approved! Start shopping for vehicles.",
      })
    } catch (error: unknown) {
      console.error("[Onboarding] PreQual error:", error)
      const errorMsg = error instanceof Error ? error.message : String(error)

      // Check if this is a DTI or scoring failure vs a system error
      if (
        errorMsg.includes("Debt-to-income") ||
        errorMsg.includes("threshold") ||
        errorMsg.includes("hard-fail")
      ) {
        setPrequalFailed(true)
        setFailureMessage(errorMsg)
        setStep(3)
      } else {
        toast({
          variant: "destructive",
          title: "Pre-qualification failed",
          description: errorMsg || "Please try again or contact support.",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setStep(1)
    setProfileData(null)
    setPreQualResult(null)
    setPrequalFailed(false)
    setFailureMessage("")
  }

  if (checkingExisting) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="min-h-screen bg-muted/30 py-12">
          <div className="container max-w-2xl">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="min-h-screen bg-muted/30 py-12" data-testid="buyer-onboarding-page">
        <div className="container max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Get pre-qualified</h1>
            <p className="text-muted-foreground">Complete these steps to see your buying power</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8" data-testid="prequal-progress-steps">
            <div className="flex items-center gap-2 text-sm">
              {/* Step 1 */}
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step > 1
                      ? "border-primary bg-primary text-white"
                      : step === 1
                        ? "border-primary bg-primary text-white"
                        : "border-border"
                  }`}
                >
                  {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                </div>
                <span className="hidden sm:inline font-medium">Profile</span>
              </div>

              <div className="w-8 sm:w-12 h-px bg-border" />

              {/* Step 2 */}
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step > 2
                      ? "border-primary bg-primary text-white"
                      : step === 2
                        ? "border-primary bg-primary text-white"
                        : "border-border"
                  }`}
                >
                  {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
                </div>
                <span className="hidden sm:inline font-medium">Consent</span>
              </div>

              <div className="w-8 sm:w-12 h-px bg-border" />

              {/* Step 3 */}
              <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step >= 3 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  {step >= 3 ? <CheckCircle2 className="h-4 w-4" /> : "3"}
                </div>
                <span className="hidden sm:inline font-medium">Results</span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <Card className="p-8" data-testid="prequal-loading-state">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg mb-1">Analyzing your information...</div>
                  <div className="text-sm text-muted-foreground">
                    This is a soft credit check and won't affect your score
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step Content */}
          {!loading && step === 1 && <ProfileStep onNext={handleProfileComplete} initialData={profileData} />}

          {!loading && step === 2 && <ConsentStep onNext={handleConsentComplete} onBack={() => setStep(1)} />}

          {/* Success Result */}
          {!loading && step === 3 && !prequalFailed && preQualResult && <ResultStep preQual={preQualResult} />}

          {/* Failure Result */}
          {!loading && step === 3 && prequalFailed && (
            <div className="space-y-6" data-testid="prequal-declined-result">
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                      <XCircle className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        Not pre-qualified at this time
                      </h2>
                      <p className="text-orange-700 dark:text-orange-300 text-base">
                        This does not affect your credit score.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-2">
                    {failureMessage}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold">What you can do</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      Review your information and try again with updated details
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      Reduce your monthly housing payment or increase your income
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      Contact our support team for personalized assistance
                    </li>
                  </ul>
                </div>
              </Card>

              <Button onClick={handleRetry} className="w-full" size="lg" data-testid="prequal-retry-btn">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
