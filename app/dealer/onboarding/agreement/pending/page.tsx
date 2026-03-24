"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Clock, RefreshCw } from "lucide-react"

export default function AgreementPendingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string>("PENDING")

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const meRes = await fetch("/api/auth/me")
        const meData = await meRes.json()
        const dealerId = meData?.user?.dealerId || meData?.dealerId
        if (!dealerId || cancelled) return

        const res = await fetch(`/api/dealer/onboarding/agreement/status?dealerId=${dealerId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return

        if (data.status === "COMPLETED") {
          router.push("/dealer/onboarding/agreement/success")
          return
        }
        setStatus(data.status || "PENDING")
      } catch {
        // Silent — will retry
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router])

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <CardTitle>Agreement Pending</CardTitle>
              <CardDescription>
                Your dealer agreement is being processed. This page will automatically
                update when the status changes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Current status: {status}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.refresh()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => router.push("/dealer/onboarding/agreement")}>
                Back to Agreement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
