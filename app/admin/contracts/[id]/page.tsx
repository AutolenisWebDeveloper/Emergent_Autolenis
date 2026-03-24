"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  ShieldCheck,
  ShieldX,
  User,
  Building2,
  Car,
} from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [overrideAction, setOverrideAction] = useState<"FORCE_PASS" | "FORCE_FAIL" | null>(null)
  const [overrideReason, setOverrideReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(`/api/admin/contracts/${id}`, fetcher, {
    refreshInterval: 30000,
  })

  const handleOverride = async () => {
    if (!overrideAction || !overrideReason) {
      toast({ variant: "destructive", title: "Please provide a reason for the override" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/contracts/${id}`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          action: overrideAction,
          reason: overrideReason,
        }),
      })
      const result = await res.json()

      if (result.success) {
        toast({ title: `Contract ${overrideAction === "FORCE_PASS" ? "approved" : "failed"} successfully` })
        setOverrideAction(null)
        setOverrideReason("")
        mutate()
      } else {
        toast({ variant: "destructive", title: result.error || "Override failed" })
      }
    } catch {
      toast({ variant: "destructive", title: "Override failed" })
    } finally {
      setSubmitting(false)
    }
  }

  const scan = data?.data?.scan
  const documents = data?.data?.documents || []

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
    CRITICAL: "bg-red-100 text-red-800",
    WARN: "bg-yellow-100 text-yellow-800",
    INFO: "bg-blue-100 text-blue-800",
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
              Contract Shield Admin Review
            </h1>
            <p className="text-muted-foreground">Review and override contract scan results</p>
          </div>
        </div>
      </div>

      {/* Status & Score */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card
          className={`border-2 ${
            scan.status === "PASS"
              ? "border-green-300 bg-green-50"
              : scan.status === "FAIL"
                ? "border-red-300 bg-red-50"
                : "border-yellow-300 bg-yellow-50"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {scan.status === "PASS" ? (
                <ShieldCheck className="h-10 w-10 text-green-600" />
              ) : (
                <ShieldX className="h-10 w-10 text-red-600" />
              )}
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-bold">{scan.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Issues Found</div>
                <div className="text-2xl font-bold">{scan.issuesCount || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#00D9FF]/10">
                <CheckCircle className="h-6 w-6 text-[#00D9FF]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                <div className="text-2xl font-bold">{scan.overallScore?.toFixed(0) || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Info */}
      {scan.selectedDeal && (
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-semibold">Buyer</div>
                  <div>
                    {scan.selectedDeal.buyer?.profile?.firstName} {scan.selectedDeal.buyer?.profile?.lastName}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-semibold">Dealer</div>
                  <div>{scan.selectedDeal.dealer?.businessName || scan.selectedDeal.dealer?.name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="font-semibold">Vehicle</div>
                  <div>
                    {scan.selectedDeal.inventoryItem?.year} {scan.selectedDeal.inventoryItem?.make}{" "}
                    {scan.selectedDeal.inventoryItem?.model}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    VIN: {scan.selectedDeal.inventoryItem?.vin}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checks Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${scan.aprMatch ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {scan.aprMatch ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">APR Match</span>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${scan.paymentMatch ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {scan.paymentMatch ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">Payment Match</span>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${scan.otdMatch ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {scan.otdMatch ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">OTD Match</span>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${!scan.junkFeesDetected ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {!scan.junkFeesDetected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">Fee Compliance</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fix List */}
      {scan.fixList && scan.fixList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issues List ({scan.fixList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scan.fixList.map((fix: any) => (
                <div
                  key={fix.id}
                  className={`p-4 border rounded-lg ${fix.resolved ? "bg-green-50 border-green-200" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {fix.resolved ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : fix.severity === "CRITICAL" ? (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={severityColors[fix.severity]}>{fix.severity}</Badge>
                          <span className="text-sm text-muted-foreground">{fix.category}</span>
                        </div>
                        <p className="font-medium">{fix.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Expected Fix:</strong> {fix.expectedFix}
                        </p>
                      </div>
                    </div>
                    {fix.resolved && (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{doc.documentType}</div>
                      <div className="text-xs text-muted-foreground">
                        Version {doc.version} • {new Date(doc.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Override */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Override
          </CardTitle>
          <CardDescription>
            Use admin override only in exceptional cases. All overrides are logged for compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={overrideAction === "FORCE_PASS" ? "default" : "outline"}
                onClick={() => setOverrideAction("FORCE_PASS")}
                className={overrideAction === "FORCE_PASS" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Force PASS
              </Button>
              <Button
                variant={overrideAction === "FORCE_FAIL" ? "default" : "outline"}
                onClick={() => setOverrideAction("FORCE_FAIL")}
                className={overrideAction === "FORCE_FAIL" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <ShieldX className="h-4 w-4 mr-2" />
                Force FAIL
              </Button>
            </div>

            {overrideAction && (
              <>
                <Textarea
                  placeholder="Reason for override (required for compliance)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleOverride}
                    disabled={!overrideReason || submitting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Confirm Override
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOverrideAction(null)
                      setOverrideReason("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {scan.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{scan.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
