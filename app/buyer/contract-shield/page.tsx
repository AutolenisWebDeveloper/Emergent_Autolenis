"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ContractShieldPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/buyer/contract-shield", fetcher)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Contract Shield</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Unable to load contract reviews. Please try again.
              </p>
              <Button variant="outline" onClick={() => mutate()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !data?.flags || data.flags.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto h-10 w-10 mb-4 opacity-50" />
              <p>No contract reviews yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.flags.map((flag: any) => (
              <Card key={flag.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{flag.type}</span>
                    <Badge variant={flag.status === "resolved" ? "default" : "destructive"}>
                      {flag.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(flag.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
