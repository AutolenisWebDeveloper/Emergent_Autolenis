"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { Car, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"

type Condition = "excellent" | "good" | "fair" | "poor"

export default function BuyerTradeInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shortlistId = searchParams.get("shortlistId")
  const { toast } = useToast()

  // Form state
  const [hasTrade, setHasTrade] = useState<boolean | null>(null)
  const [vin, setVin] = useState("")
  const [mileage, setMileage] = useState("")
  const [condition, setCondition] = useState<Condition | "">("")
  const [hasLoan, setHasLoan] = useState<boolean | null>(null)
  const [estimatedPayoff, setEstimatedPayoff] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingTradeIn, setExistingTradeIn] = useState<any>(null)

  useEffect(() => {
    const loadExistingTradeIn = async () => {
      try {
        const url = shortlistId ? `/api/buyer/trade-in?shortlistId=${shortlistId}` : "/api/buyer/trade-in"
        const res = await fetch(url)
        const data = await res.json()

        if (data.success && data.data.tradeIn) {
          const t = data.data.tradeIn
          setExistingTradeIn(t)
          setHasTrade(t.hasTrade)
          setVin(t.vin || "")
          setMileage(t.mileage?.toString() || "")
          setCondition(t.condition || "")
        setHasLoan(t.hasLoan)
        setEstimatedPayoff(t.estimatedPayoffCents ? (t.estimatedPayoffCents / 100).toString() : "")
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
    }
    loadExistingTradeIn()
  }, [shortlistId])

  const handleSkip = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/buyer/trade-in", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          shortlistId,
          skipTradeIn: true,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Trade-in submission failed"))

      toast({
        title: "Trade-in step completed",
        description: "Proceeding to auction",
      })

      router.push("/buyer/shortlist")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/buyer/trade-in", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          shortlistId,
          hasTrade,
          vin: vin || null,
          mileage: mileage ? Number.parseInt(mileage) : null,
          condition: condition || null,
          hasLoan,
          estimatedPayoffCents: estimatedPayoff ? Math.round(Number.parseFloat(estimatedPayoff) * 100) : null,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(extractApiError(data.error, "Trade-in update failed"))

      toast({
        title: "Trade-in info saved",
        description: "Your trade-in information has been recorded",
      })

      router.push("/buyer/shortlist")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Trade-In Information</h1>
            <p className="text-muted-foreground">Optional step before starting your auction</p>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Do You Have a Trade-In?</CardTitle>
                <CardDescription>This step is optional</CardDescription>
              </div>
            </div>
            {existingTradeIn?.stepCompleted && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Yes/No Selection */}
            <RadioGroup
              value={hasTrade === true ? "yes" : hasTrade === false ? "no" : ""}
              onValueChange={(v) => setHasTrade(v === "yes")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="flex-1 cursor-pointer">
                  Yes, I have a vehicle I may trade in
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="flex-1 cursor-pointer">
                  No trade-in
                </Label>
              </div>
            </RadioGroup>

            {/* Vehicle Details Section - Only shown if hasTrade is true */}
            {hasTrade === true && (
              <div className="space-y-6 pt-4 border-t">
                <h3 className="font-semibold">Vehicle Details</h3>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
                    <Input
                      id="vin"
                      value={vin}
                      onChange={(e) => setVin(e.target.value.toUpperCase())}
                      placeholder="1HGBH41JXMN109186"
                      maxLength={17}
                    />
                    <p className="text-xs text-muted-foreground">17-character code found on dashboard or door jamb</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Current Mileage</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="75000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Condition (self-reported)</Label>
                    <RadioGroup
                      value={condition}
                      onValueChange={(v) => setCondition(v as Condition)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {[
                        { value: "excellent", label: "Excellent" },
                        { value: "good", label: "Good" },
                        { value: "fair", label: "Fair" },
                        { value: "poor", label: "Poor" },
                      ].map((opt) => (
                        <div
                          key={opt.value}
                          className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        >
                          <RadioGroupItem value={opt.value} id={opt.value} />
                          <Label htmlFor={opt.value} className="cursor-pointer">
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                {/* Loan/Payoff Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Loan / Payoff (optional)</h3>

                  <div className="space-y-2">
                    <Label>Do you still owe money on this vehicle?</Label>
                    <RadioGroup
                      value={hasLoan === true ? "yes" : hasLoan === false ? "no" : ""}
                      onValueChange={(v) => setHasLoan(v === "yes")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="loan-yes" />
                        <Label htmlFor="loan-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="loan-no" />
                        <Label htmlFor="loan-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {hasLoan === true && (
                    <div className="space-y-2">
                      <Label htmlFor="payoff">Estimated Payoff Amount ($)</Label>
                      <Input
                        id="payoff"
                        type="number"
                        value={estimatedPayoff}
                        onChange={(e) => setEstimatedPayoff(e.target.value)}
                        placeholder="12500"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your best estimate - the dealership will verify the exact amount
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important Notice</p>
                  <p>
                    Trade-in information is provided directly by you. AutoLenis does not appraise, inspect, verify, or
                    evaluate any trade-in vehicle. Final trade value will be determined by the dealership after their
                    inspection.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={submitting}
                className="flex-1 sm:flex-none order-2 sm:order-1 bg-transparent"
              >
                Skip Trade-In
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || hasTrade === null}
                className="flex-1 bg-primary hover:bg-primary/90 order-1 sm:order-2"
              >
                {submitting ? (
                  "Saving..."
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
