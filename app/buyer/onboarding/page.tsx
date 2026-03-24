"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { ProfileStep } from "@/components/buyer/onboarding/profile-step"
import { ConsentStep } from "@/components/buyer/onboarding/consent-step"
import { ResultStep } from "@/components/buyer/onboarding/result-step"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

export default function BuyerOnboardingPage() {
  const [step, setStep] = useState(1)
  const [profileData, setProfileData] = useState<any>(null)
  const [preQualResult, setPreQualResult] = useState<any>(null)
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
          // User already has active prequal, redirect to prequal page
          toast({
            title: "Already pre-qualified",
            description: "Redirecting to your pre-qualification status...",
          })
          router.push("/buyer/prequal")
          return
        }
      } catch (error) {
        console.error("[v0] Error checking existing prequal:", error)
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

  const handleConsentComplete = async (consentData: any) => {
    setLoading(true)

    try {
      const transformedProfile = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        addressLine1: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zip: profileData.zip,
        postalCode: profileData.zip,
        employment: profileData.employment,
        employmentStatus: profileData.employment,
        employer: profileData.employer,
        employerName: profileData.employer,
        annualIncome: profileData.annualIncome,
        monthlyIncomeCents: Math.round((profileData.annualIncome / 12) * 100),
        housingStatus: profileData.housingStatus,
        monthlyHousing: profileData.monthlyHousing,
        monthlyHousingCents: Math.round(profileData.monthlyHousing * 100),
      }

      const response = await fetch("/api/buyer/prequal", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          profile: transformedProfile,
          consent: consentData,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Pre-qualification failed")
      }

      const preQual = result.data?.preQualification
      if (!preQual) {
        throw new Error("Invalid response from server")
      }

      setPreQualResult({
        ...preQual,
        maxOtd: preQual.maxOtdAmountCents ? preQual.maxOtdAmountCents / 100 : preQual.maxOtd,
        estimatedMonthlyMin: preQual.minMonthlyPaymentCents
          ? preQual.minMonthlyPaymentCents / 100
          : preQual.estimatedMonthlyMin,
        estimatedMonthlyMax: preQual.maxMonthlyPaymentCents
          ? preQual.maxMonthlyPaymentCents / 100
          : preQual.estimatedMonthlyMax,
        expiresAt: preQual.expiresAt,
        creditTier: preQual.creditTier,
      })
      setStep(3)

      toast({
        title: "Pre-qualification complete",
        description: "You're approved! Start shopping for vehicles.",
      })
    } catch (error: any) {
      console.error("[v0] PreQual error:", error)
      toast({
        variant: "destructive",
        title: "Pre-qualification failed",
        description: error.message || "Please try again or contact support.",
      })
    } finally {
      setLoading(false)
    }
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
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Get pre-qualified</h1>
            <p className="text-muted-foreground">Complete these steps to see your buying power</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
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
            <Card className="p-8">
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

          {!loading && step === 3 && preQualResult && <ResultStep preQual={preQualResult} />}
        </div>
      </div>
    </ProtectedRoute>
  )
}
