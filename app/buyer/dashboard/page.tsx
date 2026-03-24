"use client"
import { useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  Car,
  CheckCircle2,
  Gavel,
  FileText,
  ArrowRight,
  TrendingUp,
  Users2,
  Clock,
  DollarSign,
  AlertCircle,
  Landmark,
  ClipboardList,
  ChevronRight,
  CircleDot,
  Circle,
  AlertTriangle,
  Crown,
  Star,
  Loader2,
} from "lucide-react"
import useSWR from "swr"
import { useUser } from "@/hooks/use-user"

// ── Type definitions ─────────────────────────────────────────────────────────

interface PreQualData {
  id?: string
  status?: string
  maxOtdAmountCents?: number
  maxMonthlyPaymentCents?: number
  daysUntilExpiry?: number | null
  isExpired: boolean
  creditTier?: string
}

interface DashboardStats {
  shortlistCount?: number
  activeAuctions?: number
  completedAuctions?: number
  totalOffers?: number
  pendingDeals?: number
  completedDeals?: number
  upcomingPickups?: number
  totalSavings?: number | null
  referralEarnings?: number
  pendingReferrals?: number
  contractPassed?: boolean
  pickupScheduled?: boolean
  activeSourcingCases?: number
  offersAvailable?: number
}

interface ActivityItem {
  type: string
  message: string
  time: string
}

interface DashboardProfile {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  package_tier?: string | null
  package_selected_at?: string | null
  package_upgraded_at?: string | null
}

interface DashboardData {
  profile?: DashboardProfile | null
  preQual?: PreQualData | null
  stats?: DashboardStats
  recentActivity?: ActivityItem[]
  billing?: {
    deposit_status?: string
    deposit_amount_cents?: number
    deposit_credit_treatment?: string
    premium_fee_total_cents?: number
    premium_fee_credit_from_deposit_cents?: number
    premium_fee_remaining_cents?: number
    premium_fee_status?: string
  } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<DashboardData> => {
  const res = await fetch(url)
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (json && (json.error || json.message)) || `Request failed`
    throw new Error(message)
  }
  if (json && json.success === false) {
    throw new Error(json.error || "Request failed")
  }
  return json as DashboardData
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

/** Format max buying power from preQual cents to dollars string */
function formatBuyingPower(preQual: PreQualData | null | undefined): string {
  if (!preQual || preQual.isExpired) return "—"
  const cents = preQual.maxOtdAmountCents ?? 0
  return `$${(cents / 100).toLocaleString()}`
}

// ── Journey step builder ─────────────────────────────────────────────────────

type JourneyStep = {
  key: string
  label: string
  description: string
  completed: boolean
  active: boolean
  href: string
}

function buildJourneySteps(data: DashboardData | undefined): JourneyStep[] {
  const preQual = data?.preQual
  const stats: DashboardStats = data?.stats ?? {}
  const qualified = !!preQual && !preQual.isExpired

  return [
    {
      key: "qualify",
      label: "Get Qualified",
      description: "Pre-qualification or external preapproval",
      completed: qualified,
      active: !qualified,
      href: "/buyer/prequal",
    },
    {
      key: "search",
      label: "Find a Vehicle",
      description: "Search or request your ideal car",
      completed: (stats.shortlistCount ?? 0) > 0,
      active: qualified && (stats.shortlistCount ?? 0) === 0,
      href: "/buyer/search",
    },
    {
      key: "offer",
      label: "Receive an Offer",
      description: "Auction or vehicle request offer",
      completed: (stats.totalOffers ?? 0) > 0 || (stats.completedAuctions ?? 0) > 0,
      active: qualified && (stats.shortlistCount ?? 0) > 0 && (stats.totalOffers ?? 0) === 0,
      href: "/buyer/auction",
    },
    {
      key: "deal",
      label: "Start Your Deal",
      description: "Review financing, insurance, and sign",
      completed: (stats.completedDeals ?? 0) > 0,
      active: (stats.totalOffers ?? 0) > 0 && (stats.pendingDeals ?? 0) > 0,
      href: "/buyer/deal",
    },
    {
      key: "pickup",
      label: "Pickup & Delivery",
      description: "QR code, handover, and completion",
      completed: stats.pickupScheduled ?? false,
      active: (stats.completedDeals ?? 0) > 0 && !(stats.pickupScheduled ?? false),
      href: "/buyer/deal/pickup",
    },
  ]
}

type NextActionResult = {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
} | null

function getNextAction(data: DashboardData | undefined): NextActionResult {
  const preQual = data?.preQual
  const stats: DashboardStats = data?.stats ?? {}
  const qualified = !!preQual && !preQual.isExpired

  if (!qualified) {
    return {
      title: "Get Pre-Qualified",
      description: "Complete a soft credit check or upload your bank pre-approval to unlock your buying journey.",
      href: "/buyer/prequal",
      icon: CheckCircle2,
    }
  }
  if ((stats.shortlistCount ?? 0) === 0) {
    return {
      title: "Search for a Vehicle",
      description: "Browse verified dealer inventory and shortlist vehicles you love.",
      href: "/buyer/search",
      icon: Car,
    }
  }
  if ((stats.activeAuctions ?? 0) === 0 && (stats.totalOffers ?? 0) === 0) {
    return {
      title: "Start an Auction or Submit a Request",
      description: "Let dealers compete for your business, or submit a vehicle request if coverage is limited in your area.",
      href: "/buyer/auction",
      icon: Gavel,
    }
  }
  if ((stats.pendingDeals ?? 0) > 0) {
    return {
      title: "Review Your Deal",
      description: "You have an active deal in progress. Continue your financing and signing workflow.",
      href: "/buyer/deal",
      icon: FileText,
    }
  }
  if (stats.pickupScheduled) {
    return {
      title: "View Pickup Details",
      description: "Your vehicle pickup is scheduled. Access your QR code and handover instructions.",
      href: "/buyer/deal/pickup",
      icon: Car,
    }
  }
  return null
}

// ── Loading State ────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {(["a", "b", "c", "d"] as const).map((k) => (
          <Skeleton key={k} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────
export default function BuyerDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>("/api/buyer/dashboard", fetcher, {
    refreshInterval: 30_000,
  })
  const { user: currentUser } = useUser()
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const profile = data?.profile
  const preQual = data?.preQual
  const stats: DashboardStats = data?.stats ?? {}
  const qualified = !!preQual && !preQual.isExpired

  const journeySteps = buildJourneySteps(data)
  const completedSteps = journeySteps.filter((s) => s.completed).length
  const nextAction = getNextAction(data)

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <DashboardSkeleton />
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Unable to load your dashboard</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            This may be a temporary issue. Refresh the page to try again.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6 sm:space-y-8">
        {/* ── Page Header ──────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}
            {profile?.firstName ? `, ${profile.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Your AutoLenis buyer command center
          </p>
        </div>

        {/* ── TEST MODE: Golden Deal Demo Card ─────────────────── */}
        {currentUser?.workspace_mode === "TEST" && (
          <Link href="/buyer/demo" aria-label="View Golden Deal Walkthrough demo">
            <Card className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white hover:from-amber-600 hover:to-yellow-500 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg border-0">
              <CardContent className="pt-5 pb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base sm:text-lg">Golden Deal Walkthrough</h3>
                    <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold backdrop-blur-sm">
                      Demo Mode
                    </Badge>
                  </div>
                  <p className="text-white/90 text-sm">
                    Explore all 20 stages of the deal lifecycle with one-click state transitions
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* ── Qualification Status Banner ───────────────────────── */}
        {!qualified && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                    Qualification required to proceed
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Complete a pre-qualification or upload a bank pre-approval to unlock the full buyer journey.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/buyer/prequal">
                  <Button size="sm" className="text-xs h-8">
                    Pre-Qualify
                  </Button>
                </Link>
                <Link href="/buyer/prequal/manual-preapproval">
                  <Button size="sm" variant="outline" className="text-xs h-8 border-amber-300 dark:border-amber-700">
                    Upload Preapproval
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Package & Billing Card ──────────────────────────── */}
        {profile?.package_tier && (
          <Card className={profile.package_tier === "PREMIUM" ? "border-purple-200 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/10" : ""}>
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${profile.package_tier === "PREMIUM" ? "bg-purple-100 dark:bg-purple-900/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                  {profile.package_tier === "PREMIUM" ? (
                    <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  ) : (
                    <Star className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {profile.package_tier === "PREMIUM" ? "Premium Concierge Plan" : "Standard / Free Plan"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data?.billing?.deposit_status === "PAID"
                      ? "Deposit paid ✓"
                      : "$99 deposit required to start auction"}
                    {profile.package_tier === "PREMIUM" && data?.billing && (
                      <> · Premium fee: ${((data.billing.premium_fee_remaining_cents ?? 0) / 100).toFixed(0)} remaining</>
                    )}
                  </p>
                </div>
              </div>
              {profile.package_tier === "STANDARD" && (
                <Button
                  size="sm"
                  className="text-xs h-8"
                  disabled={upgrading}
                  onClick={async () => {
                    setUpgrading(true)
                    setUpgradeError(null)
                    try {
                      const res = await fetch("/api/buyer/upgrade", { method: "POST", headers: csrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({}) })
                      if (res.ok) {
                        await mutate()
                      } else {
                        const body = await res.json().catch(() => null)
                        setUpgradeError(body?.error || "Upgrade failed. Please try again.")
                      }
                    } catch {
                      setUpgradeError("Unable to process upgrade. Please try again.")
                    } finally {
                      setUpgrading(false)
                    }
                  }}
                >
                  {upgrading ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Upgrading…</>
                  ) : (
                    "Upgrade to Premium"
                  )}
                </Button>
              )}
              {upgradeError && (
                <p className="text-xs text-destructive mt-1">{upgradeError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Journey Progress Card ─────────────────────────────── */}
        <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] text-white overflow-hidden border-0 shadow-lg">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="font-semibold text-base tracking-tight">Buyer Journey</h2>
                <p className="text-white/55 text-sm mt-0.5">
                  {completedSteps} of {journeySteps.length} milestones completed
                </p>
              </div>
              {qualified && (
                <Badge className="bg-[#7ED321]/20 text-[#7ED321] border border-[#7ED321]/30 text-xs font-medium w-fit">
                  Qualified — Buying Enabled
                </Badge>
              )}
            </div>

            {/* Progress track */}
            <div className="flex items-center gap-0 mb-5">
              {journeySteps.map((step, idx) => (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={[
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300",
                        step.completed
                          ? "bg-[#7ED321] shadow-[0_0_10px_rgba(126,211,33,0.35)]"
                          : step.active
                            ? "bg-white/15 border-2 border-white/70 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                            : "bg-white/10 border border-white/15",
                      ].join(" ")}
                      aria-label={step.completed ? `${step.label}: completed` : step.active ? `${step.label}: current` : `${step.label}: upcoming`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" aria-hidden="true" />
                      ) : step.active ? (
                        <CircleDot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/90" aria-hidden="true" />
                      ) : (
                        <Circle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/25" aria-hidden="true" />
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-white/55 mt-1.5 text-center leading-tight line-clamp-2 max-w-[56px] sm:max-w-[72px]">
                      {step.label}
                    </span>
                  </div>
                  {idx < journeySteps.length - 1 && (
                    <div
                      className={[
                        "flex-1 h-px mx-1 sm:mx-2 mt-[-14px] transition-colors duration-300",
                        step.completed ? "bg-[#7ED321]/60" : "bg-white/10",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "buying-power",
              label: "Buying Power",
              value: formatBuyingPower(preQual),
              sub: preQual && !preQual.isExpired
                ? `${preQual.daysUntilExpiry ?? "?"} days remaining`
                : "Not qualified yet",
              icon: DollarSign,
              accent: "#7ED321",
            },
            {
              key: "shortlisted",
              label: "Shortlisted",
              value: stats.shortlistCount ?? 0,
              sub: "vehicles saved",
              icon: Car,
              accent: "#00D9FF",
            },
            {
              key: "active-auctions",
              label: "Active Auctions",
              value: stats.activeAuctions ?? 0,
              sub: `${stats.totalOffers ?? 0} total offers`,
              icon: Gavel,
              accent: "#0066FF",
            },
            {
              key: "active-deals",
              label: "Active Deals",
              value: (stats.pendingDeals ?? 0) + (stats.completedDeals ?? 0),
              sub: `${stats.completedDeals ?? 0} completed`,
              icon: FileText,
              accent: "var(--brand-purple)",
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.key} className="border-transparent shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${stat.accent}18` }}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: stat.accent }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight leading-none">
                        {stat.value}
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.label}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate hidden sm:block">{stat.sub}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Next Action + Sidebar Cards ───────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Next Action + Quick Links */}
          <div className="lg:col-span-2 space-y-4">
            {/* Next Best Action */}
            {nextAction && (
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <nextAction.icon className="h-5 w-5 text-primary" aria-hidden={true} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary/70 uppercase tracking-wider mb-1">
                        Next step
                      </p>
                      <h3 className="font-semibold text-base text-foreground leading-snug">{nextAction.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{nextAction.description}</p>
                      <Link href={nextAction.href} className="inline-flex items-center gap-1.5 mt-3">
                        <Button size="sm" className="h-8 text-xs gap-1.5">
                          Continue
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Navigation */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(() => {
                  const activeCount = stats.activeSourcingCases ?? 0
                  const offersCount = stats.offersAvailable ?? 0
                  const sourcingDesc = activeCount > 0
                    ? `${activeCount} active request${activeCount > 1 ? "s" : ""}${offersCount > 0 ? ` · ${offersCount} with offers` : ""}`
                    : "No local dealers? Submit a sourcing request"
                  const sourcingBadge = offersCount > 0 ? `${offersCount} offers` : activeCount > 0 ? "Active" : undefined
                  const sourcingBadgeVariant = offersCount > 0 ? ("default" as const) : ("secondary" as const)

                  return [
                  {
                    href: "/buyer/prequal",
                    icon: CheckCircle2,
                    accent: "#7ED321",
                    title: qualified ? "View Pre-Qualification" : "Get Pre-Qualified",
                    description: qualified
                      ? `Buying power: ${formatBuyingPower(preQual)}`
                      : "Soft check — no impact on your score",
                    badge: qualified ? "Active" : undefined,
                    badgeVariant: "default" as const,
                  },
                  {
                    href: "/buyer/prequal/manual-preapproval",
                    icon: Landmark,
                    accent: "#0066FF",
                    title: "External Preapproval",
                    description: "Already have a bank pre-approval? Submit it here",
                    badge: undefined,
                    badgeVariant: "secondary" as const,
                  },
                  {
                    href: "/buyer/search",
                    icon: Car,
                    accent: "#00D9FF",
                    title: "Search Vehicles",
                    description: "Browse verified dealer inventory",
                    badge: undefined,
                    badgeVariant: "secondary" as const,
                  },
                  {
                    href: "/buyer/requests",
                    icon: ClipboardList,
                    accent: "#F59E0B",
                    title: "Vehicle Requests",
                    description: sourcingDesc,
                    badge: sourcingBadge,
                    badgeVariant: sourcingBadgeVariant,
                  },
                  {
                    href: "/buyer/auction",
                    icon: Gavel,
                    accent: "#8B5CF6",
                    title: "Auctions & Offers",
                    description: "Let dealers compete for your business",
                    badge: (stats.activeAuctions ?? 0) > 0 ? `${stats.activeAuctions} active` : undefined,
                    badgeVariant: "outline" as const,
                  },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link key={action.href} href={action.href} className="block group">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all duration-150">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${action.accent}18` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: action.accent }} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{action.title}</h4>
                            {action.badge && (
                              <Badge variant={action.badgeVariant} className="text-[10px] px-1.5 py-0 h-4">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" aria-hidden="true" />
                      </div>
                    </Link>
                  )
                })
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Right: Savings + Referrals */}
          <div className="space-y-4">
            {/* Buying Power / Qualification */}
            <Card
              className={[
                "shadow-sm",
                qualified
                  ? "border-[#7ED321]/20 bg-gradient-to-br from-[#7ED321]/5 to-transparent"
                  : "border-muted",
              ].join(" ")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-[#7ED321]" aria-hidden="true" />
                  Buying Power
                </CardTitle>
              </CardHeader>
              <CardContent>
                {qualified ? (
                  <>
                    <p className="text-3xl font-bold tracking-tight text-[#7ED321] tabular-nums">
                      {formatBuyingPower(preQual)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Max out-the-door budget
                    </p>
                    {preQual && preQual.daysUntilExpiry != null && preQual.daysUntilExpiry <= 7 && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" aria-label="Warning" />
                        Expires in {preQual.daysUntilExpiry} day{preQual.daysUntilExpiry !== 1 ? "s" : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-sm text-muted-foreground">
                      Complete qualification to see your buying power.
                    </p>
                    <Link href="/buyer/prequal">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                        Start Pre-Qualification
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Savings */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  Your Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight tabular-nums text-[#00D9FF]">
                  ${(stats.totalSavings ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">Estimated savings through AutoLenis</p>
              </CardContent>
            </Card>

            {/* Referrals */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users2 className="h-4 w-4 text-[#0066FF]" aria-hidden="true" />
                  Referrals & Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(stats.referralEarnings ?? 0) > 0 ? (
                  <>
                    <p className="text-2xl font-bold tracking-tight tabular-nums text-[#0066FF]">
                      ${(stats.referralEarnings ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 mb-3">Earned through referrals</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">
                    Share your link and earn rewards for every qualified buyer.
                  </p>
                )}
                <Link href="/buyer/referrals">
                  <Button className="w-full bg-[#0066FF] hover:bg-[#0066FF]/90 h-8 text-xs gap-1.5">
                    Share Your Link
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Recent Activity ───────────────────────────────────── */}
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul role="list" className="space-y-2.5">
                {data.recentActivity.slice(0, 5).map((activity, idx) => (
                  <li
                    key={`activity-${idx}-${activity.type}`}
                    className="flex items-center gap-3 text-sm py-1.5 border-b border-border/40 last:border-0"
                  >
                    <span
                      className={[
                        "w-2 h-2 rounded-full flex-shrink-0",
                        activity.type === "auction"
                          ? "bg-[#0066FF]"
                          : activity.type === "offer"
                            ? "bg-[#7ED321]"
                            : "bg-muted-foreground/30",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-muted-foreground">{activity.message}</span>
                    <span className="text-muted-foreground/60 text-xs flex-shrink-0 tabular-nums">{activity.time}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
