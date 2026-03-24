"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Car,
  CheckCircle,
  Clock,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  Gavel,
  Handshake,
  Info,
  Landmark,
  MapPin,
  Send,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDashboardPage() {
  const { data, error, isLoading } = useSWR("/api/admin/dashboard", fetcher, {
    refreshInterval: 30000,
  })
  const { user: currentUser } = useUser()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading platform metrics...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load dashboard data</p>
      </div>
    )
  }

  const { stats, funnel, topDealers, topAffiliates } = data || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      {/* Golden Deal Card (TEST workspace only) */}
      {currentUser?.workspace_mode === "TEST" && (
        <Link href="/admin/deals/deal_gold_001">
          <Card className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white hover:from-amber-600 hover:to-yellow-500 transition-colors cursor-pointer">
            <CardContent className="pt-6 pb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">Golden Deal: deal_gold_001</h3>
                  <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">Demo Mode</span>
                </div>
                <p className="text-white/90 text-sm">
                  View full lifecycle, billing, payments, and audit trail for the golden deal
                </p>
              </div>
              <ArrowRight className="h-6 w-6 flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ── Platform KPI Cards ───────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/buyers">
          <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Buyers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalBuyers || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{stats?.activeBuyers || 0}</span> active (30d)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/dealers">
          <Card className="border-l-4 border-l-brand-green hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Dealers</CardTitle>
              <Building2 className="h-4 w-4 text-brand-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.activeDealers || 0}</div>
              <p className="text-xs text-muted-foreground">of {stats?.totalDealers || 0} total dealers</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/auctions">
          <Card className="border-l-4 border-l-brand-cyan hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auctions (30d)</CardTitle>
              <Gavel className="h-4 w-4 text-brand-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.auctionsLast30Days || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{stats?.activeAuctions || 0}</span> currently active
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/deals?status=completed">
          <Card className="border-l-4 border-l-brand-blue hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deals Completed</CardTitle>
              <Handshake className="h-4 w-4 text-brand-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.completedDeals || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{stats?.dealsLast30Days || 0}</span> in last 30 days
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments?type=revenue">
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{formatCurrency(stats?.revenueLast30Days || 0)}</span> (30d)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments?type=deposit">
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.pendingDeposits || 0}</div>
              <p className="text-xs text-muted-foreground">Held deposits awaiting release</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/affiliates/payouts">
          <Card className="border-l-4 border-l-brand-purple hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Affiliate Payouts</CardTitle>
              <Users className="h-4 w-4 text-brand-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.totalAffiliatePayouts || 0)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">
                  {formatCurrency(stats?.affiliatePayoutsLast30Days || 0)}
                </span>{" "}
                (30d)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/sourcing">
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sourcing Queue</CardTitle>
              <ClipboardList className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{(stats?.sourcingPending || 0) + (stats?.sourcingActive || 0)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-600 font-medium">{stats?.sourcingPending || 0}</span> pending ·{" "}
                <span className="text-green-600 font-medium">{stats?.sourcingActive || 0}</span> active
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Operations Queue Summary ──────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Operations Queue</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/requests">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.pendingRequests || 0}</p>
                    <p className="text-xs text-muted-foreground">Requests Needing Action</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/deals?status=active">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                    <Handshake className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.activeDeals || stats?.dealsLast30Days || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/auctions?status=active">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center flex-shrink-0">
                    <Gavel className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.activeAuctions || 0}</p>
                    <p className="text-xs text-muted-foreground">Auctions in Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/trade-ins">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                    <Car className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.pendingTradeIns || 0}</p>
                    <p className="text-xs text-muted-foreground">Trade-Ins Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── External Preapproval Visibility ───────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-foreground">External Preapprovals</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/external-preapprovals?status=pending">
            <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.pendingExternalPreapprovals || 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/external-preapprovals?status=under_review">
            <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.underReviewPreapprovals || 0}</p>
                    <p className="text-xs text-muted-foreground">Under Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/external-preapprovals?status=needs_info">
            <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center flex-shrink-0">
                    <Info className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.needsInfoPreapprovals || 0}</p>
                    <p className="text-xs text-muted-foreground">Needs More Info</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/external-preapprovals?status=approved">
            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.approvedTodayPreapprovals || 0}</p>
                    <p className="text-xs text-muted-foreground">Approved Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Sourcing / No-Network Visibility ──────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-foreground">Sourcing & Dealer Expansion</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Link href="/admin/sourcing?status=new">
            <Card className="border-l-4 border-l-teal-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center flex-shrink-0">
                    <Target className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.newSourcingCases || stats?.sourcingPending || 0}</p>
                    <p className="text-xs text-muted-foreground">New Cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/sourcing?status=active">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.activeSourcingCases || stats?.sourcingActive || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/sourcing?view=offers-ready">
            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.sourcingOffersReady || 0}</p>
                    <p className="text-xs text-muted-foreground">Offers Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/dealers?view=expansion">
            <Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center flex-shrink-0">
                    <Send className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.dealerInvitesPending || 0}</p>
                    <p className="text-xs text-muted-foreground">Dealer Invites Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reports?view=coverage">
            <Card className="border-l-4 border-l-rose-500 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground">{stats?.noCoverageHotMarkets || 0}</p>
                    <p className="text-xs text-muted-foreground">No-Coverage Hot Markets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Funnel & Charts ──────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Signups", value: funnel?.signups || 0, color: "bg-primary", href: "/admin/buyers?status=signed_up" },
                { label: "Pre-Qualified", value: funnel?.preQuals || 0, color: "bg-brand-green", href: "/admin/requests?status=prequalified" },
                { label: "Shortlists Created", value: funnel?.shortlists || 0, color: "bg-brand-cyan", href: "/admin/requests?status=shortlisted" },
                { label: "Auctions Started", value: funnel?.auctions || 0, color: "bg-brand-blue", href: "/admin/auctions?status=active" },
                { label: "Deals Selected", value: funnel?.dealsSelected || 0, color: "bg-brand-purple", href: "/admin/deals?status=selected" },
                { label: "Fees Paid", value: funnel?.feesPaid || 0, color: "bg-green-500", href: "/admin/payments?status=paid" },
                { label: "Completed", value: funnel?.completed || 0, color: "bg-green-600", href: "/admin/deals?status=completed" },
              ].map((step, i) => (
                <Link key={i} href={step.href} className="flex items-center gap-4 hover:bg-accent rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                  <div className="w-32 text-sm text-muted-foreground">{step.label}</div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${step.color} rounded-full transition-all`}
                      style={{
                        width: `${funnel?.signups ? (step.value / funnel.signups) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="w-16 text-sm font-medium text-foreground text-right">{step.value}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/dealers?status=pending"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <p className="font-medium text-sm text-foreground">Review Dealers</p>
                <p className="text-xs text-muted-foreground">Pending verification</p>
              </Link>
              <Link
                href="/admin/contracts?status=FAIL"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
                <p className="font-medium text-sm text-foreground">Contract Issues</p>
                <p className="text-xs text-muted-foreground">Failed scans</p>
              </Link>
              <Link href="/admin/external-preapprovals?status=pending" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <Landmark className="h-5 w-5 text-indigo-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Review Preapprovals</p>
                <p className="text-xs text-muted-foreground">External submissions</p>
              </Link>
              <Link href="/admin/sourcing" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <Target className="h-5 w-5 text-teal-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Sourcing Queue</p>
                <p className="text-xs text-muted-foreground">Active cases</p>
              </Link>
              <Link href="/admin/refunds" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Process Refunds</p>
                <p className="text-xs text-muted-foreground">Pending requests</p>
              </Link>
              <Link href="/admin/compliance" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <Users className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Compliance Logs</p>
                <p className="text-xs text-muted-foreground">Recent events</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Dealers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top Dealers</CardTitle>
            <Link href="/admin/dealers" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDealers?.length > 0 ? (
                topDealers.map((dealer: any, i: number) => (
                  <Link key={dealer.id} href={`/admin/dealers/${dealer.id}`} className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{dealer.name}</p>
                        <p className="text-xs text-muted-foreground">{dealer.wonDeals} deals won</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{dealer.winRate}%</p>
                      <p className="text-xs text-muted-foreground">win rate</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No dealer data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Affiliates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top Affiliates</CardTitle>
            <Link href="/admin/affiliates" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAffiliates?.length > 0 ? (
                topAffiliates.map((affiliate: any, i: number) => (
                  <Link key={affiliate.id} href={`/admin/affiliates/${affiliate.id}`} className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-sm font-medium">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{affiliate.name}</p>
                        <p className="text-xs text-muted-foreground">{affiliate.totalReferrals} referrals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{formatCurrency(affiliate.totalEarnings)}</p>
                      <p className="text-xs text-muted-foreground">total earned</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No affiliate data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/dealers?status=pending"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <p className="font-medium text-sm text-foreground">Review Dealers</p>
                <p className="text-xs text-muted-foreground">Pending verification</p>
              </Link>
              <Link
                href="/admin/contracts?status=FAIL"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-destructive mb-2" />
                <p className="font-medium text-sm text-foreground">Contract Issues</p>
                <p className="text-xs text-muted-foreground">Failed scans</p>
              </Link>
              <Link href="/admin/payments" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Process Refunds</p>
                <p className="text-xs text-muted-foreground">Pending requests</p>
              </Link>
              <Link href="/admin/compliance" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <Users className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Compliance Logs</p>
                <p className="text-xs text-muted-foreground">Recent events</p>
              </Link>
              <Link href="/admin/sourcing" className="p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                <ClipboardList className="h-5 w-5 text-amber-500 mb-2" />
                <p className="font-medium text-sm text-foreground">Sourcing Queue</p>
                <p className="text-xs text-muted-foreground">No-network cases</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
