"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Info,
} from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ContractShieldStatusProps {
  compact?: boolean
}

export function ContractShieldStatus({ compact = false }: ContractShieldStatusProps) {
  const { data, error, isLoading } = useSWR("/api/buyer/contracts", fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return null // Don't show error state, just hide the component
  }

  const deal = data?.data?.deal
  const scan = data?.data?.scan
  const documents = data?.data?.documents || []

  // No deal yet - show initial state
  if (!deal) {
    if (compact) {
      return (
        <Link href="/buyer/contracts" className="block">
          <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">Contract Shield</h4>
              <p className="text-xs text-muted-foreground">AI-powered contract review</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </Link>
      )
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Contract Shield™
          </CardTitle>
          <CardDescription>AI-powered contract review assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Contract Shield will be available once you have a deal in progress.
            </p>
            <Link href="/buyer/search">
              <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                Start Shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get status info
  const getStatusConfig = () => {
    // CMA-specific deal status messaging — takes priority over scan status
    if (deal?.status === "CONTRACT_MANUAL_REVIEW_REQUIRED" || deal?.status === "CONTRACT_INTERNAL_FIX_IN_PROGRESS") {
      return {
        icon: Clock,
        iconClass: "text-blue-600",
        bgClass: "bg-blue-50 border-blue-200",
        label: "Verifying",
        description: "We\u2019re completing a manual verification to ensure your contract is accurate before you sign.",
      }
    }
    if (deal?.status === "CONTRACT_ADMIN_OVERRIDE_APPROVED") {
      return {
        icon: ShieldCheck,
        iconClass: "text-green-600",
        bgClass: "bg-green-50 border-green-200",
        label: "Verified",
        description: "Verified and approved \u2014 ready to sign.",
      }
    }

    if (!scan) {
      if (documents.length > 0) {
        return {
          icon: Clock,
          iconClass: "text-blue-600",
          bgClass: "bg-blue-50 border-blue-200",
          label: "Analyzing",
          description: "Contract Shield is reviewing your documents",
        }
      }
      return {
        icon: Clock,
        iconClass: "text-muted-foreground",
        bgClass: "bg-muted/50 border-gray-200",
        label: "Waiting",
        description: "Waiting for dealer to upload contracts",
      }
    }

    switch (scan.status) {
      case "PASS":
        return {
          icon: ShieldCheck,
          iconClass: "text-green-600",
          bgClass: "bg-green-50 border-green-200",
          label: "Passed",
          description: "No issues found - ready to proceed",
        }
      case "REVIEW_READY":
        return {
          icon: ShieldAlert,
          iconClass: "text-amber-600",
          bgClass: "bg-amber-50 border-amber-200",
          label: "Review Needed",
          description: `${scan.issuesCount || 0} item(s) to review with dealer`,
        }
      case "FAIL":
        return {
          icon: ShieldX,
          iconClass: "text-red-600",
          bgClass: "bg-red-50 border-red-200",
          label: "Attention Required",
          description: "Issues found that need resolution",
        }
      case "PENDING":
      case "RUNNING":
        return {
          icon: Clock,
          iconClass: "text-blue-600",
          bgClass: "bg-blue-50 border-blue-200",
          label: "Processing",
          description: "Analyzing contract documents...",
        }
      default:
        return {
          icon: Shield,
          iconClass: "text-muted-foreground",
          bgClass: "bg-muted/50 border-gray-200",
          label: "Pending",
          description: "Contract review pending",
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  if (compact) {
    return (
      <Link href="/buyer/contracts" className="block">
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border transition-colors hover:opacity-90 ${statusConfig.bgClass}`}
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <StatusIcon className={`h-5 w-5 ${statusConfig.iconClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Contract Shield</h4>
              <Badge
                variant="outline"
                className={`text-xs ${
                  scan?.status === "PASS"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : scan?.status === "REVIEW_READY" || scan?.status === "FAIL"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                }`}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{statusConfig.description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <Card className={`border-2 ${statusConfig.bgClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StatusIcon className={`h-5 w-5 ${statusConfig.iconClass}`} />
            Contract Shield™
          </CardTitle>
          <Badge
            variant="outline"
            className={
              scan?.status === "PASS"
                ? "bg-green-100 text-green-800 border-green-300"
                : scan?.status === "REVIEW_READY" || scan?.status === "FAIL"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
            }
          >
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>{statusConfig.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        {scan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              {scan.aprMatch ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-xs font-medium">APR</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              {scan.paymentMatch ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-xs font-medium">Payment</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              {scan.otdMatch ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-xs font-medium">Price</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80">
              {!scan.junkFeesDetected ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-xs font-medium">Fees</span>
            </div>
          </div>
        )}

        {/* Documents Count */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>
              {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
            </span>
          </div>
        )}

        {/* Action Button */}
        <Link href="/buyer/contracts" className="block">
          <Button className="w-full bg-primary hover:bg-primary/90">
            {scan?.status === "PASS" ? "Continue to E-Sign" : "View Contract Review"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
