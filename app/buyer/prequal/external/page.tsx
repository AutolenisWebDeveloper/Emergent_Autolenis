"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Shield, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

export default function ExternalPrequalPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/buyer/prequal/status").then(r => r.json()).then(d => {
      setStatus(d?.data?.status || d?.status || null)
    }).catch(() => {}).finally(() => setLoading(false))
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

      {status && (
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
  )
}
