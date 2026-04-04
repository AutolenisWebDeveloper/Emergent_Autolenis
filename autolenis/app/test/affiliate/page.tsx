"use client"

import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Users, MousePointerClick, DollarSign, TrendingUp } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TestAffiliatePage() {
  const { data, error, isLoading } = useSWR("/api/affiliate/dashboard", fetcher)

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
        <h2 className="text-xl font-semibold mb-2">Failed to load test affiliate dashboard</h2>
      </div>
    )
  }

  const stats = data?.stats || {}
  const earnings = data?.earnings || {}

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Affiliate Dashboard</h1>
        <p className="text-muted-foreground text-sm">Mock affiliate data for TEST workspace</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MousePointerClick className="h-6 w-6 text-[#0066FF]" />
              <div>
                <p className="text-xl font-bold">{stats.totalClicks || 0}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-[#7ED321]" />
              <div>
                <p className="text-xl font-bold">{stats.totalReferrals || 0}</p>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-xl font-bold">{stats.completedDeals || 0}</p>
                <p className="text-xs text-muted-foreground">Completed Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xl font-bold">
                  ${((earnings.lifetimeEarningsCents || 0) / 100).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Lifetime Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
