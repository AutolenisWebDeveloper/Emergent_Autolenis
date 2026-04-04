"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DepositPage() {
  const { data, isLoading } = useSWR("/api/buyer/deposit", fetcher)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Deposit</h1>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data?.deposits || data.deposits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Wallet className="mx-auto h-10 w-10 mb-4 opacity-50" />
              <p>No deposits yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.deposits.map((deposit: any) => (
              <Card key={deposit.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>${(deposit.amountCents / 100).toLocaleString()}</span>
                    <Badge variant={deposit.status === "held" ? "default" : "secondary"}>
                      {deposit.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(deposit.createdAt).toLocaleDateString()}
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
