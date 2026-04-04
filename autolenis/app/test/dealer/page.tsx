"use client"

import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Building2, Gavel, Handshake, Package } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TestDealerPage() {
  const { data, error, isLoading } = useSWR("/api/dealer/dashboard", fetcher)

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-9 w-48 mb-2" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col items-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load test dealer dashboard</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Dealer Dashboard</h1>
        <p className="text-muted-foreground text-sm">Mock dealer data for TEST workspace</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gavel className="h-6 w-6 text-[#00D9FF]" />
              <div>
                <p className="text-xl font-bold">{data?.activeAuctions || 0}</p>
                <p className="text-xs text-muted-foreground">Active Auctions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Handshake className="h-6 w-6 text-[#0066FF]" />
              <div>
                <p className="text-xl font-bold">{data?.completedDeals || 0}</p>
                <p className="text-xs text-muted-foreground">Completed Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-[#7ED321]" />
              <div>
                <p className="text-xl font-bold">{data?.inventory || 0}</p>
                <p className="text-xs text-muted-foreground">Inventory Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-[#2D1B69]" />
              <div>
                <p className="text-xl font-bold">{data?.upcomingPickups || 0}</p>
                <p className="text-xs text-muted-foreground">Upcoming Pickups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
