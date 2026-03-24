"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, FileText, Shield } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminInsurancePage() {
  const { data, isLoading } = useSWR("/api/admin/insurance", fetcher, {
    refreshInterval: 30000,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Insurance & Coverage</h1>
        <p className="text-muted-foreground">Manage insurance quotes and policies</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data?.quotesTotal || 0}</p>
                <p className="text-sm text-muted-foreground">Total Quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{data?.policiesTotal || 0}</p>
                <p className="text-sm text-muted-foreground">Active Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.policies?.filter((p: any) => p.type === "AUTOLENIS").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">AutoLenis Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading quotes...</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Carrier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monthly Premium</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.quotes?.length > 0 ? (
                    data.quotes.map((quote: any) => (
                      <tr key={quote.id} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{quote.buyerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{quote.carrier}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{quote.vehicle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(quote.monthlyPremium)}/mo
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {quote.expiresAt ? formatDate(quote.expiresAt) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No quotes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading policies...</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Carrier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Policy #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Coverage Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.policies?.length > 0 ? (
                    data.policies.map((policy: any) => (
                      <tr key={policy.id} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{policy.buyerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              policy.type === "AUTOLENIS" ? "bg-purple-100 text-purple-800" : "bg-muted text-gray-800"
                            }`}
                          >
                            {policy.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{policy.carrier}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{policy.policyNumber || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              policy.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-muted text-gray-800"
                            }`}
                          >
                            {policy.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {policy.effectiveDate && policy.expirationDate
                            ? `${formatDate(policy.effectiveDate)} - ${formatDate(policy.expirationDate)}`
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        No policies found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
