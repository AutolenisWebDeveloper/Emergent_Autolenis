"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { CheckCircle2, Shield, ArrowRight, FileText } from "lucide-react"

export default function InsuranceConfirmedPage() {
  const [deal, setDeal] = useState<any>(null)
  const [insurance, setInsurance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()
        if (!dealData.success) {
          router.push("/buyer/dashboard")
          return
        }
        setDeal(dealData.data.deal)

        const insRes = await fetch(`/api/buyer/deals/${dealData.data.deal.id}/insurance`)
        const insData = await insRes.json()
        if (insData.success) {
          setInsurance(insData.data)
        }
      } catch {
        toast({ variant: "destructive", title: "Error", description: "Failed to load insurance details." })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router, toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const policy = insurance?.policy

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-4xl w-full mx-auto space-y-6 p-4">
        {/* Success Banner */}
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900 text-2xl">Insurance Complete</CardTitle>
                <CardDescription className="text-green-700">
                  Your insurance coverage has been confirmed for this deal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Policy Summary */}
        {policy && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Policy Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {policy.carrier && (
                  <div><span className="text-muted-foreground">Carrier:</span> <span className="font-medium">{policy.carrier}</span></div>
                )}
                {policy.policyNumber && (
                  <div><span className="text-muted-foreground">Policy Number:</span> <span className="font-medium">{policy.policyNumber}</span></div>
                )}
                {policy.effectiveDate && (
                  <div><span className="text-muted-foreground">Effective Date:</span> <span className="font-medium">{new Date(policy.effectiveDate).toLocaleDateString()}</span></div>
                )}
                {policy.expirationDate && (
                  <div><span className="text-muted-foreground">Expiration Date:</span> <span className="font-medium">{new Date(policy.expirationDate).toLocaleDateString()}</span></div>
                )}
                {policy.status && (
                  <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{policy.status}</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Your insurance is confirmed. Here&apos;s what to do next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Proceed to Contracts</p>
                <p className="text-sm text-muted-foreground">Review and sign your purchase contracts to finalize the deal.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white"
                onClick={() => router.push("/buyer/contracts")}
              >
                Proceed to Contracts <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/buyer/deal/insurance")}
              >
                <Shield className="h-4 w-4 mr-2" /> Back to Insurance Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
