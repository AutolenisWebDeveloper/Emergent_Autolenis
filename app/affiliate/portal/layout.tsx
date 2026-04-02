import type React from "react"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import { requireEmailVerification } from "@/lib/auth-utils"
import { AffiliateLayoutClient, type NavSection } from "./layout-client"
import type { PortalLink } from "@/components/portal-switcher"
import ChatWidget from "@/components/ai/chat-widget"

export default async function AffiliatePortalLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await getSessionUser()
  } catch (error) {
    console.error("[AffiliateLayout] Session resolution failed:", error)
    redirect("/affiliate?signin=required")
  }

  if (!user) {
    redirect("/affiliate?signin=required")
  }

  const isAffiliate =
    user.role === "AFFILIATE" || user.role === "AFFILIATE_ONLY" || (user.role === "BUYER" && user.is_affiliate === true)

  if (!isAffiliate) {
    redirect("/affiliate?signin=required")
  }

  // Check email verification
  await requireEmailVerification(user.userId, "AffiliateLayout")

  const isBuyerAffiliate = user.role === "BUYER" && user.is_affiliate === true

  // Cross-portal links for buyer-affiliates
  const portalLinks: PortalLink[] = []
  if (isBuyerAffiliate) {
    portalLinks.push({
      portal: "buyer",
      href: "/buyer/dashboard",
      label: "Buyer Dashboard",
      shortLabel: "Buyer",
    })
  }

  const nav: NavSection[] = [
    {
      items: [
        { href: "/affiliate/portal/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      ],
    },
    {
      label: "Growth",
      items: [
        { href: "/affiliate/portal/link", label: "My Referral Link", icon: "LinkIcon" },
        { href: "/affiliate/portal/analytics", label: "Analytics", icon: "TrendingUp" },
        { href: "/affiliate/portal/referrals", label: "All Referrals", icon: "Users", exact: true },
        { href: "/affiliate/portal/referrals/buyers", label: "Referred Buyers", icon: "UserPlus" },
        { href: "/affiliate/portal/referrals/affiliates", label: "Referred Affiliates", icon: "UsersRound" },
      ],
    },
    {
      label: "Earnings",
      items: [
        { href: "/affiliate/portal/commissions", label: "Commissions & Earnings", icon: "DollarSign" },
        { href: "/affiliate/portal/payouts", label: "Payout Settings", icon: "CreditCard" },
        { href: "/affiliate/portal/income-calculator", label: "Income Calculator", icon: "Calculator" },
      ],
    },
    {
      label: "Resources",
      items: [
        { href: "/affiliate/portal/assets", label: "Promo Assets", icon: "ImageIcon" },
        { href: "/affiliate/portal/documents", label: "Documents", icon: "FolderOpen" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/affiliate/portal/settings", label: "Account & Settings", icon: "Settings" },
      ],
    },
  ]

  return (
    <AffiliateLayoutClient nav={nav} userEmail={user.email} portalLinks={portalLinks}>
      {children}
      <ChatWidget variant="affiliate" />
    </AffiliateLayoutClient>
  )
}
