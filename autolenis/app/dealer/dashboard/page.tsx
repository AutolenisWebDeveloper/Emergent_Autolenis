"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Calendar,
  CheckCircle,
  Package,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Activity,
  ShoppingCart,
  Gavel,
  MailOpen,
  Target,
  Handshake,
  FileCheck,
  MessageSquare,
  Truck,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/* ── Widget card (shared for all widget sections) ─────────────── */
interface WidgetCardProps {
  label: string
  value: number
  subtitle: string
  href: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

function WidgetCard({ label, value, subtitle, href, icon: Icon, iconBg, iconColor }: WidgetCardProps) {
  return (
    <Link href={href} className="group block">
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80 group-focus-visible:ring-2 group-focus-visible:ring-ring h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${iconBg}`}>
              <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">{subtitle}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DealerDashboardPage() {
  const { data, error, isLoading } = useSWR("/api/dealer/dashboard", fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Skeleton header */}
        <div className="animate-pulse">
          <div className="h-7 w-56 bg-muted/60 rounded-lg mb-3" />
          <div className="h-4 w-80 bg-muted/40 rounded-md" />
        </div>
        {/* Skeleton KPI rows */}
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <div className="animate-pulse h-3 w-32 bg-muted/40 rounded mb-3" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border/50 bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3.5 w-28 bg-muted/60 rounded" />
                    <div className="h-9 w-9 bg-muted/40 rounded-lg" />
                  </div>
                  <div className="h-8 w-20 bg-muted/60 rounded-md mb-2" />
                  <div className="h-3 w-24 bg-muted/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-destructive/10 p-4 mb-5">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Unable to load dashboard</h2>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
      </div>
    )
  }

  const stats = data

  /* ── Widget definitions by section ─────────────────────── */

  const opportunityWidgets: WidgetCardProps[] = [
    {
      label: "Open Buyer Requests",
      value: stats.openBuyerRequests ?? 0,
      subtitle: "Active requests",
      href: "/dealer/requests",
      icon: ShoppingCart,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Active Auctions",
      value: stats.activeAuctions ?? 0,
      subtitle: "Currently open",
      href: "/dealer/auctions",
      icon: Gavel,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Invited Opportunities",
      value: stats.invitedAuctions ?? 0,
      subtitle: "Awaiting your response",
      href: "/dealer/auctions/invited",
      icon: MailOpen,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      label: "Sourcing Opportunities",
      value: stats.sourcingOpportunities ?? 0,
      subtitle: "Match your coverage",
      href: "/dealer/opportunities",
      icon: Target,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600",
    },
  ]

  const offerDealWidgets: WidgetCardProps[] = [
    {
      label: "Offers Submitted",
      value: stats.offersSubmitted ?? 0,
      subtitle: "All pending offers",
      href: "/dealer/auctions/offers",
      icon: FileText,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Awaiting Buyer Response",
      value: stats.offersAwaitingResponse ?? 0,
      subtitle: "Buyer reviewing",
      href: "/dealer/auctions/offers",
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Deals in Progress",
      value: stats.dealsInProgress ?? 0,
      subtitle: "Active deals",
      href: "/dealer/deals",
      icon: Handshake,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Pickups Scheduled",
      value: stats.upcomingPickups ?? 0,
      subtitle: "Upcoming",
      href: "/dealer/pickups",
      icon: Truck,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
  ]

  const operationsWidgets: WidgetCardProps[] = [
    {
      label: "Documents Requiring Review",
      value: stats.documentsRequiringReview ?? 0,
      subtitle: "Need attention",
      href: "/dealer/documents",
      icon: FileCheck,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
    },
    {
      label: "Contracts Pending",
      value: stats.pendingContracts ?? 0,
      subtitle: "Need review",
      href: "/dealer/contracts",
      icon: FileText,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Fees Due",
      value: stats.feesDue ?? 0,
      subtitle: "Payment status",
      href: "/dealer/payments",
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "New Messages",
      value: stats.newMessages ?? 0,
      subtitle: "Unread threads",
      href: "/dealer/messages",
      icon: MessageSquare,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
  ]

  const dealsChange = stats.monthlyStats?.dealsChange ?? 0
  const isPositiveChange = dealsChange >= 0

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your dealership performance and operations
        </p>
      </div>

      {/* Golden Deal Progress (Mock Mode) */}
      {stats.goldenDeal && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 text-white shadow-lg shadow-amber-500/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Golden Deal: {stats.goldenDeal.dealId}</h3>
                  <span className="text-[10px] font-medium text-white/80">Demo Mode</span>
                </div>
              </div>
              <Link href={`/dealer/deals/${stats.goldenDeal.dealId}`}>
                <Button size="sm" variant="secondary" className="text-xs h-8 shadow-sm">
                  View Deal <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
            <p className="text-white/90 text-xs mb-3">
              {stats.goldenDeal.status} — {stats.goldenDeal.history?.length || 0} lifecycle events
            </p>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white rounded-full h-1.5 transition-all duration-500"
                style={{ width: stats.goldenDeal.status === "COMPLETED" ? "100%" : "50%" }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Opportunities ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Opportunities
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {opportunityWidgets.map((w) => (
            <WidgetCard key={w.href + w.label} {...w} />
          ))}
        </div>
      </section>

      {/* ── Offers & Deals ────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Offers &amp; Deals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offerDealWidgets.map((w) => (
            <WidgetCard key={w.href + w.label} {...w} />
          ))}
        </div>
      </section>

      {/* ── Operations ────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {operationsWidgets.map((w) => (
            <WidgetCard key={w.href + w.label} {...w} />
          ))}
        </div>
      </section>

      {/* ── Monthly Performance ───────────────────────────────── */}
      {stats.monthlyStats && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Monthly Performance</CardTitle>
                <CardDescription className="text-xs mt-0.5">Your sales summary this month</CardDescription>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                isPositiveChange ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositiveChange ? "+" : ""}{dealsChange.toFixed(0)}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/50 rounded-lg overflow-hidden">
              <div className="bg-card p-5 text-center">
                <div className="text-2xl font-bold tracking-tight tabular-nums">
                  ${(stats.monthlyStats.revenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Revenue</div>
              </div>
              <div className="bg-card p-5 text-center">
                <div className="text-2xl font-bold tracking-tight tabular-nums">
                  {stats.monthlyStats.thisMonthDeals}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Deals Closed</div>
              </div>
              <div className="bg-card p-5 text-center">
                <div className="text-2xl font-bold tracking-tight tabular-nums">
                  {stats.monthlyStats.lastMonthDeals ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Last Month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "View Auctions",
              description: "Check new invitations and submit offers",
              href: "/dealer/auctions",
              icon: Gavel,
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-600",
            },
            {
              title: "Manage Inventory",
              description: "Add, edit, or remove your vehicles",
              href: "/dealer/inventory",
              icon: Package,
              iconBg: "bg-blue-500/10",
              iconColor: "text-blue-600",
            },
            {
              title: "Upcoming Pickups",
              description: `${stats.upcomingPickups} pickup${stats.upcomingPickups !== 1 ? "s" : ""} scheduled`,
              href: "/dealer/pickups",
              icon: Truck,
              iconBg: "bg-violet-500/10",
              iconColor: "text-violet-600",
            },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href} className="group block">
                <Card className="transition-all duration-200 hover:shadow-md hover:border-border/80 h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${action.iconBg}`}>
                      <Icon className={`h-5 w-5 ${action.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm mb-0.5 flex items-center gap-1.5">
                        {action.title}
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Recent Activity ───────────────────────────────────── */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Link href="/dealer/deals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border/50">
              {stats.recentActivity.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                      activity.status === "COMPLETED"
                        ? "bg-emerald-500/10"
                        : activity.status === "PENDING"
                          ? "bg-amber-500/10"
                          : "bg-muted"
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${
                        activity.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : activity.status === "PENDING"
                            ? "bg-amber-500"
                            : "bg-muted-foreground/30"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {activity.inventoryItem?.year} {activity.inventoryItem?.make}{" "}
                        {activity.inventoryItem?.model}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {activity.buyer?.profile?.firstName} {activity.buyer?.profile?.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="text-sm font-semibold tabular-nums">
                      ${(activity.cashOtd || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
