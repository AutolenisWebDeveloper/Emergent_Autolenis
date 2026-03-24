"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Truck } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function DeliveryPage() {
  const { data, isLoading } = useSWR("/api/buyer/delivery", fetcher)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Delivery</h1>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data?.deliveries || data.deliveries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="mx-auto h-10 w-10 mb-4 opacity-50" />
              <p>No deliveries scheduled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.deliveries.map((delivery: any) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Delivery</span>
                    <Badge variant={delivery.status === "scheduled" ? "default" : "secondary"}>
                      {delivery.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Scheduled: {new Date(delivery.scheduledAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location: {delivery.location}
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
