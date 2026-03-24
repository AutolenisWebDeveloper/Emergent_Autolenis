"use client"

import { useEffect } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Info,
  ArrowRight,
  RefreshCw,
  Car,
  Building2,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BuyerContractsPage() {
  const { toast } = useToast()
  const router = useRouter()

  const { data, error, isLoading, mutate } = useSWR("/api/buyer/contracts", fetcher, {
    refreshInterval: 15000,
  })

  useEffect(() => {
    if (data?.data?.deal) {
      const validStatuses = [
        "INSURANCE_COMPLETE",
        "CONTRACT_PENDING",
        "CONTRACT_REVIEW",
        "CONTRACT_PASSED",
        "ESIGN_READY",
        "ESIGN_SENT",
        "ESIGN_COMPLETE",
      ]
      const dealStatus = data.data.deal.status
      if (!validStatuses.includes(dealStatus)) {
        // Don't redirect, just show a message
      }
    }
  }, [data, router, toast])

  const deal = data?.data?.deal
  const scan = data?.data?.scan
  const documents = data?.data?.documents || []

  const handleContinue = () => {
    router.push("/buyer/deal/esign")
  }

  const handleRefresh = () => {
    mutate()
    toast({
      title: "Refreshing...",
      description: "Checking for contract updates",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
      case "PASSED":
        return <ShieldCheck className="h-6 w-6 text-green-600" />
      case "PENDING":
      case "RUNNING":
        return <Clock className="h-6 w-6 text-blue-600" />
      case "REVIEW_READY":
        return <ShieldAlert className="h-6 w-6 text-amber-600" />
      case "FAIL":
      case "FAILED":
        return <ShieldX className="h-6 w-6 text-red-600" />
      default:
        return <Shield className="h-6 w-6 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
      case "PASSED":
        return "bg-green-50 border-green-200 text-green-900"
      case "PENDING":
      case "RUNNING":
        return "bg-blue-50 border-blue-200 text-blue-900"
      case "REVIEW_READY":
        return "bg-amber-50 border-amber-200 text-amber-900"
      case "FAIL":
      case "FAILED":
        return "bg-red-50 border-red-200 text-red-900"
      default:
        return "bg-muted/50 border-gray-200 text-foreground"
    }
  }

  const isPassed = scan?.status === "PASS" || scan?.status === "PASSED"

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  // Error state
  if (error) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load contract information</h2>
          <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  // No deal state
  if (!deal) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Contract Shield™</h1>
            <p className="text-muted-foreground">AI-powered contract review assistant</p>
          </div>

          <Card className="border-2 border-dashed">
            <CardContent className="py-12">
              <div className="text-center">
                <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Deal</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Contract Shield will automatically review your purchase agreement once you have selected a deal. Start
                  by searching for vehicles or reviewing your auction offers.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => router.push("/buyer/search")} variant="outline">
                    <Car className="h-4 w-4 mr-2" />
                    Search Vehicles
                  </Button>
                  <Button onClick={() => router.push("/buyer/auction")} className="bg-primary hover:bg-primary/90">
                    View Auctions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                How Contract Shield Works
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Documents Uploaded</p>
                    <p className="text-muted-foreground">Dealer uploads purchase agreement</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Automated Review</p>
                    <p className="text-muted-foreground">AI compares against your offer</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Review Summary</p>
                    <p className="text-muted-foreground">Get flagged items to discuss</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Contract Review</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              We've compared your contract documents to your accepted offer
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Vehicle Info Card */}
        {deal.inventoryItem && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Car className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {deal.inventoryItem.year} {deal.inventoryItem.make}{" "}
                      {deal.inventoryItem.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">VIN: {deal.inventoryItem.vin}</p>
                  </div>
                </div>
                {deal.dealer && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{deal.dealer.businessName || deal.dealer.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Shield Status Card */}
        <Card className="border-2 border-[#7ED321]">
          <CardHeader className="bg-gradient-to-r from-primary to-[#0066FF] text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Contract Shield™ Review
            </CardTitle>
            <CardDescription className="text-white/80">Automated contract comparison tool</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Waiting for documents */}
            {!scan && documents.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Waiting for Contract Documents</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  The dealer will upload the purchase agreement for review. This typically takes 1-2 business days after
                  you've completed the insurance step.
                </p>
              </div>
            )}

            {/* Documents uploaded, scanning */}
            {!scan && documents.length > 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066FF] mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Reviewing Documents...</h3>
                <p className="text-sm text-muted-foreground">
                  Contract Shield is comparing the documents to your accepted offer
                </p>
              </div>
            )}

            {/* Scan results */}
            {scan && (
              <div className={`border rounded-lg p-4 sm:p-6 ${getStatusColor(scan.status)}`}>
                <div className="flex items-start gap-4 mb-4">
                  {getStatusIcon(scan.status)}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold">
                      {isPassed && "Review Complete - No Items Flagged"}
                      {scan.status === "PENDING" && "Review In Progress"}
                      {scan.status === "RUNNING" && "Analyzing Documents..."}
                      {scan.status === "REVIEW_READY" && "Items to Review Before Signing"}
                      {(scan.status === "FAIL" || scan.status === "FAILED") && "Items Need Attention"}
                    </h3>
                    {scan.summary && <p className="text-sm mt-1">{scan.summary}</p>}
                  </div>
                </div>

                {/* Checks Summary Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80">
                    {scan.aprMatch ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">APR Match</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80">
                    {scan.paymentMatch ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">Payment Match</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80">
                    {scan.otdMatch ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">Price Match</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80">
                    {!scan.junkFeesDetected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">Fees Reviewed</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix List */}
        {scan && scan.fixList && scan.fixList.length > 0 && !isPassed && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Items to Review with Your Dealer ({scan.fixList.length})
              </CardTitle>
              <CardDescription>
                These items may need clarification. Discuss them with the dealer before signing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scan.fixList.map((fix: any) => (
                  <div
                    key={fix.id}
                    className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                      fix.resolved
                        ? "border-green-500 bg-green-50"
                        : fix.severity === "CRITICAL"
                          ? "border-red-500 bg-red-50"
                          : fix.severity === "IMPORTANT"
                            ? "border-amber-500 bg-amber-50"
                            : "border-blue-500 bg-blue-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <Badge
                        variant={fix.resolved ? "default" : "outline"}
                        className={`w-fit ${
                          fix.resolved
                            ? "bg-green-600"
                            : fix.severity === "CRITICAL"
                              ? "border-red-600 text-red-700"
                              : fix.severity === "IMPORTANT"
                                ? "border-amber-600 text-amber-700"
                                : "border-blue-600 text-blue-700"
                        }`}
                      >
                        {fix.resolved
                          ? "ADDRESSED"
                          : fix.severity === "CRITICAL"
                            ? "NEEDS ATTENTION"
                            : fix.severity === "IMPORTANT"
                              ? "IMPORTANT"
                              : "FOR REVIEW"}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm sm:text-base">{fix.description}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Suggestion:</strong> {fix.expectedFix}
                        </p>
                      </div>
                      {fix.resolved && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 hidden sm:block" />
                      )}
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
                <p className="font-medium text-gray-700 mb-1">Important Information</p>
                <p>
                  Contract Shield is an automated review tool designed to help identify potential discrepancies. It does
                  not provide legal, tax, or financial advice. It may not detect every issue. You are responsible for
                  reviewing and understanding your contract before signing. If you have questions, consider speaking
                  with a qualified professional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Documents */}
        {documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Documents ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {doc.documentType?.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Version {doc.version} • Uploaded{" "}
                          {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {(doc.fileUrl || doc.documentUrl) && (
                      <Button variant="outline" size="sm" asChild className="w-full sm:w-auto bg-transparent">
                        <a href={doc.fileUrl || doc.documentUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Document
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        {isPassed && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <ShieldCheck className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <h3 className="text-xl font-bold text-green-900">Ready to Proceed</h3>
                <p className="text-green-700 text-sm sm:text-base">
                  Our review didn't flag any items for attention. You should still review your documents carefully
                  before signing.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] hover:opacity-90 text-primary font-semibold"
                onClick={handleContinue}
              >
                Continue to E-Sign
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
