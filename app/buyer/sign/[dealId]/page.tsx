"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, FileText } from "lucide-react"

export default function ESignPage() {
  const params = useParams()
  const router = useRouter()
  const [_loading, _setLoading] = useState(false)
  const [envelope, setEnvelope] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEnvelope = async () => {
      try {
        const dealRes = await fetch(`/api/buyer/deal`)
        const dealData = await dealRes.json()

        if (dealData.success && dealData.data.deal) {
          if (dealData.data.deal.status === "INSURANCE_PENDING" || !dealData.data.deal.insurancePolicy) {
            setError("Insurance coverage is required before signing. Please complete insurance first.")
            return
          }
        }

        const res = await fetch(`/api/esign/create`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ dealId: params['dealId'] }),
      })

      if (!res.ok) throw new Error("Failed to create envelope")

      const data = await res.json()
      setEnvelope(data)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Signing failed")
    }
    }
    loadEnvelope()
  }, [params])

  async function openSigningUrl() {
    if (envelope?.signUrl) {
      window.open(envelope.signUrl, "_blank")
    }
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="container mx-auto py-8">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (!envelope) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Sign Your Documents
            </CardTitle>
            <CardDescription>Review and sign your purchase documents electronically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Documents to Sign</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Purchase Agreement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Finance Contract</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>AutoLenis Service Agreement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>State-Required Disclosures</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">What to Expect</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>You&apos;ll be redirected to our secure e-sign platform</li>
                <li>Review each document carefully</li>
                <li>Sign where indicated</li>
                <li>We&apos;ll notify you when the dealer signs</li>
              </ul>
            </div>

            {envelope.status === "COMPLETED" ? (
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="font-semibold">All Documents Signed</p>
                <p className="text-sm text-muted-foreground">Your deal is complete!</p>
                <Button onClick={() => router.push(`/buyer/pickup/${params['dealId']}`)} className="mt-4">
                  Schedule Pickup
                </Button>
              </div>
            ) : (
              <Button onClick={openSigningUrl} size="lg" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Signing Portal
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
