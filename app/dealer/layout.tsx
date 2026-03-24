import type React from "react"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import { requireEmailVerification } from "@/lib/auth-utils"
import { DealerLayoutClient, type NavSection } from "./layout-client"
import type { PortalLink } from "@/components/portal-switcher"
import ChatWidget from "@/components/ai/chat-widget"

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
      <ChatWidget />
    </DealerLayoutClient>
  )
}
