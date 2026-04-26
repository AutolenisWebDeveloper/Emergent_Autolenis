"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ScorecardData {
  winRate: number
  auctionResponseRate: number
  junkFeeRatio: number
  dealCompletionRate: number
  trend90d: {
    winRate: number
    offersSubmitted: number
    dealsWon: number
  }
  raw: {
    totalOffers: number
    wonDeals: number
    totalInvitations: number
    totalScans: number
    junkFlaggedScans: number
    completedDeals: number
  }
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: {
  title: string
  value: string
  description: string
  icon: React.ElementType
  variant?: "default" | "warning" | "success"
}) {
  const colors = {
    default: "text-blue-600",
    warning: "text-amber-600",
    success: "text-emerald-600",
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function DealerScorecardPage() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: ScorecardData }>(
    "/api/dealer/scorecard",
    fetcher,
    { refreshInterval: 60000 },
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Dealer Scorecard</h1>
        <p className="text-muted-foreground">Loading metrics…</p>
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Dealer Scorecard</h1>
        <p className="text-destructive">Failed to load scorecard data.</p>
      </div>
    )
  }

  const s = data.data

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dealer Scorecard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your performance metrics across all auctions and deals.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Win Rate"
          value={`${s.winRate}%`}
          description={`${s.raw.wonDeals} won of ${s.raw.totalOffers} offers`}
          icon={Trophy}
          variant={s.winRate >= 30 ? "success" : "default"}
        />
        <MetricCard
          title="Auction Response Rate"
          value={`${s.auctionResponseRate}%`}
          description={`${s.raw.totalOffers} responded of ${s.raw.totalInvitations} invited`}
          icon={Target}
          variant={s.auctionResponseRate >= 70 ? "success" : "warning"}
        />
        <MetricCard
          title="Junk Fee Ratio"
          value={`${s.junkFeeRatio}%`}
          description={`${s.raw.junkFlaggedScans} flagged of ${s.raw.totalScans} scans`}
          icon={AlertTriangle}
          variant={s.junkFeeRatio > 20 ? "warning" : "success"}
        />
        <MetricCard
          title="Deal Completion Rate"
          value={`${s.dealCompletionRate}%`}
          description={`${s.raw.completedDeals} completed of ${s.raw.wonDeals} deals`}
          icon={CheckCircle}
          variant={s.dealCompletionRate >= 80 ? "success" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            90-Day Trend
          </CardTitle>
          <CardDescription>Activity over the last 90 days</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Win Rate (90d)</span>
            <Badge variant="outline">{s.trend90d.winRate}%</Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Offers Submitted (90d)</span>
            <Badge variant="outline">{s.trend90d.offersSubmitted}</Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Deals Won (90d)</span>
            <Badge variant="outline">{s.trend90d.dealsWon}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
