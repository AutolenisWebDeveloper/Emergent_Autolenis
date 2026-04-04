"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Users,
  Building2,
  DollarSign,
  FileWarning,
  LayoutDashboard,
  Handshake,
  Settings,
  LogOut,
  Gavel,
  ShieldCheck,
  HeadphonesIcon,
  Search,
  Bell,
  Menu,
  X,
  Car,
  RefreshCcw,
  FileText,
  FileCheck,
  BarChart3,
  TrendingUp,
  Bot,
  Target,
  Tag,
  AlertTriangle,
  UserPlus,
  UserCog,
  ClipboardList,
  GitBranch,
  Receipt,
  Wallet,
  CheckCircle,
  Landmark,
  FileSignature,
  ScrollText,
  Map,
  Award,
  Radar,
  PieChart,
  TestTube,
  Lock,
  Shield,
  Plug,
  ChevronDown,
  MessageSquare,
  Database,
  Globe,
  MapPin,
  Send,
  ShieldAlert,
  ClipboardCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import { SessionStatusBanner } from "@/components/auth/session-status-banner"
import { AuthDebugDrawer } from "@/components/auth/auth-debug-drawer"
import { NotificationBell } from "@/components/admin/notification-bell"
import { PortalSwitcher } from "@/components/portal-switcher"
import type { PortalLink } from "@/components/portal-switcher"

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Gavel,
  Handshake,
  DollarSign,
  ShieldCheck,
  FileWarning,
  Settings,
  HeadphonesIcon,
  Search,
  Car,
  RefreshCcw,
  FileText,
  FileCheck,
  BarChart3,
  TrendingUp,
  Bot,
  Target,
  Tag,
  AlertTriangle,
  UserPlus,
  UserCog,
  ClipboardList,
  GitBranch,
  Receipt,
  Wallet,
  CheckCircle,
  Landmark,
  FileSignature,
  ScrollText,
  Map,
  Award,
  Radar,
  PieChart,
  Bell,
  TestTube,
  Lock,
  Shield,
  Plug,
  MessageSquare,
  Database,
  Globe,
  MapPin,
  Send,
  ShieldAlert,
  ClipboardCheck,
}

export interface AdminNavItem {
  href: string
  label: string
  icon: string
}

export interface AdminNavSection {
  label?: string
  items: AdminNavItem[]
}

function getPathFromHref(href: string): string {
  return href.split("?")[0]
}

function isItemActive(href: string, pathname: string): boolean {
  const itemPath = getPathFromHref(href)
  if (itemPath === "/admin/dashboard") {
    return pathname === itemPath
  }
  return pathname === itemPath || pathname.startsWith(itemPath + "/")
}

function isSectionActive(section: AdminNavSection, pathname: string): boolean {
  return section.items.some((item) => isItemActive(item.href, pathname))
}

/* ── Sidebar navigation renderer ──────────────────────────── */

function AdminSidebarNav({
  sections,
  pathname,
  expandedSections,
  onToggleSection,
  onLinkClick,
  mobile = false,
}: {
  sections: AdminNavSection[]
  pathname: string
  expandedSections: string[]
  onToggleSection: (label: string) => void
  onLinkClick?: () => void
  mobile?: boolean
}) {
  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-0">
      {sections.map((section, sIdx) => {
        // Top-level items (Dashboard) — no label, no collapsible
        if (!section.label) {
          return (
            <div key={sIdx} className={cn(mobile ? "px-2 py-1" : "px-2 py-1")}>
              <ul role="list" className="space-y-0.5">
                {section.items.map((item) => (
                  <AdminNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onLinkClick={onLinkClick}
                    mobile={mobile}
                  />
                ))}
              </ul>
            </div>
          )
        }

        // Grouped collapsible section
        const isExpanded = expandedSections.includes(section.label)
        const sectionId = `admin-nav-${section.label.toLowerCase().replace(/\s+/g, "-")}`

        return (
          <div key={section.label} className={cn("border-t border-border/40", sIdx === 1 && "mt-1")}>
            <button
              type="button"
              onClick={() => onToggleSection(section.label!)}
              aria-expanded={isExpanded}
              aria-controls={sectionId}
              className={cn(
                "w-full flex items-center justify-between gap-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md",
                mobile ? "px-4 py-3 min-h-[44px]" : "px-3 py-2.5",
                isSectionActive(section, pathname)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[11px] font-semibold tracking-wider uppercase select-none">
                {section.label}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {isExpanded && (
              <ul
                id={sectionId}
                role="list"
                className={cn(
                  "space-y-0.5 pb-2",
                  mobile ? "px-2" : "px-2",
                )}
              >
                {section.items.map((item) => (
                  <AdminNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onLinkClick={onLinkClick}
                    mobile={mobile}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ── Individual nav link ──────────────────────────────────── */

function AdminNavLink({
  item,
  pathname,
  onLinkClick,
  mobile = false,
}: {
  item: AdminNavItem
  pathname: string
  onLinkClick?: () => void
  mobile?: boolean
}) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard
  const active = isItemActive(item.href, pathname)

  return (
    <li>
      <Link
        href={item.href}
        onClick={onLinkClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 w-full rounded-lg transition-all duration-150",
          "text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          mobile ? "px-4 py-2.5 min-h-[44px]" : "px-3 py-[7px]",
          active
            ? "bg-primary/10 text-primary font-medium shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  )
}

/* ── Main Layout Client ──────────────────────────────────── */

export function AdminLayoutClient({
  children,
  nav,
  userEmail,
  userRole,
  portalLinks = [],
}: {
  children: React.ReactNode
  nav: AdminNavSection[]
  userEmail: string
  userRole: string
  portalLinks?: PortalLink[]
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const pathname = usePathname()
  const router = useRouter()

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
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

  // Auto-expand sections containing the active route
  useEffect(() => {
    setExpandedSections((prev) => {
      const toAdd: string[] = []
      nav.forEach((section) => {
        if (section.label && isSectionActive(section, pathname) && !prev.includes(section.label)) {
          toAdd.push(section.label)
        }
      })
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }, [pathname, nav])

  // Quick search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results || [])
          setSearchOpen(true)
        }
      } catch {
        // Search is non-critical
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close search dropdown on route change
  useEffect(() => {
    setSearchOpen(false)
    setSearchQuery("")
  }, [pathname])

  const toggleSection = useCallback((label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }, [])

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-portal-header/20 bg-portal-header text-portal-header-foreground shadow-sm" role="banner">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              <Link href="/admin/dashboard" className="flex items-center gap-2 sm:gap-3 focus-ring rounded-lg">
                <Image
                  src="/images/auto-20lenis.png"
                  alt=""
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  priority
                />
                <span className="text-lg sm:text-xl font-bold tracking-tight hidden sm:inline">Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              {/* Quick Search - Hidden on small mobile */}
              <div className="relative hidden md:block">
                <label htmlFor="admin-quick-search" className="sr-only">
                  Quick search
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-portal-header-foreground/50" aria-hidden="true" />
                <input
                  id="admin-quick-search"
                  type="text"
                  placeholder="Quick search..."
                  className="pl-10 pr-4 py-2 bg-white/10 border border-white/15 rounded-lg text-sm text-portal-header-foreground placeholder:text-portal-header-foreground/50 focus:outline-none focus:ring-2 focus:ring-white/25 focus:bg-white/15 w-40 lg:w-64 transition-colors"
                  aria-label="Search admin panel"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-card rounded-xl shadow-lg border border-border z-50 max-h-96 overflow-y-auto min-w-[320px]">
                    {searchResults.map((group: any) => (
                      <div key={group.type}>
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border">
                          {group.type}
                        </div>
                        {group.items?.map((item: any) => (
                          <button
                            key={item.id}
                            className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm text-foreground border-b border-border last:border-b-0 transition-colors"
                            onMouseDown={() => router.push(item.href)}
                          >
                            <p className="font-medium">{item.label}</p>
                            {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-card rounded-xl shadow-lg border border-border z-50 p-4 min-w-[320px]">
                    <p className="text-sm text-muted-foreground text-center">No results found</p>
                  </div>
                )}
              </div>
              {/* Notifications */}
              <PortalSwitcher currentPortal="admin" availablePortals={portalLinks} />
              <NotificationBell />
              {/* User Menu */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium truncate max-w-[120px]">{userEmail}</p>
                  <p className="text-xs text-portal-header-foreground/60">{userRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
                </div>
                <button
                onClick={async () => {
                  try {
                    await fetch("/api/admin/auth/signout", { method: "POST", credentials: "include" })
                  } finally {
                    window.location.href = "/admin/sign-in"
                  }
                }}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm text-portal-header-foreground/80 hover:text-portal-header-foreground hover:bg-white/10 rounded-lg transition-colors touch-target focus-ring"
                aria-label="Log out of admin account"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 bottom-0 w-[min(320px,88vw)] bg-card shadow-2xl flex flex-col overflow-hidden safe-bottom">
            <div className="sticky top-0 p-4 border-b border-border flex items-center justify-between bg-portal-header text-portal-header-foreground flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/images/auto-20lenis.png"
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
                <span className="font-semibold tracking-tight text-sm">Admin Console</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {/* Mobile search */}
            <div className="p-3 border-b border-border md:hidden flex-shrink-0">
              <div className="relative">
                <label htmlFor="admin-mobile-search" className="sr-only">
                  Quick search
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id="admin-mobile-search"
                  type="text"
                  placeholder="Quick search..."
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  aria-label="Search admin panel"
                />
              </div>
            </div>
            {/* Portal switcher (mobile) */}
            <PortalSwitcher currentPortal="admin" availablePortals={portalLinks} onLinkClick={closeMobileMenu} variant="mobile" />
            {/* Mobile nav — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-1">
              <AdminSidebarNav
                sections={nav}
                pathname={pathname}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                onLinkClick={closeMobileMenu}
                mobile
              />
            </div>
            {/* Drawer footer */}
            <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-muted/30">
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{userRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-57px)] bg-card border-r border-border flex-shrink-0"
          role="navigation"
          aria-label="Admin navigation"
        >
          <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto py-1">
            <AdminSidebarNav
              sections={nav}
              pathname={pathname}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0" role="main">
          <SessionStatusBanner portal="admin" />
          <Suspense fallback={<div className="animate-pulse bg-muted h-32 rounded-xl" />}>{children}</Suspense>
        </main>
      </div>
      
      {/* Developer Debug Drawer */}
      <AuthDebugDrawer portal="admin" />
    </div>
  )
}
