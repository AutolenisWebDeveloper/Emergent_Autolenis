"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  ArrowLeft,
  Info,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface ContractShieldStatus {
  dealId: string | null
  status: string | null
  overallScore: number | null
  aprMatch: boolean
  paymentMatch: boolean
  otdMatch: boolean
  junkFeesDetected: boolean
  totalFlags: number
  criticalFlags: number
  resolvedFlags: number
  summary: string | null
  contractDocumentId: string | null
  lastScanAt: string | null
}

const SCAN_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  PASS: { label: "All Clear", variant: "default", icon: CheckCircle2 },
  REVIEW_READY: { label: "Needs Review", variant: "secondary", icon: Clock },
  IN_REVIEW: { label: "In Review", variant: "secondary", icon: Clock },
  FAIL: { label: "Issues Found", variant: "destructive", icon: AlertTriangle },
  PENDING: { label: "Pending Scan", variant: "outline", icon: Clock },
}

export default function DealContractPage() {
  const router = useRouter()
  const [shield, setShield] = useState<ContractShieldStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchShieldStatus = useCallback(async () => {
    try {
      const dealRes = await fetch("/api/buyer/deal")
      const dealData = await dealRes.json()
      if (!dealData.success || !dealData.data?.deal) {
        setError("NO_DEAL")
        return
      }
      const deal = dealData.data.deal
      const scan = deal.contractScan || null
      setShield({
        dealId: deal.id,
        status: scan?.status || "PENDING",
        overallScore: scan?.overallScore || null,
        aprMatch: scan?.aprMatch ?? false,
        paymentMatch: scan?.paymentMatch ?? false,
        otdMatch: scan?.otdMatch ?? false,
        junkFeesDetected: scan?.junkFeesDetected ?? false,
        totalFlags: scan?.fixList?.length || 0,
        criticalFlags: scan?.fixList?.filter((f: any) => f.severity === "CRITICAL").length || 0,
        resolvedFlags: scan?.fixList?.filter((f: any) => f.resolved).length || 0,
        summary: scan?.summary || null,
        contractDocumentId: deal.contractDocument?.id || null,
        lastScanAt: scan?.createdAt || null,
      })
    } catch {
      setError("LOAD_FAILED")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchShieldStatus() }, [fetchShieldStatus])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="contract-shield-loading">
        <div className="h-8 w-56 bg-muted/50 animate-pulse rounded" />
        <div className="h-4 w-80 bg-muted/40 animate-pulse rounded" />
        <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error === "NO_DEAL" || !shield) {
    return (
      <div className="space-y-6" data-testid="contract-shield-empty">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/deal")} data-testid="back-to-deal-btn">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Contract Shield</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-powered contract review and protection.</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No active deal</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Contract Shield activates once you have an active deal with a contract document uploaded by the dealer. Your contract will be automatically scanned for issues.
            </p>
            <Button variant="outline" onClick={() => router.push("/buyer/deal")} data-testid="go-to-deal-btn">
              Go to My Deal
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "LOAD_FAILED") {
    return (
      <div className="space-y-6" data-testid="contract-shield-error">
        <h1 className="text-2xl font-semibold tracking-tight">Contract Shield</h1>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <h3 className="font-semibold text-lg mb-1">Failed to load</h3>
            <p className="text-sm text-muted-foreground mb-4">Unable to load contract shield status. Please try again.</p>
            <Button variant="outline" onClick={fetchShieldStatus} data-testid="retry-btn">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scanConfig = SCAN_STATUS[shield.status || "PENDING"] || SCAN_STATUS.PENDING
  const ScanIcon = scanConfig.icon
  const remainingFlags = shield.totalFlags - shield.resolvedFlags

  return (
    <div className="space-y-6" data-testid="contract-shield-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/deal")} data-testid="back-to-deal-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contract Shield</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered contract review protecting your purchase.</p>
        </div>
        <Badge variant={scanConfig.variant} className="text-sm px-3 py-1" data-testid="shield-status-badge">
          <ScanIcon className="h-3.5 w-3.5 mr-1.5" />
          {scanConfig.label}
        </Badge>
      </div>

      {/* Score Card */}
      {shield.overallScore !== null && (
        <Card className={`border-2 ${
          shield.overallScore >= 90 ? "border-green-200 bg-green-50/50" :
          shield.overallScore >= 70 ? "border-yellow-200 bg-yellow-50/50" :
          "border-red-200 bg-red-50/50"
        }`} data-testid="shield-score-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  shield.overallScore >= 90 ? "text-green-600" :
                  shield.overallScore >= 70 ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {shield.overallScore}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Shield Score</p>
              </div>
              <div className="flex-1">
                <p className="text-sm">{shield.summary || "Your contract has been reviewed by our AI-powered Contract Shield."}</p>
                {shield.lastScanAt && (
                  <p className="text-xs text-muted-foreground mt-2">Last scanned: {new Date(shield.lastScanAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="shield-checks-grid">
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            {shield.aprMatch ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium">APR Match</p>
            <p className="text-xs text-muted-foreground">{shield.aprMatch ? "Verified" : "Mismatch"}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            {shield.paymentMatch ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium">Payment Match</p>
            <p className="text-xs text-muted-foreground">{shield.paymentMatch ? "Verified" : "Mismatch"}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            {shield.otdMatch ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium">Price Match</p>
            <p className="text-xs text-muted-foreground">{shield.otdMatch ? "Verified" : "Mismatch"}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            {!shield.junkFeesDetected ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium">Fee Review</p>
            <p className="text-xs text-muted-foreground">{shield.junkFeesDetected ? "Flagged" : "Clean"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Flags Summary */}
      {shield.totalFlags > 0 && (
        <Card data-testid="shield-flags-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Flagged Items
            </CardTitle>
            <CardDescription>
              {remainingFlags > 0
                ? `${remainingFlags} item${remainingFlags > 1 ? "s" : ""} still need attention`
                : "All flagged items have been addressed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{shield.totalFlags}</p>
                <p className="text-xs text-muted-foreground">Total Flags</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{shield.criticalFlags}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{shield.resolvedFlags}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No contract uploaded yet */}
      {shield.status === "PENDING" && !shield.contractDocumentId && (
        <Card className="border-dashed" data-testid="contract-pending-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Waiting for Contract</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Once the dealer uploads the contract documents, Contract Shield will automatically scan and review them for your protection.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-muted/30 border-muted" data-testid="shield-disclaimer">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Contract Shield is an AI-powered review assistant. It helps identify potential issues but does not replace legal counsel. Always review contract terms yourself before signing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/buyer/deal/insurance")} data-testid="prev-step-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Insurance
        </Button>
        <Button onClick={() => router.push("/buyer/deal/esign")} data-testid="next-step-btn">
          E-Sign <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
