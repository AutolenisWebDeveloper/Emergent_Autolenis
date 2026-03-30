import type React from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getSessionUser } from "@/lib/auth-server"
import { requireEmailVerification } from "@/lib/auth-utils"
import { AdminLayoutClient } from "./layout-client"
import type { AdminNavSection } from "./layout-client"
import type { PortalLink } from "@/components/portal-switcher"
import ChatWidget from "@/components/ai/chat-widget"

const adminPublicRoutes = [
  "/admin/sign-in",
  "/admin/signup",
  "/admin/login",
  "/admin/mfa/enroll",
  "/admin/mfa/challenge",
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") || ""

  // Check if current route is public
  const isPublicRoute = adminPublicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))

  if (isPublicRoute) {
    return <>{children}</>
  }

  let user
  try {
    user = await getSessionUser()
  } catch (error) {
    console.error("[AdminLayout] Session resolution failed:", error)
    redirect("/admin/sign-in")
  }

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/admin/sign-in")
  }

  // Check email verification
  await requireEmailVerification(user.userId, "AdminLayout")

  const nav: AdminNavSection[] = [
    {
      items: [
        { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/admin/requests", label: "Requests", icon: "FileText" },
        { href: "/admin/auctions", label: "Auctions", icon: "Gavel" },
        { href: "/admin/offers", label: "Offers", icon: "Tag" },
        { href: "/admin/deals", label: "Deals", icon: "Handshake" },
        { href: "/admin/trade-ins", label: "Trade-Ins", icon: "Car" },
        { href: "/admin/sourcing", label: "Sourcing Cases", icon: "Target" },
        { href: "/admin/sourcing?view=exceptions", label: "Exceptions", icon: "AlertTriangle" },
        { href: "/admin/messages-monitoring", label: "Messages Monitoring", icon: "MessageSquare" },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/admin/buyers", label: "Buyers", icon: "Users" },
        { href: "/admin/dealers", label: "Dealers", icon: "Building2" },
        { href: "/admin/dealers?view=applications", label: "Dealer Applications", icon: "ClipboardList" },
        { href: "/admin/dealers?view=expansion", label: "Dealer Expansion Pipeline", icon: "GitBranch" },
        { href: "/admin/affiliates", label: "Affiliates", icon: "UserPlus" },
        { href: "/admin/users", label: "Internal Users", icon: "UserCog" },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/admin/payments", label: "Payments", icon: "DollarSign" },
        { href: "/admin/payments?view=fees", label: "Concierge Fees", icon: "Receipt" },
        { href: "/admin/refunds", label: "Refunds", icon: "RefreshCcw" },
        { href: "/admin/insurance", label: "Insurance", icon: "ShieldCheck" },
        { href: "/admin/payouts", label: "Affiliate Payouts", icon: "Wallet" },
        { href: "/admin/financial-reporting", label: "Reconciliation", icon: "BarChart3" },
      ],
    },
    {
      label: "Compliance",
      items: [
        { href: "/admin/preapprovals", label: "Native Preapprovals", icon: "CheckCircle" },
        { href: "/admin/external-preapprovals", label: "External Preapprovals", icon: "Landmark" },
        { href: "/admin/contracts", label: "Contract Shield", icon: "ShieldCheck" },
        { href: "/admin/contracts?view=contracts", label: "Contracts", icon: "FileSignature" },
        { href: "/admin/contract-shield/rules", label: "Shield Rules", icon: "Shield" },
        { href: "/admin/contract-shield/overrides", label: "Shield Overrides", icon: "ShieldAlert" },
        { href: "/admin/manual-reviews", label: "Manual Reviews", icon: "ClipboardCheck" },
        { href: "/admin/documents", label: "Documents", icon: "FileCheck" },
        { href: "/admin/audit-logs", label: "Audit Logs", icon: "ScrollText" },
        { href: "/admin/compliance", label: "Risk", icon: "FileWarning" },
      ],
    },
    {
      label: "Inventory Intelligence",
      items: [
        { href: "/admin/inventory", label: "Vehicle Search", icon: "Search" },
        { href: "/admin/dealer-intelligence", label: "Dealer Intelligence", icon: "Radar" },
        { href: "/admin/inventory/sources", label: "Inventory Sources", icon: "Database" },
        { href: "/admin/inventory/market", label: "Market Inventory", icon: "Globe" },
        { href: "/admin/inventory/verified", label: "Verified Inventory", icon: "ShieldCheck" },
        { href: "/admin/coverage-gaps", label: "Coverage Gaps", icon: "MapPin" },
        { href: "/admin/dealer-invites", label: "Dealer Invites", icon: "Send" },
        { href: "/admin/deal-protection", label: "Deal Protection", icon: "ShieldAlert" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { href: "/admin/reports", label: "Funnel Reporting", icon: "TrendingUp" },
        { href: "/admin/reports?view=coverage", label: "Coverage Analytics", icon: "Map" },
        { href: "/admin/reports?view=dealer-performance", label: "Dealer Performance", icon: "Award" },
        { href: "/admin/reports?view=sourcing", label: "Sourcing Analytics", icon: "Radar" },
        { href: "/admin/reports?view=affiliates", label: "Affiliate Analytics", icon: "PieChart" },
        { href: "/admin/ai", label: "AI Oversight", icon: "Bot" },
      ],
    },
    {
      label: "System",
      items: [
        { href: "/admin/settings", label: "Settings", icon: "Settings" },
        { href: "/admin/notifications", label: "Notifications", icon: "Bell" },
        { href: "/admin/support", label: "Support", icon: "HeadphonesIcon" },
        { href: "/admin/qa", label: "QA", icon: "TestTube" },
        { href: "/admin/settings?view=auth", label: "Auth", icon: "Lock" },
        { href: "/admin/settings/roles", label: "Roles", icon: "Shield" },
        { href: "/admin/settings/integrations", label: "Integrations", icon: "Plug" },
      ],
    },
  ]

  // Admin can navigate to all other portals for oversight
  const portalLinks: PortalLink[] = [
    {
      portal: "buyer",
      href: "/buyer/dashboard",
      label: "Buyer Portal",
      shortLabel: "Buyer",
    },
    {
      portal: "dealer",
      href: "/dealer/dashboard",
      label: "Dealer Portal",
      shortLabel: "Dealer",
    },
    {
      portal: "affiliate",
      href: "/affiliate/portal/dashboard",
      label: "Affiliate Portal",
      shortLabel: "Affiliate",
    },
  ]

  return (
    <AdminLayoutClient nav={nav} userEmail={user.email} userRole={user.role} portalLinks={portalLinks}>
      {children}
      <ChatWidget variant="admin" />
    </AdminLayoutClient>
  )
}
