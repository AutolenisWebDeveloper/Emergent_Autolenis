"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Shield, CheckCircle2, AlertTriangle } from "lucide-react"

export default function ExternalPrequalPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch("/api/buyer/prequal/status")
      .then(r => r.json())
      .then(d => {
        setStatus(d?.data?.status || d?.status || null)
      })
      .catch(() => {
        setFetchError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="external-prequal-loading">
        <h1 className="text-2xl font-semibold tracking-tight">External Prequalification</h1>
        <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
    <div className="space-y-6" data-testid="external-prequal-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">External Prequalification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Already have a prequalification from another lender? Link it here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Link External Pre-Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              If you&apos;ve been pre-approved by an external lender (bank, credit union, etc.), you can link that pre-approval to your AutoLenis account for a faster deal process.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Contact support to link your external pre-approval: <span className="font-medium">support@autolenis.com</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Unable to load status</p>
                <p className="text-xs text-muted-foreground">Could not retrieve your prequalification status. Please refresh the page or try again later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!fetchError && status && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">AutoLenis Prequalification</p>
                <p className="text-xs text-muted-foreground">Status: {status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </ProtectedRoute>
  )
}
