"use client"

import { use, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { AlertCircle, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerDealInsurancePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, error, isLoading } = useSWR(`/api/dealer/deals/${dealId}/insurance`, fetcher)
  const [requestingDocs, setRequestingDocs] = useState(false)

  async function handleRequestDocs() {
    setRequestingDocs(true)
    try {
      await fetch(`/api/dealer/deals/${dealId}/insurance/request-docs`, {
        method: "POST",
        headers: csrfHeaders(),
      })
    } finally {
      setRequestingDocs(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !data?.success) {
    return (
      <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
        <div className="flex flex-col items-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Failed to load insurance data</h2>
        </div>
      </ProtectedRoute>
    )
  }

  const { insuranceStatus, policySummary } = data.data

  return (
    <ProtectedRoute allowedRoles={["DEALER", "DEALER_USER"]}>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dealer/deals">Deals</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/dealer/deals/${dealId}`}>{dealId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Insurance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Insurance — Deal #{dealId}</h1>
          <Button variant="outline" asChild>
            <Link href={`/dealer/deals/${dealId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        {/* Insurance Status */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Status</CardTitle>
            <CardDescription>Current insurance status for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge>{insuranceStatus || "PENDING"}</Badge>
          </CardContent>
        </Card>

        {/* Policy Summary */}
        {policySummary && (
          <Card>
            <CardHeader>
              <CardTitle>Policy Summary</CardTitle>
              <CardDescription>Details of the active insurance policy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Carrier</p>
                  <p className="font-medium">{policySummary.carrier || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Policy Number</p>
                  <p className="font-medium font-mono text-sm">
                    {policySummary.policyNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Effective Date</p>
                  <p className="font-medium">
                    {policySummary.effectiveDate
                      ? new Date(policySummary.effectiveDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiration Date</p>
                  <p className="font-medium">
                    {policySummary.expirationDate
                      ? new Date(policySummary.expirationDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Request insurance documents for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled={requestingDocs} onClick={handleRequestDocs}>
              <FileText className="h-4 w-4 mr-2" />
              {requestingDocs ? "Requesting…" : "Request Documents"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
