"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { extractApiError } from "@/lib/utils/error-message"
import { User, Share2, CheckCircle2, Copy } from "lucide-react"

export default function AffiliateOnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    paypalEmail: "",
    agreedToTerms: false,
  })

  const [referralCode, setReferralCode] = useState("")
  const [referralLink, setReferralLink] = useState("")

  const handleNext = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please fill in all required fields",
        })
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formData.paypalEmail) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please provide a PayPal email for payouts",
        })
        return
      }
      if (!formData.agreedToTerms) {
        toast({
          variant: "destructive",
          title: "Agreement required",
          description: "Please agree to the affiliate terms",
        })
        return
      }
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/affiliate/onboarding", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Onboarding failed"))
      }

      setReferralCode(data.data.referralCode)
      setReferralLink(data.data.referralLink)

      toast({
        title: "Welcome to the affiliate program!",
        description: "Your affiliate account is now active.",
      })

      setStep(3)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    })
  }

  return (
    <ProtectedRoute allowedRoles={["AFFILIATE", "AFFILIATE_ONLY"]}>
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Affiliate Onboarding</h1>
            <p className="text-muted-foreground">Set up your affiliate account and start earning</p>

            <div className="flex items-center gap-2 mt-6">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 1 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <User className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Personal Info</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 2 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <Share2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Payout Setup</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 3 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Complete</span>
              </div>
            </div>
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="90001"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={handleNext}>Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payout Setup */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Payout Setup</CardTitle>
                <CardDescription>Configure how you'll receive your commissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paypalEmail">PayPal Email *</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    value={formData.paypalEmail}
                    onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                    placeholder="your-email@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send your commission payouts to this PayPal email address
                  </p>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold">Commission Structure</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Level 1 (Direct Referrals)</span>
                      <span className="font-bold text-[#7ED321]">15%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level 2</span>
                      <span className="font-bold text-[#00D9FF]">3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level 3</span>
                      <span className="font-bold text-[#0066FF]">2%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-4 border rounded-lg">
                  <input
                    type="checkbox"
                    id="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                    className="mt-1"
                  />
                  <Label htmlFor="agreedToTerms" className="cursor-pointer text-sm">
                    I agree to the AutoLenis Affiliate Terms and understand that commissions are earned only on
                    completed deals and paid monthly via PayPal
                  </Label>
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={!formData.agreedToTerms || loading}>
                    {loading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3 text-center">You're All Set!</h2>
                <p className="text-muted-foreground mb-8 text-center">
                  Your affiliate account is active. Start sharing your link to earn commissions!
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Your Referral Code</Label>
                    <div className="flex gap-2">
                      <Input value={referralCode} readOnly className="font-mono" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(referralCode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Your Referral Link</Label>
                    <div className="flex gap-2">
                      <Input value={referralLink} readOnly className="text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(referralLink)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={() => router.push("/affiliate/portal/dashboard")}>Go to Dashboard</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
