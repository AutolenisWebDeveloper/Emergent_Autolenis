"use client"

import { use, useState } from "react"
import { csrfHeaders } from "@/lib/csrf-client"
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
import { AlertCircle, ArrowLeft, CheckCircle, Clock, FileText, ShieldCheck, ShieldX } from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDealInsurancePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/deals/${dealId}/insurance`, fetcher)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleVerify(policyId: string, verified: boolean) {
    setActionLoading(policyId)
    try {
      await fetch(`/api/admin/deals/${dealId}/insurance/verify-external`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ policy_id: policyId, verified }),
      })
      mutate()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRequestDocs() {
    setActionLoading("request-docs")
    try {
      await fetch(`/api/admin/deals/${dealId}/insurance/request-docs`, {
        method: "POST",
        headers: csrfHeaders(),
      })
      mutate()
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !data?.success) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
        <div className="flex flex-col items-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Failed to load insurance data</h2>
        </div>
      </ProtectedRoute>
    )
  }

  const { deal, quotes, policies, events } = data.data

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/admin/deals/${dealId}`}>{dealId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Insurance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Insurance — Deal #{dealId}</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={actionLoading === "request-docs"}
              onClick={handleRequestDocs}
            >
              <FileText className="h-4 w-4 mr-2" />
              {actionLoading === "request-docs" ? "Requesting…" : "Request Documents"}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/deals/${dealId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {/* Deal Insurance Status */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Status</CardTitle>
            <CardDescription>Current insurance status for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge>{deal?.insuranceStatus || "PENDING"}</Badge>
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quotes</CardTitle>
            <CardDescription>Insurance quotes associated with this deal</CardDescription>
          </CardHeader>
          <CardContent>
            {quotes && quotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Carrier</th>
                      <th className="text-left py-2 px-3 font-medium">Product</th>
                      <th className="text-left py-2 px-3 font-medium">Monthly Premium</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3">{quote.carrier as string}</td>
                        <td className="py-2 px-3">{quote.productName as string}</td>
                        <td className="py-2 px-3">
                          ${Number(quote.monthlyPremium || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{quote.status as string}</Badge>
                        </td>
                        <td className="py-2 px-3">
                          {quote.expiresAt
                            ? new Date(quote.expiresAt as string).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quotes available.</p>
            )}
          </CardContent>
        </Card>

        {/* Policies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>Active and pending insurance policies. Verification is informational only and does not affect deal progression.</CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Carrier</th>
                      <th className="text-left py-2 px-3 font-medium">Policy Number</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Coverage Period</th>
                      <th className="text-left py-2 px-3 font-medium">Verified</th>
                      <th className="text-left py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3">{policy.type as string}</td>
                        <td className="py-2 px-3">{policy.carrier as string}</td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {policy.policyNumber as string}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{policy.status as string}</Badge>
                        </td>
                        <td className="py-2 px-3">
                          {policy.effectiveDate
                            ? `${new Date(policy.effectiveDate as string).toLocaleDateString()} – ${new Date(policy.expirationDate as string).toLocaleDateString()}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {policy.isVerified ? (
                            <Badge className="bg-green-100 text-green-800">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <ShieldX className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {policy.type === "EXTERNAL" && !policy.isVerified ? (
                            <Button
                              size="sm"
                              disabled={actionLoading === String(policy.id)}
                              onClick={() => handleVerify(String(policy.id), true)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {actionLoading === String(policy.id) ? "Verifying…" : "Verify"}
                            </Button>
                          ) : null}
                          {policy.type === "EXTERNAL" && policy.isVerified ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoading === String(policy.id)}
                              onClick={() => handleVerify(String(policy.id), false)}
                            >
                              <ShieldX className="h-3 w-3 mr-1" />
                              {actionLoading === String(policy.id)
                                ? "Revoking…"
                                : "Revoke Verification"}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No policies found.</p>
            )}
          </CardContent>
        </Card>

        {/* Events Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Events Timeline</CardTitle>
            <CardDescription>Insurance-related events for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            {events && events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Provider</th>
                      <th className="text-left py-2 px-3 font-medium">Timestamp</th>
                      <th className="text-left py-2 px-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {event.type as string}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{event.provider as string}</td>
                        <td className="py-2 px-3">
                          {event.timestamp
                            ? new Date(event.timestamp as string).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {typeof event.details === "string"
                            ? event.details
                            : JSON.stringify(event.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
