"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Landmark } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FundingPage() {
  const { data, isLoading } = useSWR("/api/buyer/funding", fetcher)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Funding</h1>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data?.fundings || data.fundings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="mx-auto h-10 w-10 mb-4 opacity-50" />
              <p>No funding information yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.fundings.map((funding: any) => (
              <Card key={funding.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{funding.lender}</span>
                    <Badge variant={funding.status === "funded" ? "default" : "secondary"}>
                      {funding.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    APR: {funding.apr}% · Term: {funding.termMonths} months
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monthly Payment: ${(funding.monthlyPaymentCents / 100).toLocaleString()}
                  </p>
                  {funding.fundedAt && (
                    <p className="text-sm text-muted-foreground">
                      Funded: {new Date(funding.fundedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
