# AutoLenis — Dealer Dashboard Fixes (Single Cohesive Patch Bundle)

This document contains **all Dealer Dashboard fixes** discussed, packaged as a **single copy/paste-ready patch bundle**, plus validation steps and an enforcement prompt for an implementation agent.

---

## A) Scope Covered (What this patch fixes)

### 1) Dealer Dashboard correctness (data integrity)
- **Fix incorrect offer counting**: `AuctionOffer.participantId` must be treated as **AuctionParticipant.id** (invite row), not `dealerId`.
- **Fix active auction counting**: count **OPEN** auctions where dealer has an invite.
- **Fix awaiting bids**: open invited auctions where dealer **has no offer** yet.
- **Fix pending contracts**: `ContractDocument` has no actionable status; pending contract work must be derived from **ContractShieldScan.status IN (UPLOADED, SCANNING, ISSUES_FOUND)**.
- Normalize auth usage in dashboard API to `requireAuth([...])`.

### 2) Dealer navigation UX integrity
- Fix missing `iconMap` entries so the Dealer sidebar renders the correct icon for **every** menu item referenced by `app/dealer/layout.tsx`.

### 3) Dealer application status API correctness + authZ
- Fix wrong identifier usage (`user.id` vs `user.userId`) and enforce dealer roles via `requireAuth(["DEALER","DEALER_USER"])`.

### 4) Remove dead “Messages” menu item
- Replace the stub with a working **Dealer ↔ Admin Support Ticket system**:
  - Tables: `SupportTicket`, `SupportMessage` (+ enums)
  - APIs: list/create ticket; read/post messages in a thread
  - Pages: messages list, new ticket, thread view
  - Dealer-only authorization; dealer can only see their own tickets.

### 5) Playwright coverage (dealer smoke)
- Expand route coverage to include the newly functional Messages pages.

---

## B) Patch Bundle (copy/paste-ready)

**Instructions:** For each file below, replace it exactly with the `+++ AFTER` content. New files should be created with the given content.

> Format:
> - FILE: path
> - --- BEFORE
> - +++ AFTER
> - (full updated code)

---

### • FILE: `app/dealer/layout-client.tsx`

--- BEFORE
```tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Building2, Calendar, FileText, LayoutDashboard, Package, Settings, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SessionStatusBanner } from "@/components/auth/session-status-banner"
import { AuthDebugDrawer } from "@/components/auth/auth-debug-drawer"

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Package,
  Building2,
  FileText,
  Calendar,
  Settings,
}

interface NavItem {
  href: string
  label: string
  icon: string
  indent?: boolean
}

export function DealerLayoutClient({
  children,
  nav,
  userEmail,
}: {
  children: React.ReactNode
  nav: NavItem[]
  userEmail: string
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  const isActive = (href: string) => {
    if (href === "/dealer/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-portal-header/20 bg-portal-header text-portal-header-foreground shadow-sm" role="banner">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              <Link href="/dealer/dashboard" className="flex items-center gap-2 sm:gap-3 focus-ring rounded-lg">
                <Image
                  src="/images/auto-20lenis.png"
                  alt=""
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  priority
                />
                <span className="text-lg sm:text-xl font-bold tracking-tight hidden sm:inline">Dealer Portal</span>
                <span className="text-lg font-bold sm:hidden">Dealer</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span
                className="text-xs sm:text-sm text-portal-header-foreground/70 hidden md:inline truncate max-w-[150px] lg:max-w-[200px]"
                aria-label={`Logged in as ${userEmail}`}
              >
                {userEmail}
              </span>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/signout", { method: "POST", credentials: "include" })
                  } finally {
                    window.location.href = "/auth/signin"
                  }
                }}
                className="flex items-center gap-2 text-sm text-portal-header-foreground/80 hover:text-portal-header-foreground p-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Log out of your account"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 bottom-0 w-full max-w-xs sm:max-w-sm bg-card shadow-2xl overflow-y-auto safe-bottom">
            <div className="sticky top-0 p-4 border-b border-border flex items-center justify-between bg-portal-header text-portal-header-foreground">
              <span className="font-semibold tracking-tight">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="p-3 sm:p-4 space-y-0.5" aria-label="Main navigation">
              {nav.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors touch-target focus-ring",
                      item.indent ? "ml-4" : "",
                      active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0" role="navigation" aria-label="Main navigation">
            <nav className="space-y-0.5 sticky top-24">
              {nav.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm focus-ring group",
                      item.indent ? "ml-4" : "",
                      active ? "bg-primary/10 text-primary font-medium shadow-sm" : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          <main id="main-content" className="flex-1 min-w-0" role="main">
            <SessionStatusBanner portal="dealer" />
            {children}
          </main>
        </div>
      </div>
      
      {/* Developer Debug Drawer */}
      <AuthDebugDrawer portal="dealer" />
    </div>
  )
}
```

+++ AFTER
```tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  Handshake,
  Target,
  FileCheck,
  DollarSign,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SessionStatusBanner } from "@/components/auth/session-status-banner"
import { AuthDebugDrawer } from "@/components/auth/auth-debug-drawer"

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Package,
  Building2,
  FileText,
  Calendar,
  Settings,
  ShoppingCart,
  Handshake,
  Target,
  FileCheck,
  DollarSign,
  MessageSquare,
}

interface NavItem {
  href: string
  label: string
  icon: string
  indent?: boolean
}

export function DealerLayoutClient({
  children,
  nav,
  userEmail,
}: {
  children: React.ReactNode
  nav: NavItem[]
  userEmail: string
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  const isActive = (href: string) => {
    if (href === "/dealer/dashboard") return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-50 border-b border-portal-header/20 bg-portal-header text-portal-header-foreground shadow-sm"
        role="banner"
      >
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              <Link href="/dealer/dashboard" className="flex items-center gap-2 sm:gap-3 focus-ring rounded-lg">
                <Image
                  src="/images/auto-20lenis.png"
                  alt="AutoLenis"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  priority
                />
                <span className="text-lg sm:text-xl font-bold tracking-tight hidden sm:inline">Dealer Portal</span>
                <span className="text-lg font-bold sm:hidden">Dealer</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span
                className="text-xs sm:text-sm text-portal-header-foreground/70 hidden md:inline truncate max-w-[150px] lg:max-w-[200px]"
                aria-label={`Logged in as ${userEmail}`}
              >
                {userEmail}
              </span>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/signout", { method: "POST", credentials: "include" })
                  } finally {
                    window.location.href = "/auth/signin"
                  }
                }}
                className="flex items-center gap-2 text-sm text-portal-header-foreground/80 hover:text-portal-header-foreground p-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Log out of your account"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div className="fixed left-0 top-0 bottom-0 w-full max-w-xs sm:max-w-sm bg-card shadow-2xl overflow-y-auto safe-bottom">
            <div className="sticky top-0 p-4 border-b border-border flex items-center justify-between bg-portal-header text-portal-header-foreground">
              <span className="font-semibold tracking-tight">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="p-3 sm:p-4 space-y-0.5" aria-label="Main navigation">
              {nav.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors touch-target focus-ring",
                      item.indent ? "ml-4" : "",
                      active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          <aside className="hidden lg:block w-60 flex-shrink-0" role="navigation" aria-label="Main navigation">
            <nav className="space-y-0.5 sticky top-24">
              {nav.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm focus-ring group",
                      item.indent ? "ml-4" : "",
                      active ? "bg-primary/10 text-primary font-medium shadow-sm" : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>

          <main id="main-content" className="flex-1 min-w-0" role="main">
            <SessionStatusBanner portal="dealer" />
            {children}
          </main>
        </div>
      </div>

      <AuthDebugDrawer portal="dealer" />
    </div>
  )
}
```

---

### • FILE: `app/api/dealer/dashboard/route.ts`

--- BEFORE
```ts
import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

function getDefaultDashboardData() {
  return {
    success: true,
    activeAuctions: 0,
    awaitingBids: 0,
    pendingOffers: 0,
    completedDeals: 0,
    totalSales: 0,
    inventory: 0,
    pendingContracts: 0,
    upcomingPickups: 0,
    recentActivity: [],
    monthlyStats: {
      thisMonthDeals: 0,
      lastMonthDeals: 0,
      dealsChange: 0,
      revenue: 0,
    },
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.dealerDashboard())
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 })
    }

    const userId = user.userId
    if (!userId) {
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 })
    }

    // Get dealer from user via DealerUser table
    const { data: dealerUser, error: dealerUserError } = await supabase
      .from("DealerUser")
      .select("dealerId, Dealer:dealerId(*)")
      .eq("userId", userId)
      .maybeSingle()

    if (dealerUserError) {
      console.error("[Dealer Dashboard] DealerUser error:", dealerUserError)
      return NextResponse.json(getDefaultDashboardData())
    }

    if (!dealerUser || !dealerUser.dealerId) {
      // Try to find dealer directly by userId (for legacy data)
      const { data: directDealer } = await supabase.from("Dealer").select("*").eq("userId", userId).maybeSingle()

      if (!directDealer) {
        return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
      }

      // Use direct dealer
      const stats = await getDealerDashboardStats(directDealer.id)
      return NextResponse.json({ success: true, ...stats })
    }

    const dealerId = dealerUser.dealerId
    const stats = await getDealerDashboardStats(dealerId)

    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    console.error("[Dealer Dashboard] Error:", error)
    return NextResponse.json({ error: "Failed to get dashboard" }, { status: 500 })
  }
}

async function getDealerDashboardStats(dealerId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  try {
    const [
      activeAuctionsResult,
      pendingOffersResult,
      completedDealsResult,
      totalSalesResult,
      inventoryResult,
      pendingContractsResult,
      upcomingPickupsResult,
      recentDealsResult,
      thisMonthDealsResult,
      lastMonthDealsResult,
      thisMonthRevenueResult,
    ] = await Promise.all([
      // Active auctions where dealer is invited
      supabase
        .from("AuctionParticipant")
        .select("id, auctionId")
        .eq("dealerId", dealerId),

      // Pending offers
      supabase
        .from("AuctionOffer")
        .select("id", { count: "exact", head: true })
        .eq("participantId", dealerId),

      // Completed deals
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED"),

      // Total sales (all deals regardless of status)
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId),

      // Inventory items
      supabase
        .from("InventoryItem")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId),

      // Pending contract revisions
      supabase
        .from("ContractDocument")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId),

      // Upcoming pickups
      supabase
        .from("PickupAppointment")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "SCHEDULED")
        .gte("scheduledDate", now.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("id, status, cashOtd, createdAt, buyerId, inventoryItemId")
        .eq("dealerId", dealerId)
        .order("createdAt", { ascending: false })
        .limit(10),

      // This month's deals
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),

      // Last month's deals
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", lastMonth.toISOString())
        .lte("createdAt", endOfLastMonth.toISOString()),

      // This month's revenue
      supabase
        .from("SelectedDeal")
        .select("cashOtd")
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),
    ])

    let activeAuctions = 0
    if (activeAuctionsResult.data && activeAuctionsResult.data.length > 0) {
      const auctionIds = activeAuctionsResult.data.map((ap) => ap.auctionId)
      const { data: openAuctions } = await supabase
        .from("Auction")
        .select("id", { count: "exact", head: true })
        .in("id", auctionIds)
        .eq("status", "OPEN")
      activeAuctions = openAuctions?.length || 0
    }

    // ...rest unchanged...
    return { /* ... */ }
  } catch (error) {
    // ...fallback...
    return { /* ... */ }
  }
}
```

+++ AFTER
```ts
import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

function getDefaultDashboardData() {
  return {
    success: true,
    activeAuctions: 0,
    awaitingBids: 0,
    pendingOffers: 0,
    completedDeals: 0,
    totalSales: 0,
    inventory: 0,
    pendingContracts: 0,
    upcomingPickups: 0,
    recentActivity: [],
    monthlyStats: {
      thisMonthDeals: 0,
      lastMonthDeals: 0,
      dealsChange: 0,
      revenue: 0,
    },
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.dealerDashboard())
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 })
    }

    const userId = user.userId
    if (!userId) {
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 })
    }

    const { data: dealerUser, error: dealerUserError } = await supabase
      .from("DealerUser")
      .select("dealerId")
      .eq("userId", userId)
      .maybeSingle()

    if (dealerUserError) {
      console.error("[Dealer Dashboard] DealerUser error:", dealerUserError)
      return NextResponse.json(getDefaultDashboardData())
    }

    if (!dealerUser?.dealerId) {
      const { data: directDealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
      if (!directDealer) return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
      const stats = await getDealerDashboardStats(directDealer.id)
      return NextResponse.json({ success: true, ...stats })
    }

    const stats = await getDealerDashboardStats(dealerUser.dealerId)
    return NextResponse.json({ success: true, ...stats })
  } catch (error: any) {
    console.error("[Dealer Dashboard] Error:", error)
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Failed to get dashboard" }, { status })
  }
}

async function getDealerDashboardStats(dealerId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  try {
    // 1) Determine invite scope (AuctionParticipant IDs + auctionIds)
    const invitesResult = await supabase
      .from("AuctionParticipant")
      .select("id, auctionId")
      .eq("dealerId", dealerId)

    const participantIds = (invitesResult.data || []).map((p: any) => p.id)
    const invitedAuctionIds = (invitesResult.data || []).map((p: any) => p.auctionId)

    // 2) Count OPEN invited auctions
    const openAuctionsResult =
      invitedAuctionIds.length > 0
        ? await supabase.from("Auction").select("id").in("id", invitedAuctionIds).eq("status", "OPEN")
        : { data: [] as any[] }

    const openAuctionIds = (openAuctionsResult.data || []).map((a: any) => a.id)
    const activeAuctions = openAuctionIds.length

    // 3) Offers must be counted by participantId IN (AuctionParticipant.id)
    const pendingOffersResult =
      participantIds.length > 0
        ? await supabase.from("AuctionOffer").select("id", { count: "exact", head: true }).in("participantId", participantIds)
        : ({ count: 0 } as any)

    // 4) Contracts pending: ContractShieldScan statuses (ContractDocument has no status)
    const pendingContractsResult = await supabase
      .from("ContractShieldScan")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .in("status", ["UPLOADED", "SCANNING", "ISSUES_FOUND"])

    const [
      completedDealsResult,
      totalSalesResult,
      inventoryResult,
      upcomingPickupsResult,
      recentDealsResult,
      thisMonthDealsResult,
      lastMonthDealsResult,
      thisMonthRevenueResult,
    ] = await Promise.all([
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED"),

      supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("dealerId", dealerId),

      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("dealerId", dealerId),

      supabase
        .from("PickupAppointment")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "SCHEDULED")
        .gte("scheduledDate", now.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("id, status, cashOtd, createdAt, buyerId, inventoryItemId")
        .eq("dealerId", dealerId)
        .order("createdAt", { ascending: false })
        .limit(10),

      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", lastMonth.toISOString())
        .lte("createdAt", endOfLastMonth.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("cashOtd")
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),
    ])

    // awaitingBids = open invites where the dealer has not submitted an offer
    let awaitingBids = 0
    if (openAuctionIds.length > 0 && participantIds.length > 0) {
      const openParticipantIds = (invitesResult.data || [])
        .filter((p: any) => openAuctionIds.includes(p.auctionId))
        .map((p: any) => p.id)

      if (openParticipantIds.length > 0) {
        const { data: openOffers } = await supabase
          .from("AuctionOffer")
          .select("participantId")
          .in("participantId", openParticipantIds)

        const offered = new Set((openOffers || []).map((o: any) => o.participantId))
        awaitingBids = openParticipantIds.filter((id: string) => !offered.has(id)).length
      }
    }

    // recent activity hydration
    let recentActivity: any[] = []
    if (recentDealsResult.data && recentDealsResult.data.length > 0) {
      const deals = recentDealsResult.data
      const buyerIds = [...new Set(deals.map((d: any) => d.buyerId).filter(Boolean))]
      const inventoryIds = [...new Set(deals.map((d: any) => d.inventoryItemId).filter(Boolean))]

      const [buyersResult, invResult] = await Promise.all([
        buyerIds.length > 0 ? supabase.from("BuyerProfile").select("id, firstName, lastName").in("id", buyerIds) : { data: [] },
        inventoryIds.length > 0 ? supabase.from("InventoryItem").select("id, price, vehicleId").in("id", inventoryIds) : { data: [] },
      ])

      let vehiclesMap: Record<string, any> = {}
      if (invResult.data && invResult.data.length > 0) {
        const vehicleIds = [...new Set(invResult.data.map((i: any) => i.vehicleId).filter(Boolean))]
        if (vehicleIds.length > 0) {
          const { data: vehicles } = await supabase.from("Vehicle").select("id, make, model, year, vin").in("id", vehicleIds)
          vehiclesMap = (vehicles || []).reduce((acc: any, v: any) => ({ ...acc, [v.id]: v }), {})
        }
      }

      const buyersMap = (buyersResult.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: { firstName: b.firstName, lastName: b.lastName } }), {})
      const invMap = (invResult.data || []).reduce((acc: any, i: any) => ({ ...acc, [i.id]: { id: i.id, price: i.price, vehicle: vehiclesMap[i.vehicleId] || null } }), {})

      recentActivity = deals.map((deal: any) => ({
        id: deal.id,
        status: deal.status,
        cashOtd: deal.cashOtd,
        createdAt: deal.createdAt,
        buyer: buyersMap[deal.buyerId] || null,
        inventoryItem: deal.inventoryItemId ? invMap[deal.inventoryItemId] || null : null,
      }))
    }

    const pendingOffers = pendingOffersResult.count || 0
    const completedDeals = completedDealsResult.count || 0
    const totalSales = totalSalesResult.count || 0
    const inventory = inventoryResult.count || 0
    const pendingContracts = pendingContractsResult.count || 0
    const upcomingPickups = upcomingPickupsResult.count || 0

    const thisMonthDeals = thisMonthDealsResult.count || 0
    const lastMonthDeals = lastMonthDealsResult.count || 0
    const revenue = (thisMonthRevenueResult.data || []).reduce((sum: number, deal: any) => sum + (deal.cashOtd || 0), 0)
    const dealsChange = lastMonthDeals > 0 ? ((thisMonthDeals - lastMonthDeals) / lastMonthDeals) * 100 : 0

    return {
      activeAuctions,
      awaitingBids,
      pendingOffers,
      completedDeals,
      totalSales,
      inventory,
      pendingContracts,
      upcomingPickups,
      recentActivity,
      monthlyStats: {
        thisMonthDeals,
        lastMonthDeals,
        dealsChange,
        revenue,
      },
    }
  } catch (error) {
    console.error("[Dealer Dashboard] Stats error:", error)
    return {
      activeAuctions: 0,
      awaitingBids: 0,
      pendingOffers: 0,
      completedDeals: 0,
      totalSales: 0,
      inventory: 0,
      pendingContracts: 0,
      upcomingPickups: 0,
      recentActivity: [],
      monthlyStats: {
        thisMonthDeals: 0,
        lastMonthDeals: 0,
        dealsChange: 0,
        revenue: 0,
      },
    }
  }
}
```

---

### • FILE: `app/api/dealer/application-status/route.ts`

--- BEFORE
```ts
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await dealerApprovalService.getApplicationStatus(user.id)

    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    console.error("[ApplicationStatus] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

+++ AFTER
```ts
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

export async function GET() {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const status = await dealerApprovalService.getApplicationStatus(user.userId)
    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    console.error("[ApplicationStatus] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

### • FILE: `migrations/100-add-support-tickets.sql` (NEW)

--- BEFORE
```sql
-- (file did not exist)
```

+++ AFTER
```sql
-- Dealer Support Tickets (Dealer ↔ Admin)
-- Safe for Postgres/Supabase.

DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SupportSenderRole" AS ENUM ('DEALER','ADMIN','SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealerId" text NOT NULL REFERENCES "Dealer"("id") ON DELETE CASCADE,
  "workspaceId" text NULL REFERENCES "Workspace"("id") ON DELETE SET NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SupportTicket_dealerId_idx" ON "SupportTicket"("dealerId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_workspaceId_idx" ON "SupportTicket"("workspaceId");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" text NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
  "senderUserId" text NULL REFERENCES "User"("id") ON DELETE SET NULL,
  "senderRole" "SupportSenderRole" NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportMessage_senderRole_idx" ON "SupportMessage"("senderRole");

CREATE OR REPLACE FUNCTION support_ticket_touch_updated_at() RETURNS trigger AS $$
BEGIN
  UPDATE "SupportTicket" SET "updatedAt" = now() WHERE "id" = NEW."ticketId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_ticket_touch ON "SupportMessage";
CREATE TRIGGER trg_support_ticket_touch
AFTER INSERT ON "SupportMessage"
FOR EACH ROW
EXECUTE FUNCTION support_ticket_touch_updated_at();
```

---

### • FILE: `app/api/dealer/messages/route.ts` (NEW)

--- BEFORE
```ts
// (file did not exist)
```

+++ AFTER
```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"

export const dynamic = "force-dynamic"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

async function getDealerIdForUser(userId: string) {
  const { data: dealerUser } = await supabase.from("DealerUser").select("dealerId").eq("userId", userId).maybeSingle()
  if (dealerUser?.dealerId) return dealerUser.dealerId as string

  const { data: dealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
  return dealer?.id as string | undefined
}

export async function GET(_req: NextRequest) {
  const user = await requireAuth(["DEALER", "DEALER_USER"])

  if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: [] })
  if (!isDatabaseConfigured()) return jsonError("Service temporarily unavailable", 503)

  const dealerId = await getDealerIdForUser(user.userId)
  if (!dealerId) return jsonError("Dealer not found", 404)

  const { data: tickets, error } = await supabase
    .from("SupportTicket")
    .select("id, subject, status, updatedAt, createdAt")
    .eq("dealerId", dealerId)
    .order("updatedAt", { ascending: false })
    .limit(50)

  if (error) return jsonError("Failed to load messages", 500)

  const ticketIds = (tickets || []).map((t: any) => t.id)
  let lastMessages: Record<string, any> = {}

  if (ticketIds.length) {
    const { data: msgs } = await supabase
      .from("SupportMessage")
      .select("ticketId, body, createdAt")
      .in("ticketId", ticketIds)
      .order("createdAt", { ascending: false })

    for (const m of msgs || []) {
      if (!lastMessages[m.ticketId]) lastMessages[m.ticketId] = m
    }
  }

  const out = (tickets || []).map((t: any) => {
    const last = lastMessages[t.id]
    return {
      id: t.id,
      subject: t.subject,
      status: t.status,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
      lastMessage: last ? String(last.body).slice(0, 140) : "",
      lastMessageAt: last?.createdAt ?? t.updatedAt,
    }
  })

  return NextResponse.json({ success: true, data: out })
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(["DEALER", "DEALER_USER"])

  if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: { id: "test_ticket" } })
  if (!isDatabaseConfigured()) return jsonError("Service temporarily unavailable", 503)

  const body = await req.json().catch(() => null)
  const subject = body?.subject ? String(body.subject).trim() : ""
  const message = body?.message ? String(body.message).trim() : ""

  if (!subject || subject.length < 3) return jsonError("Subject is required")
  if (!message || message.length < 1) return jsonError("Message is required")

  const dealerId = await getDealerIdForUser(user.userId)
  if (!dealerId) return jsonError("Dealer not found", 404)

  const { data: ticket, error: ticketError } = await supabase
    .from("SupportTicket")
    .insert({ dealerId, subject, status: "OPEN" })
    .select("id")
    .single()

  if (ticketError) return jsonError("Failed to create ticket", 500)

  const { error: msgError } = await supabase.from("SupportMessage").insert({
    ticketId: ticket.id,
    senderUserId: user.userId,
    senderRole: "DEALER",
    body: message,
  })

  if (msgError) return jsonError("Failed to create message", 500)

  return NextResponse.json({ success: true, data: { id: ticket.id } }, { status: 201 })
}
```

---

### • FILE: `app/api/dealer/messages/[threadId]/route.ts` (NEW)

--- BEFORE
```ts
// (file did not exist)
```

+++ AFTER
```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"

export const dynamic = "force-dynamic"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

async function getDealerIdForUser(userId: string) {
  const { data: dealerUser } = await supabase.from("DealerUser").select("dealerId").eq("userId", userId).maybeSingle()
  if (dealerUser?.dealerId) return dealerUser.dealerId as string

  const { data: dealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
  return dealer?.id as string | undefined
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  const user = await requireAuth(["DEALER", "DEALER_USER"])
  const { threadId } = await ctx.params

  if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: { id: threadId, messages: [] } })
  if (!isDatabaseConfigured()) return jsonError("Service temporarily unavailable", 503)

  const dealerId = await getDealerIdForUser(user.userId)
  if (!dealerId) return jsonError("Dealer not found", 404)

  const { data: ticket } = await supabase
    .from("SupportTicket")
    .select("id, dealerId, subject, status")
    .eq("id", threadId)
    .maybeSingle()

  if (!ticket || ticket.dealerId !== dealerId) return jsonError("Not found", 404)

  const { data: messages, error } = await supabase
    .from("SupportMessage")
    .select("id, senderRole, body, createdAt")
    .eq("ticketId", threadId)
    .order("createdAt", { ascending: true })

  if (error) return jsonError("Failed to load messages", 500)

  return NextResponse.json({
    success: true,
    data: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        senderRole: m.senderRole,
        message: m.body,
        time: m.createdAt,
        isMe: m.senderRole === "DEALER",
      })),
    },
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  const user = await requireAuth(["DEALER", "DEALER_USER"])
  const { threadId } = await ctx.params

  if (isTestWorkspace(user)) return NextResponse.json({ success: true })
  if (!isDatabaseConfigured()) return jsonError("Service temporarily unavailable", 503)

  const dealerId = await getDealerIdForUser(user.userId)
  if (!dealerId) return jsonError("Dealer not found", 404)

  const body = await req.json().catch(() => null)
  const message = body?.message ? String(body.message).trim() : ""
  if (!message) return jsonError("Message is required")

  const { data: ticket } = await supabase
    .from("SupportTicket")
    .select("id, dealerId, status")
    .eq("id", threadId)
    .maybeSingle()

  if (!ticket || ticket.dealerId !== dealerId) return jsonError("Not found", 404)
  if (ticket.status !== "OPEN") return jsonError("Ticket is closed", 409)

  const { error } = await supabase.from("SupportMessage").insert({
    ticketId: threadId,
    senderUserId: user.userId,
    senderRole: "DEALER",
    body: message,
  })

  if (error) return jsonError("Failed to send message", 500)

  return NextResponse.json({ success: true })
}
```

---

### • FILE: `app/dealer/messages/page.tsx`

--- BEFORE
```tsx
"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Search, Send } from "lucide-react"

export default function DealerMessagesPage() {
  const conversations: any[] = []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Communicate with buyers and support"
      />

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-9" />
        </div>
      </div>

      {/* Conversations */}
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
          title="No messages yet"
          description="When you communicate with buyers about leads and offers, your conversations will appear here."
          primaryCta={{ label: "View Leads", href: "/dealer/leads" }}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <Card className="lg:col-span-1 h-[600px] overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {conversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{conv.name?.[0] || "B"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Message Area */}
          <Card className="lg:col-span-2 h-[600px] flex flex-col">
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." disabled />
                <Button disabled>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
```

+++ AFTER
```tsx
"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Search, Send } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { useMemo, useState } from "react"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json())

export default function DealerMessagesPage() {
  const { data, isLoading } = useSWR("/api/dealer/messages", fetcher)
  const conversations: any[] = data?.success ? data.data || [] : []
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        String(c.subject || "").toLowerCase().includes(q) ||
        String(c.lastMessage || "").toLowerCase().includes(q),
    )
  }, [conversations, search])

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="Dealer support tickets (Dealer ↔ AutoLenis Admin)." />

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href="/dealer/messages/new" className="inline-flex">
          <Button>New Ticket</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
          title="No messages yet"
          description="Start a support ticket to get help from the AutoLenis team."
          primaryCta={{ label: "Create Ticket", href: "/dealer/messages/new" }}
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-[600px] overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((conv: any) => (
                  <Link
                    key={conv.id}
                    href={`/dealer/messages/${conv.id}`}
                    className="block p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{String(conv.subject || "S").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || ""}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 h-[600px] flex flex-col">
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view messages</p>
              </div>
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input placeholder="Select a ticket to send messages" disabled aria-disabled="true" />
                <Button disabled aria-disabled="true">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
```

---

### • FILE: `app/dealer/messages/new/page.tsx` (NEW)

--- BEFORE
```tsx
// (file did not exist)
```

+++ AFTER
```tsx
"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NewDealerTicketPage() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader title="New Support Ticket" subtitle="Contact AutoLenis support (dealer-only)." />

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="subject">Subject</label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Contract Shield issue, payout question"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="message">Message</label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you need help with..."
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <Button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true)
                try {
                  const res = await fetch("/api/dealer/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subject, message }),
                    credentials: "include",
                  })
                  const data = await res.json().catch(() => null)
                  if (!res.ok || !data?.success) {
                    toast.error(data?.error || "Failed to create ticket")
                    return
                  }
                  toast.success("Ticket created")
                  router.push(`/dealer/messages/${data.data.id}`)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              Create Ticket
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### • FILE: `app/dealer/messages/[threadId]/page.tsx`

--- BEFORE
```tsx
"use client"
import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { MessageSquare, Send } from "lucide-react"

interface Message {
  id: number
  sender: string
  message: string
  time: string
  isMe: boolean
}

export default function DealerMessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/dealer/messages/${threadId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch {
        setMessages([])
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [threadId])

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/messages">Messages</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{threadId}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader><CardTitle>Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>No messages in this conversation yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-lg p-3 ${msg.isMe ? "bg-[#0066FF] text-white" : "bg-muted"}`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea placeholder="Type your message..." className="flex-1" />
            <Button><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

+++ AFTER
```tsx
"use client"
import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { MessageSquare, Send } from "lucide-react"

export default function DealerMessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params)
  const [messages, setMessages] = useState<any[]>([])
  const [subject, setSubject] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchThread() {
      try {
        const res = await fetch(`/api/dealer/messages/${threadId}`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setMessages(data.data?.messages || [])
          setSubject(data.data?.subject || threadId)
          setStatus(data.data?.status || "")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchThread()
  }, [threadId])

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dealer/messages">Messages</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{threadId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{subject || "Conversation"}</span>
            {status ? <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{status}</span> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p>No messages in this ticket yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-lg p-3 ${msg.isMe ? "bg-[#0066FF] text-white" : "bg-muted"}`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                      {new Date(msg.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder={status === "CLOSED" ? "Ticket is closed" : "Type your message..."}
              className="flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={status === "CLOSED" || sending}
            />
            <Button
              disabled={status === "CLOSED" || sending || !draft.trim()}
              onClick={async () => {
                setSending(true)
                try {
                  const res = await fetch(`/api/dealer/messages/${threadId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: draft }),
                    credentials: "include",
                  })
                  if (!res.ok) return
                  setDraft("")
                  const r2 = await fetch(`/api/dealer/messages/${threadId}`, { credentials: "include" })
                  const d2 = await r2.json().catch(() => null)
                  setMessages(d2?.data?.messages || [])
                } finally {
                  setSending(false)
                }
              }}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### • FILE: `e2e/dealer-smoke.spec.ts`

--- BEFORE
```ts
// Routes that should exist in the dealer portal
const DEALER_ROUTES = [
  "/dealer/dashboard",
  "/dealer/inventory",
  "/dealer/inventory/add",
  "/dealer/inventory/bulk-upload",
  "/dealer/auctions",
  "/dealer/deals",
  "/dealer/contracts",
  "/dealer/documents",
  "/dealer/payments",
  "/dealer/settings",
]
```

+++ AFTER
```ts
// Routes that should exist in the dealer portal
const DEALER_ROUTES = [
  "/dealer/dashboard",
  "/dealer/inventory",
  "/dealer/inventory/add",
  "/dealer/inventory/bulk-upload",
  "/dealer/auctions",
  "/dealer/deals",
  "/dealer/contracts",
  "/dealer/documents",
  "/dealer/payments",
  "/dealer/messages",
  "/dealer/messages/new",
  "/dealer/settings",
]
```

---

## C) Validation Package

### 1) Migration (required)
```bash
psql "$POSTGRES_URL" -f migrations/100-add-support-tickets.sql
```

### 2) Local checks (required)
```bash
pnpm install
pnpm lint
pnpm build
pnpm test:e2e --grep "Dealer Smoke"
```

### 3) Expected outcomes
- Dealer dashboard metrics are consistent and correct:
  - Offers are counted by **participantId IN AuctionParticipant.id**
  - Active auctions = **OPEN** invited auctions
  - Awaiting bids = open invited auctions without an offer by the dealer
  - Pending contracts = **ContractShieldScan** statuses indicating pending review
- Dealer Messages is functional and persists tickets/messages to DB.
- Dealer smoke routes include Messages pages.

---

## D) Agent Enforcement Prompt (force full implementation)

```text
You are implementing a production patch on the AutoLenis repo. You MUST implement the exact patch bundle in this markdown file with ZERO omissions and ZERO deviations. You are NOT allowed to skip files, partially implement, or “approximate” changes. Your output must be the completed code in the repository and it must pass verification.

NON-NEGOTIABLE REQUIREMENTS
1) Apply ALL file changes EXACTLY as specified (file paths + final code). No alternate implementations.
2) Do not remove or rename any existing routes; only add or fix.
3) Implement the DB migration exactly and ensure it is safe on Postgres/Supabase.
4) After implementation, you MUST run:
   - pnpm lint
   - pnpm build
   - pnpm test:e2e --grep "Dealer Smoke"
   and you MUST confirm they pass. If any fail, you must fix the code until all pass.
5) You must verify manually that:
   - /dealer/dashboard loads (or redirects to auth when no session)
   - /api/dealer/dashboard returns correct stats (offers counted by AuctionParticipant ids; awaiting bids computed by open invited auctions with no offer; pending contracts based on ContractShieldScan statuses)
   - /api/dealer/application-status uses requireAuth(["DEALER","DEALER_USER"]) and passes user.userId
   - /dealer/messages is not a stub: create a ticket, view thread, send message, and data persists in SupportTicket/SupportMessage tables.

STOP CONDITIONS
- You are done ONLY when all commands pass and all behaviors are verified.
- If you discover any missing import, type error, route mismatch, or API failure, you must fix it immediately and re-run checks.

Deliverable: Commit-ready repo state with all changes applied.
```

