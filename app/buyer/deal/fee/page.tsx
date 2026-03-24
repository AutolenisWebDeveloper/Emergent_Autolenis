"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { CreditCard, CheckCircle2, DollarSign, Percent } from "lucide-react"
import { FeePaymentModal } from "@/components/buyer/fee-payment-modal"

export default function DealFeePage() {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadDeal = async () => {
      try {
        const response = await fetch("/api/buyer/deal")
        const data = await response.json()

        if (data.success && data.data.deal) {
          setDeal(data.data.deal)
        } else {
          router.push("/buyer/dashboard")
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load deal information",
        })
      } finally {
        setLoading(false)
      }
    }
    loadDeal()
  }, [router, toast])

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    toast({
      title: "Payment successful!",
      description: "Moving to insurance",
    })
    router.push("/buyer/deal/insurance")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!deal) {
    return null
  }

  const isPaid =
    deal.status === "FEE_PAID" || deal.status === "INSURANCE_PENDING" || deal.status === "INSURANCE_COMPLETE"

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Concierge Fee</h1>
          <p className="text-muted-foreground">One-time service fee for your AutoLenis concierge experience</p>
        </div>

        {/* Payment Status */}
        {isPaid && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Fee Paid</p>
                  <p className="text-sm text-green-700">Your concierge fee has been processed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fee Breakdown */}
        <Card className="border-2 border-[#7ED321]">
          <CardHeader className="bg-gradient-to-r from-primary to-[#0066FF] text-white">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              AutoLenis Concierge Fee
            </CardTitle>
            <CardDescription className="text-white/80">Covers all services from search to delivery</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-[#0066FF]">$499</p>
              <p className="text-sm text-muted-foreground">Premium concierge fee — $99 deposit credited toward fee</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">What's Included:</h4>
              <div className="grid gap-2">
                {[
                  "Dealer auction & price negotiation",
                  "Contract Shield AI review",
                  "Financing coordination",
                  "Insurance assistance",
                  "E-Sign document handling",
                  "Pickup scheduling & QR verification",
                  "Dedicated support throughout",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#7ED321] flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finance Fee Option */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Finance Your Fee
            </CardTitle>
            <CardDescription>Option to include the fee in your financing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You can choose to pay the concierge fee upfront or roll it into your vehicle financing (subject to lender
              approval). If financed, this adds approximately $8-15/month to your payment.
            </p>
            <Badge variant="outline">Available with dealer financing</Badge>
          </CardContent>
        </Card>

        {/* Payment Actions */}
        {!isPaid && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={() => setShowPaymentModal(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Pay Concierge Fee
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">Secure payment powered by Stripe</p>
            </CardContent>
          </Card>
        )}

        {isPaid && (
          <Button onClick={() => router.push("/buyer/deal/insurance")} size="lg" className="w-full">
            Continue to Insurance
          </Button>
        )}

        <FeePaymentModal
          open={showPaymentModal}
          dealId={deal.id}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentSuccess}
        />
      </div>
    </ProtectedRoute>
  )
}
