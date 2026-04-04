"use client"

import type React from "react"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Upload,
  FileText,
  RefreshCw,
  Info,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DealerContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [rescanLoading, setRescanLoading] = useState(false)
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [explanation, setExplanation] = useState("")

  const { data, error, isLoading, mutate } = useSWR(`/api/contract/scan/${id}`, fetcher, {
    refreshInterval: 15000,
  })

  const handleRescan = async () => {
    setRescanLoading(true)
    try {
      const res = await fetch(`/api/contract/scan/${id}`, { method: "POST", headers: csrfHeaders() })
      const result = await res.json()

      if (result.success) {
        toast({ title: "Re-scan completed" })
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error || "Re-scan failed" })
      }
    } catch {
      toast({ variant: "destructive", title: "Re-scan failed" })
    } finally {
      setRescanLoading(false)
    }
  }

  const handleResolveFix = async (fixItemId: string) => {
    setFixingId(fixItemId)
    try {
      const res = await fetch("/api/contract/fix", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          fixItemId,
          resolved: true,
          explanation: explanation || undefined,
        }),
      })
      const result = await res.json()

      if (result.success) {
        toast({ title: "Issue marked as resolved" })
        setExplanation("")
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error || "Failed to resolve" })
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to resolve issue" })
    } finally {
      setFixingId(null)
    }
  }

  const scan = data?.data?.scan

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Contract scan not found</h2>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-amber-100 text-amber-800 border-amber-300",
    IMPORTANT: "bg-amber-100 text-amber-800 border-amber-300",
    WARN: "bg-yellow-100 text-yellow-800 border-yellow-300",
    REVIEW: "bg-blue-100 text-blue-800 border-blue-300",
    INFO: "bg-blue-100 text-blue-800 border-blue-300",
  }

  const severityIcons: Record<string, React.ReactNode> = {
    CRITICAL: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    IMPORTANT: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    WARN: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    REVIEW: <Info className="h-5 w-5 text-blue-600" />,
    INFO: <Info className="h-5 w-5 text-blue-600" />,
  }

  const severityLabels: Record<string, string> = {
    CRITICAL: "NEEDS ATTENTION",
    IMPORTANT: "WORTH DISCUSSING",
    WARN: "FOR REVIEW",
    REVIEW: "FOR REVIEW",
    INFO: "INFORMATIONAL",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Contract Review Details
            </h1>
            <p className="text-muted-foreground">Review flagged items and provide clarifications</p>
          </div>
        </div>
        <Button onClick={handleRescan} disabled={rescanLoading} className="bg-primary hover:bg-primary/90">
          <RefreshCw className={`h-4 w-4 mr-2 ${rescanLoading ? "animate-spin" : ""}`} />
          Re-run Review
        </Button>
      </div>

      {/* Status Overview */}
      <Card
        className={`border-2 ${
          scan.status === "PASS"
            ? "border-green-300 bg-green-50"
            : scan.status === "FAIL"
              ? "border-amber-300 bg-amber-50"
              : "border-yellow-300 bg-yellow-50"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {scan.status === "PASS" ? (
              <CheckCircle className="h-12 w-12 text-green-600" />
            ) : scan.status === "FAIL" ? (
              <AlertTriangle className="h-12 w-12 text-amber-600" />
            ) : (
              <Clock className="h-12 w-12 text-yellow-600" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {scan.status === "PASS" && "Review Complete - No Items Flagged"}
                {scan.status === "FAIL" && "Items Flagged for Review"}
                {scan.status === "REVIEW_READY" && "Items to Review"}
                {scan.status === "IN_REVIEW" && "Review In Progress"}
                {scan.status === "PENDING" && "Review Pending"}
              </h2>
              <p className="text-muted-foreground">{scan.summary}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-bold">{scan.overallScore?.toFixed(0) || 0}%</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
          </div>

          {/* Checks Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white">
              {scan.aprMatch ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-medium">APR Match</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white">
              {scan.paymentMatch ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-medium">Payment Match</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white">
              {scan.otdMatch ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-medium">Price Match</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white">
              {!scan.junkFeesDetected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Info className="h-5 w-5 text-blue-600" />
              )}
              <span className="font-medium">Fees Reviewed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fix List */}
      {scan.fixList && scan.fixList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Items to Clarify ({scan.fixList.filter((f: any) => !f.resolved).length} remaining)
            </CardTitle>
            <CardDescription>
              Review each item below. You can provide an explanation or upload corrected documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scan.fixList.map((fix: any) => (
                <div
                  key={fix.id}
                  className={`p-4 border rounded-lg ${
                    fix.resolved ? "bg-green-50 border-green-200" : severityColors[fix.severity] || severityColors['INFO']
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {fix.resolved ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        severityIcons[fix.severity] || severityIcons['INFO']
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={fix.resolved ? "default" : "outline"}>
                          {fix.resolved ? "ADDRESSED" : severityLabels[fix.severity] || "FOR REVIEW"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{fix.category}</span>
                      </div>
                      <h4 className="font-semibold mb-1">{fix.description}</h4>
                      <p className="text-sm text-gray-700">
                        <strong>Suggested Action:</strong> {fix.expectedFix}
                      </p>

                      {!fix.resolved && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            placeholder="Add explanation or notes (optional)"
                            value={fixingId === fix.id ? explanation : ""}
                            onChange={(e) => {
                              setFixingId(fix.id)
                              setExplanation(e.target.value)
                            }}
                            className="bg-white"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Updated Doc
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolveFix(fix.id)}
                              disabled={fixingId === fix.id}
                              className="bg-[#7ED321] hover:bg-[#7ED321]/90"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Addressed
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-muted/50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                Contract Shield is a review assistant designed to support your existing processes, not replace your own
                review or legal/compliance counsel. Final responsibility for document accuracy and legal compliance
                remains with you and the buyer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal Info */}
      {scan.selectedDeal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Buyer</h4>
                <p>
                  {scan.selectedDeal.buyer?.profile?.firstName} {scan.selectedDeal.buyer?.profile?.lastName}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Vehicle</h4>
                <p>
                  {scan.selectedDeal.inventoryItem?.year} {scan.selectedDeal.inventoryItem?.make}{" "}
                  {scan.selectedDeal.inventoryItem?.model}
                </p>
                <p className="text-sm text-muted-foreground">VIN: {scan.selectedDeal.inventoryItem?.vin}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
