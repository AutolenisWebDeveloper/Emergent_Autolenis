"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react"

export default function AgreementSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("PENDING")

  const docuSignEvent = searchParams.get("event")

  const checkStatus = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me")
      const meData = await meRes.json()
      const dealerId = meData?.user?.dealerId || meData?.dealerId
      if (!dealerId) return

      const res = await fetch(`/api/dealer/onboarding/agreement/status?dealerId=${dealerId}`)
      if (!res.ok) return
      const data = await res.json()
      setStatus(data.status || "PENDING")
    } catch {
      // Silent — will retry
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()

    // Poll for status updates (webhook may take a moment)
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [checkStatus])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // DocuSign returned a decline event
  if (docuSignEvent === "decline") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Agreement Declined</AlertTitle>
          <AlertDescription>
            You declined the dealer participation agreement. Your dealer account cannot
            be activated without a signed agreement. Please contact support if this
            was a mistake.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dealer/onboarding/agreement")}>
          Return to Agreement
        </Button>
      </div>
    )
  }

  // Completed
  if (status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle>Agreement Signed Successfully!</CardTitle>
                <CardDescription>
                  Your dealer participation agreement has been completed.
                  Your account is now being activated.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dealer/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pending — waiting for webhook to confirm completion
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <CardTitle>Processing Your Agreement</CardTitle>
              <CardDescription>
                Thank you for signing! We are processing your agreement.
                This typically takes a few moments.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for confirmation...</span>
            </div>
            <Button variant="outline" onClick={() => router.push("/dealer/onboarding/agreement")}>
              Return to Agreement Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
