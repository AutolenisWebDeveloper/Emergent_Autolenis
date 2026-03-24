"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { FileText, ExternalLink, CheckCircle2 } from "lucide-react"
import { extractApiError } from "@/lib/utils/error-message"

export default function DealEsignPage() {
  const [deal, setDeal] = useState<any>(null)
  const [envelope, setEnvelope] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const dealRes = await fetch("/api/buyer/deal")
        const dealData = await dealRes.json()

        if (dealData.success && dealData.data.deal) {
          setDeal(dealData.data.deal)

          // Check if insurance is complete
          if (
            dealData.data.deal.status !== "INSURANCE_COMPLETE" &&
            dealData.data.deal.status !== "CONTRACT_PENDING" &&
            dealData.data.deal.status !== "CONTRACT_REVIEW" &&
          dealData.data.deal.status !== "SIGNED"
        ) {
          toast({
            title: "Insurance required",
            description: "Please complete insurance before signing",
            variant: "destructive",
          })
          router.push("/buyer/deal/insurance")
          return
        }

        // Check for existing envelope
        if (dealData.data.deal.esignEnvelope) {
          setEnvelope(dealData.data.deal.esignEnvelope)
        }
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
    loadData()
  }, [router, toast])

  const createEnvelope = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/esign/create", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ dealId: deal.id }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "E-sign operation failed"))
      }

      setEnvelope(data.data)

      toast({
        title: "Documents ready",
        description: "Click to open the signing portal",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setCreating(false)
    }
  }

  const openSigningPortal = () => {
    if (envelope?.signUrl) {
      window.open(envelope.signUrl, "_blank")
    }
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

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">E-Sign Documents</h1>
          <p className="text-muted-foreground">Review and sign your purchase documents electronically</p>
        </div>

        {/* Signing Status */}
        {envelope?.status === "COMPLETED" && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Documents Signed</p>
                  <p className="text-sm text-green-700">All documents have been signed successfully</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents to Sign
            </CardTitle>
            <CardDescription>Review each document carefully before signing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                "Purchase Agreement",
                "Finance Contract",
                "AutoLenis Service Agreement",
                "State-Required Disclosures",
                "Vehicle Condition Report",
              ].map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What to Expect */}
        <Card>
          <CardHeader>
            <CardTitle>What to Expect</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7ED321] flex-shrink-0" />
                <span>You'll be redirected to our secure e-sign platform</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7ED321] flex-shrink-0" />
                <span>Review each document carefully</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7ED321] flex-shrink-0" />
                <span>Sign where indicated with your digital signature</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#7ED321] flex-shrink-0" />
                <span>You'll receive copies of all signed documents via email</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            {!envelope ? (
              <Button
                onClick={createEnvelope}
                disabled={creating}
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
              >
                {creating ? "Preparing Documents..." : "Prepare Documents for Signing"}
              </Button>
            ) : envelope.status !== "COMPLETED" ? (
              <Button
                onClick={openSigningPortal}
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Open Signing Portal
              </Button>
            ) : (
              <Button onClick={() => router.push("/buyer/deal/pickup")} size="lg" className="w-full">
                Continue to Schedule Pickup
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
