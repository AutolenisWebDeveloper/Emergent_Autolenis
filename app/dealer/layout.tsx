import type React from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import { requireEmailVerification } from "@/lib/auth-utils"
import { supabase } from "@/lib/db"
import { DealerLayoutClient, type NavSection } from "./layout-client"
import type { PortalLink } from "@/components/portal-switcher"
import ChatWidget from "@/components/ai/chat-widget"

const SET_PASSWORD_PATH = "/dealer/team/set-password"

export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await getSessionUser()
  } catch (error) {
    console.error("[DealerLayout] Session resolution failed:", error)
    redirect("/auth/signin")
  }

  if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
    redirect("/auth/signin")
  }

  // Check email verification
  await requireEmailVerification(user.userId, "DealerLayout")

  // Check forced password reset — skip the check when already on set-password
  const headerStore = await headers()
  const pathname = headerStore.get("x-pathname") ?? ""
  const isSettingPassword = pathname.startsWith(SET_PASSWORD_PATH)

  if (!isSettingPassword) {
    try {
      const { data: userRow } = await supabase
        .from("User")
        .select("force_password_reset")
        .eq("id", user.userId)
        .maybeSingle()

      if (userRow?.force_password_reset === true) {
        redirect(SET_PASSWORD_PATH)
      }
    } catch {
      // If the DB is unavailable (e.g. local dev without env), continue without redirect
    }
  }

  const nav: NavSection[] = [
    {
      items: [
        { href: "/dealer/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      ],
    },
    {
      label: "Opportunities",
      items: [
        { href: "/dealer/requests", label: "Buyer Requests", icon: "ShoppingCart" },
        { href: "/dealer/auctions", label: "Auctions", icon: "Gavel", exact: true },
        { href: "/dealer/auctions/invited", label: "Invited Auctions", icon: "MailOpen" },
        { href: "/dealer/opportunities", label: "Sourcing Opportunities", icon: "Target" },
      ],
    },
    {
      label: "Offer Management",
      items: [
        { href: "/dealer/auctions/offers", label: "Offers Submitted", icon: "FileText" },
        { href: "/dealer/deals", label: "My Deals", icon: "Handshake" },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/dealer/inventory", label: "Inventory", icon: "Package" },
        { href: "/dealer/contracts", label: "Contracts & Contract Shield", icon: "FileCheck" },
        { href: "/dealer/documents", label: "Documents", icon: "FolderOpen" },
        { href: "/dealer/payments", label: "Payments & Fees", icon: "DollarSign" },
        { href: "/dealer/messages", label: "Messages", icon: "MessageSquare" },
        { href: "/dealer/pickups", label: "Pickups", icon: "Truck" },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/dealer/scorecard", label: "Scorecard", icon: "BarChart2" },
        { href: "/dealer/analytics", label: "Analytics", icon: "BarChart3" },
        { href: "/dealer/financing", label: "Financing", icon: "CreditCard" },
        { href: "/dealer/notifications", label: "Notifications", icon: "Bell" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/dealer/settings", label: "Dealer Settings", icon: "Settings" },
      ],
    },
  ]

  // Dealer portal links — currently no cross-portal links for dealers
  const portalLinks: PortalLink[] = []

  return (
    <DealerLayoutClient nav={nav} userEmail={user.email} portalLinks={portalLinks}>
      {children}
      <ChatWidget variant="dealer" />
    </DealerLayoutClient>
  )
}
