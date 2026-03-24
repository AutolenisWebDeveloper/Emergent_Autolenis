"use client"
import { csrfHeaders } from "@/lib/csrf-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/hooks/use-user"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DollarSign,
  TrendingUp,
  Users,
  MousePointerClick,
  ArrowRight,
  ArrowUpRight,
  Gift,
  Copy,
  Check,
  Calculator,
  Wallet,
  Send,
  UserPlus,
  UsersRound,
  CreditCard,
  Clock,
  CheckCircle2,
  ImageIcon,
  FileText,
  LinkIcon,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const LEVEL_META = [
  { label: "Direct", rate: "15%", color: "#7ED321" },
  { label: "2nd Level", rate: "3%", color: "#00D9FF" },
  { label: "3rd Level", rate: "2%", color: "#0066FF" },
] as const

/* ────────────────────── Skeleton Loading ────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="pt-6 pb-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6"><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6"><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ────────────────────── Main Dashboard ────────────────────── */

export default function AffiliateDashboardPage() {
  const { data, isLoading, error } = useSWR("/api/affiliate/dashboard", fetcher, {
    refreshInterval: 30000,
  })
  const { user: currentUser } = useUser()
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [shareMessage, setShareMessage] = useState("")
  const [shareSending, setShareSending] = useState(false)
  const { toast } = useToast()

  const copyLink = () => {
    if (data?.affiliate?.referralLink) {
      navigator.clipboard.writeText(data.affiliate.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareSend = async () => {
    if (!recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid recipient email address.",
      })
      return
    }

    setShareSending(true)
    try {
      const response = await fetch("/api/affiliate/share-link", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ recipientEmail, message: shareMessage }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to send referral link")
      }

      toast({
        title: "Referral link sent",
        description: "Your referral email has been delivered.",
      })
      setRecipientEmail("")
      setShareMessage("")
      setShareOpen(false)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Send failed",
        description: err.message || "Unable to send referral email.",
      })
    } finally {
      setShareSending(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <TrendingUp className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Unable to load dashboard</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          We couldn&apos;t retrieve your dashboard data. Please refresh the page or try again later.
        </p>
      </div>
    )
  }

  const { affiliate, stats, earnings, referralLevels, referralsByLevel, clicksChart } = data

  // Derive dollar amounts from cents-based earnings for accurate display
  const pendingDollars = stats?.pendingCommissions ?? (earnings?.pendingCents ?? 0) / 100
  const paidDollars = stats?.paidCommissions ?? (earnings?.paidCents ?? 0) / 100
  const totalPaidOut = stats?.totalPaidOut ?? paidDollars
  const totalEarned = pendingDollars + paidDollars

  // Build referral level data from API response (3-level system)
  function buildLevelData(): Array<{ level: number; count: number; commissionRate: string }> {
    if (referralLevels && Array.isArray(referralLevels) && referralLevels.length > 0) {
      return referralLevels
    }
    if (referralsByLevel) {
      return Object.entries(referralsByLevel)
        .filter(([key]) => key.startsWith("level"))
        .map(([key, count]) => ({
          level: Number(key.replace("level", "")),
          count: (count as number) || 0,
          commissionRate: "",
        }))
    }
    return []
  }
  const levelData = buildLevelData()

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

  const kpiCards = [
    {
      title: "Total Clicks",
      value: (stats?.totalClicks ?? 0).toLocaleString(),
      sub: "Lifetime link clicks",
      icon: MousePointerClick,
      color: "#8B5CF6",
      bg: "from-[#8B5CF6]/8 to-[#8B5CF6]/3",
    },
    {
      title: "Sign-ups",
      value: String(stats?.totalReferrals ?? 0),
      sub: `${stats?.conversionRate ?? 0}% conversion rate`,
      icon: Users,
      color: "#7ED321",
      bg: "from-[#7ED321]/8 to-[#7ED321]/3",
    },
    {
      title: "Pending",
      value: formatCurrency(pendingDollars),
      sub: `${stats?.pendingCommissionCount || earnings?.pendingCount || 0} awaiting payout`,
      icon: TrendingUp,
      color: "#00D9FF",
      bg: "from-[#00D9FF]/8 to-[#00D9FF]/3",
    },
    {
      title: "Total Earned",
      value: formatCurrency(totalEarned),
      sub: `${formatCurrency(totalPaidOut)} paid out`,
      icon: DollarSign,
      color: "#7ED321",
      bg: "from-[#7ED321]/8 to-[#7ED321]/3",
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {affiliate?.firstName || "Affiliate"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track your referrals and earnings in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[#7ED321] hover:bg-[#6DB81E] text-white shadow-sm"
            onClick={() => setShareOpen(true)}
          >
            <Send className="h-3.5 w-3.5" />
            Share Link
          </Button>
        </div>
      </div>

      {/* ── Referral Link Bar ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-r from-[#7ED321]/[0.06] via-[#00D9FF]/[0.04] to-[#0066FF]/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7ED321]/10">
            <Gift className="h-4 w-4 text-[#7ED321]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Your Referral Link</p>
            <code className="block truncate text-sm font-mono text-foreground">
              {affiliate?.referralLink}
            </code>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 hidden sm:flex gap-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Share Link Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your referral link</DialogTitle>
            <DialogDescription>Send your referral link directly to a buyer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Recipient Email</label>
              <Input
                className="mt-1"
                type="email"
                placeholder="buyer@example.com"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                className="mt-1"
                placeholder="Add a personal note..."
                value={shareMessage}
                onChange={(event) => setShareMessage(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareSend} disabled={shareSending}>
              {shareSending ? "Sending..." : "Send Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Golden Deal Progress (TEST workspace only) ── */}
      {currentUser?.workspace_mode === "TEST" && (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-lg">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-base">Golden Deal Referral Progress</h3>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] font-semibold">
                Demo
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Referral Signed Up", done: true },
                { label: "Deal Started", done: true },
                { label: "Deal Completed", done: true },
                { label: "Payout Processed", done: (stats?.paidCommissions || 0) > 0 },
              ].map((step, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center transition-colors ${
                      step.done ? "bg-white/30" : "bg-white/10"
                    }`}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : <span className="text-xs font-medium">{i + 1}</span>}
                  </div>
                  <span className="text-[10px] leading-tight text-white/80 block">{step.label}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white rounded-full h-1.5 transition-all duration-500"
                style={{ width: (stats?.paidCommissions || 0) > 0 ? "100%" : "75%" }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card
              key={kpi.title}
              className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${kpi.bg}`}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.title}
                  </span>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: kpi.color + "14" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: kpi.color }} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Click Activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Click Activity</CardTitle>
                <CardDescription className="text-xs">Link clicks — last 30 days</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium">
                30 days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {clicksChart && clicksChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={clicksChart}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7ED321" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#7ED321" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    formatter={(val: number) => [`${val} clicks`, "Clicks"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#7ED321"
                    strokeWidth={2}
                    fill="url(#clickGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#7ED321", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center rounded-lg bg-muted/30 border border-dashed border-border">
                <MousePointerClick className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No click data yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Share your link to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrals by Level (3-level system) */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Referrals by Level</CardTitle>
                <CardDescription className="text-xs">Your 3-level network breakdown</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium">
                3 Levels
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-5">
              {(() => {
                const items = levelData.length > 0
                  ? levelData
                  : [1, 2, 3].map((l) => ({ level: l, count: 0, commissionRate: "" }))
                const maxCount = Math.max(...items.map((l) => l.count || 0), 1)

                return items.map((item) => {
                  const meta = LEVEL_META[item.level - 1]
                  if (!meta) return null
                  const count = item.count || 0
                  const rateLabel = item.commissionRate || meta.rate
                  const percentage = (count / maxCount) * 100

                  return (
                    <div key={item.level} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="text-sm font-medium">{meta.label}</span>
                          <span className="text-xs text-muted-foreground">({rateLabel})</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(percentage, count > 0 ? 4 : 0)}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total referrals</span>
              <span className="font-semibold tabular-nums">{stats?.totalReferrals ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Commission Structure ── */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Commission Structure</CardTitle>
              <CardDescription className="text-xs">
                Earn up to 20% total across your referral network
              </CardDescription>
            </div>
            <Badge className="bg-[#7ED321]/10 text-[#7ED321] border-[#7ED321]/20 hover:bg-[#7ED321]/10 text-xs">
              20% Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {LEVEL_META.map((tier) => (
              <div
                key={tier.label}
                className="relative rounded-xl border p-4 sm:p-5 text-center transition-shadow hover:shadow-md"
                style={{
                  borderColor: tier.color + "30",
                  background: `linear-gradient(135deg, ${tier.color}08 0%, ${tier.color}03 100%)`,
                }}
              >
                <div
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                  style={{ color: tier.color }}
                >
                  {tier.rate}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                  {tier.label}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Commission is calculated on the service fee per completed car purchase
          </p>
        </CardContent>
      </Card>

      {/* ── Growth Widgets ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Growth
          </h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/affiliate/portal/link",
              icon: LinkIcon,
              title: "Referral Link",
              value: stats?.totalClicks != null ? `${stats.totalClicks} clicks` : "—",
              sub: "Share & track performance",
              color: "#7ED321",
            },
            {
              href: "/affiliate/portal/referrals",
              icon: Users,
              title: "All Referrals",
              value: String(stats?.totalReferrals ?? 0),
              sub: `${stats?.conversionRate ?? 0}% conversion`,
              color: "#00D9FF",
            },
            {
              href: "/affiliate/portal/referrals/buyers",
              icon: UserPlus,
              title: "Referred Buyers",
              value: String(referralsByLevel?.level1 ?? stats?.totalReferrals ?? 0),
              sub: "Direct buyer referrals",
              color: "#7ED321",
            },
            {
              href: "/affiliate/portal/referrals/affiliates",
              icon: UsersRound,
              title: "Referred Affiliates",
              value: String((referralsByLevel?.level2 ?? 0) + (referralsByLevel?.level3 ?? 0)),
              sub: "Network growth partners",
              color: "#0066FF",
            },
            {
              href: "/affiliate/portal/analytics",
              icon: TrendingUp,
              title: "Analytics",
              value: stats?.totalClicks != null ? `${stats.totalClicks}` : "—",
              sub: "Detailed performance data",
              color: "#8B5CF6",
            },
            {
              href: "/affiliate/portal/income-calculator",
              icon: Calculator,
              title: "Income Calculator",
              value: "Plan",
              sub: "Estimate potential earnings",
              color: "#F59E0B",
            },
          ].map((widget) => {
            const Icon = widget.icon
            return (
              <Link key={widget.href} href={widget.href}>
                <Card className="group h-full border-border/50 transition-all hover:border-border hover:shadow-md cursor-pointer">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                        style={{ backgroundColor: widget.color + "12" }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: widget.color }} />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <div className="text-lg font-bold tracking-tight tabular-nums">{widget.value}</div>
                    <h4 className="font-semibold text-sm mt-0.5">{widget.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{widget.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Earnings Widgets ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Earnings
          </h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/affiliate/portal/commissions",
              icon: Clock,
              title: "Pending Commissions",
              value: formatCurrency(pendingDollars),
              sub: `${stats?.pendingCommissionCount || earnings?.pendingCount || 0} awaiting approval`,
              color: "#F59E0B",
            },
            {
              href: "/affiliate/portal/commissions",
              icon: CheckCircle2,
              title: "Approved Earnings",
              value: formatCurrency(totalEarned),
              sub: "Lifetime approved",
              color: "#7ED321",
            },
            {
              href: "/affiliate/portal/commissions",
              icon: DollarSign,
              title: "Paid Earnings",
              value: formatCurrency(totalPaidOut),
              sub: "Successfully paid out",
              color: "#00D9FF",
            },
            {
              href: "/affiliate/portal/payouts",
              icon: CreditCard,
              title: "Payout Settings",
              value: totalPaidOut > 0 ? "Active" : "Set Up",
              sub: "Manage payout method",
              color: "#0066FF",
            },
          ].map((widget) => {
            const Icon = widget.icon
            return (
              <Link key={widget.title} href={widget.href}>
                <Card className="group h-full border-border/50 transition-all hover:border-border hover:shadow-md cursor-pointer">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                        style={{ backgroundColor: widget.color + "12" }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: widget.color }} />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <div className="text-lg font-bold tracking-tight tabular-nums">{widget.value}</div>
                    <h4 className="font-semibold text-sm mt-0.5">{widget.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{widget.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Resources Widgets ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Resources
          </h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/affiliate/portal/assets",
              icon: ImageIcon,
              title: "Promo Assets",
              desc: "Banners, referral copy, campaign assets, and social content",
              color: "#8B5CF6",
            },
            {
              href: "/affiliate/portal/documents",
              icon: FileText,
              title: "Documents",
              desc: "Agreements, compliance docs, and brand guidelines",
              color: "#00D9FF",
            },
            {
              href: "/affiliate/portal/settings",
              icon: Wallet,
              title: "Account & Settings",
              desc: "Profile, payout preferences, and notification settings",
              color: "#0066FF",
            },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="group h-full border-border/50 transition-all hover:border-border hover:shadow-md cursor-pointer">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                        style={{ backgroundColor: action.color + "12" }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: action.color }} />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <h4 className="font-semibold text-sm">{action.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
