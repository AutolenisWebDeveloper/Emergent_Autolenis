import type React from "react"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth-server"
import { requireEmailVerification } from "@/lib/auth-utils"
import { BuyerLayoutClient, type NavSection } from "./layout-client"
import type { PortalLink } from "@/components/portal-switcher"
import ChatWidget from "@/components/ai/chat-widget"

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await getSessionUser()
  } catch (error) {
    console.error("[BuyerLayout] Session resolution failed:", error)
    redirect("/auth/signin")
  }

  if (!user || user.role !== "BUYER") {
    redirect("/auth/signin")
  }

  // Check email verification
  await requireEmailVerification(user.userId, "BuyerLayout")

  // Cross-portal links for buyer-affiliates
  const portalLinks: PortalLink[] = []
  if (user.is_affiliate) {
    portalLinks.push({
      portal: "affiliate",
      href: "/affiliate/portal/dashboard",
      label: "Affiliate Portal",
      shortLabel: "Affiliate",
    })
  }

  const nav: NavSection[] = [
    {
      items: [
        { href: "/buyer/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      ],
    },
    {
      label: "Qualification",
      items: [
        { href: "/buyer/prequal", label: "Pre-Qualification", icon: "CheckCircle2", exact: true },
        { href: "/buyer/prequal/manual-preapproval", label: "External Preapproval", icon: "Landmark" },
        { href: "/buyer/trade-in", label: "Trade-In", icon: "Car" },
      ],
    },
    {
      label: "Shopping",
      items: [
        { href: "/buyer/search", label: "Search Vehicles", icon: "Search" },
        { href: "/buyer/shortlist", label: "Shortlist", icon: "Heart" },
      ],
    },
    {
      label: "Requests & Offers",
      items: [
        { href: "/buyer/requests", label: "Vehicle Requests", icon: "ClipboardList" },
        { href: "/buyer/auction", label: "Auctions & Offers", icon: "Gavel" },
      ],
    },
    {
      label: "Deal",
      items: [
        {
          href: "/buyer/deal",
          label: "My Deal",
          icon: "FileText",
          subItems: [
            { href: "/buyer/deal/summary", label: "Summary", icon: "LayoutList" },
            { href: "/buyer/deal/financing", label: "Financing", icon: "Banknote" },
            { href: "/buyer/deal/fee", label: "Concierge Fee", icon: "Receipt" },
            { href: "/buyer/deal/insurance", label: "Insurance", icon: "ShieldCheck" },
            { href: "/buyer/deal/contract", label: "Contract Shield", icon: "Shield" },
            { href: "/buyer/deal/esign", label: "E-Sign", icon: "PenLine" },
            { href: "/buyer/deal/pickup", label: "Pickup & QR", icon: "QrCode" },
          ],
        },
      ],
    },
    {
      label: "Records",
      items: [
        { href: "/buyer/contracts", label: "Contracts", icon: "FolderOpen" },
        { href: "/buyer/documents", label: "Documents", icon: "FileStack" },
      ],
    },
    {
      label: "Growth",
      items: [
        { href: "/buyer/referrals", label: "Referrals & Earnings", icon: "Users2" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/buyer/settings", label: "Settings", icon: "Settings" },
      ],
    },
  ]

  return (
    <BuyerLayoutClient nav={nav} userEmail={user.email} portalLinks={portalLinks}>
      {children}
      <ChatWidget />
    </BuyerLayoutClient>
  )
}
