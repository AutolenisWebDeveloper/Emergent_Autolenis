"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, FileText, Shield, CheckCircle2 } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

export default function DealerOnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    dealershipName: "",
    businessAddress: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    dealerLicense: "",
    taxId: "",
    yearsInBusiness: "",
    inventorySize: "",
    specializations: "",
    agreesToTerms: false,
  })

  const handleNext = () => {
    if (step === 1) {
      if (
        !formData.dealershipName ||
        !formData.businessAddress ||
        !formData.city ||
        !formData.state ||
        !formData.zipCode
      ) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please fill in all required fields",
        })
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formData.phone || !formData.dealerLicense || !formData.taxId) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please fill in all required fields",
        })
        return
      }
      setStep(3)
    } else if (step === 3) {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!formData.agreesToTerms) {
      toast({
        variant: "destructive",
        title: "Agreement required",
        description: "Please agree to the terms and conditions",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/dealer/onboarding", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Onboarding failed"))
      }

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you within 1-2 business days.",
      })

      setStep(4)

      setTimeout(() => {
        router.push("/dealer/dashboard")
      }, 3000)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dealer Onboarding</h1>
            <p className="text-muted-foreground">Complete your dealer profile to start receiving auction invitations</p>

            <div className="flex items-center gap-2 mt-6">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 1 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Business Info</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 2 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Licensing</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step >= 3 ? "border-primary bg-primary text-white" : "border-border"
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Review</span>
              </div>
            </div>
          </div>

          {/* Step 1: Business Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Tell us about your dealership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dealershipName">Dealership Name *</Label>
                  <Input
                    id="dealershipName"
                    value={formData.dealershipName}
                    onChange={(e) => setFormData({ ...formData, dealershipName: e.target.value })}
                    placeholder="Premium Auto Sales"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address *</Label>
                  <Input
                    id="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
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
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="90001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsInBusiness">Years in Business</Label>
                  <Input
                    id="yearsInBusiness"
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                    placeholder="5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={handleNext}>Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Licensing & Credentials */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Licensing & Credentials</CardTitle>
                <CardDescription>Provide your business licenses and certifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Business Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dealerLicense">Dealer License Number *</Label>
                  <Input
                    id="dealerLicense"
                    value={formData.dealerLicense}
                    onChange={(e) => setFormData({ ...formData, dealerLicense: e.target.value })}
                    placeholder="DL-123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN *</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="12-3456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventorySize">Average Inventory Size</Label>
                  <Input
                    id="inventorySize"
                    type="number"
                    value={formData.inventorySize}
                    onChange={(e) => setFormData({ ...formData, inventorySize: e.target.value })}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specializations">Vehicle Specializations</Label>
                  <Textarea
                    id="specializations"
                    value={formData.specializations}
                    onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                    placeholder="Luxury sedans, SUVs, electric vehicles..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Terms & Submission */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>Review your information and accept our terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Dealership Name</div>
                    <div className="text-base">{formData.dealershipName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Address</div>
                    <div className="text-base">
                      {formData.businessAddress}, {formData.city}, {formData.state} {formData.zipCode}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Phone</div>
                      <div className="text-base">{formData.phone}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">License</div>
                      <div className="text-base">{formData.dealerLicense}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold">Dealer Terms & Conditions</h3>
                  <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
                    <p>By submitting this application, you agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate and truthful information about your dealership</li>
                      <li>Maintain valid business licenses and insurance</li>
                      <li>Respond to auction invitations within 24 hours</li>
                      <li>Honor all submitted offers and pricing</li>
                      <li>Upload contracts within 48 hours of deal selection</li>
                      <li>Comply with AutoLenis Contract Shield requirements</li>
                      <li>Maintain professional communication with buyers</li>
                      <li>Complete vehicle delivery within agreed timeframes</li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="agreesToTerms"
                      checked={formData.agreesToTerms}
                      onChange={(e) => setFormData({ ...formData, agreesToTerms: e.target.checked })}
                      className="mt-1"
                    />
                    <Label htmlFor="agreesToTerms" className="cursor-pointer">
                      I have read and agree to the Dealer Terms & Conditions
                    </Label>
                  </div>
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={!formData.agreesToTerms || loading}>
                    {loading ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <Card className="text-center">
              <CardContent className="pt-12 pb-12">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3">Application Submitted!</h2>
                <p className="text-muted-foreground mb-6">
                  Your dealer application has been received. Our team will review it and contact you within 1-2 business
                  days.
                </p>
                <Button onClick={() => router.push("/dealer/dashboard")}>Go to Dashboard</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
