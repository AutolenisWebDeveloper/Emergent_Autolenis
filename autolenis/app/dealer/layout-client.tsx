"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Gavel,
  MailOpen,
  Target,
  FileText,
  Handshake,
  Package,
  FileCheck,
  FolderOpen,
  DollarSign,
  MessageSquare,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SessionStatusBanner } from "@/components/auth/session-status-banner"
import { AuthDebugDrawer } from "@/components/auth/auth-debug-drawer"
import { PortalSwitcher } from "@/components/portal-switcher"
import type { PortalLink } from "@/components/portal-switcher"

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Gavel,
  MailOpen,
  Target,
  FileText,
  Handshake,
  Package,
  FileCheck,
  FolderOpen,
  DollarSign,
  MessageSquare,
  Truck,
  Settings,
}

export interface NavItem {
  href: string
  label: string
  icon: string
  exact?: boolean
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

interface SidebarNavProps {
  sections: NavSection[]
  pathname: string
  onLinkClick?: () => void
  mobile?: boolean
}

function isActive(href: string, pathname: string, exact = false): boolean {
  if (exact || href === "/dealer/dashboard") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(href + "/")
}

function SidebarNav({ sections, pathname, onLinkClick, mobile = false }: SidebarNavProps) {
  return (
    <nav aria-label="Main navigation" className={cn("flex flex-col gap-0", mobile && "px-2 py-3")}>
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={cn(sIdx > 0 && "mt-5")}>
          {section.label && (
            <div
              className={cn(
                "px-3 mb-1.5 flex items-center",
                mobile && "px-4",
              )}
              aria-hidden="true"
            >
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 select-none">
                {section.label}
              </span>
            </div>
          )}
          <ul role="list" className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard
              const active = isActive(item.href, pathname, item.exact)

              const baseItemClass = cn(
                "group flex items-center gap-2.5 w-full rounded-lg transition-all duration-150",
                "text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                mobile ? "px-4 py-2.5 min-h-[44px]" : "px-3 py-2",
              )

              const activeClass = "bg-[var(--portal-sidebar-active)] text-[var(--portal-sidebar-active-foreground)] shadow-sm"
              const inactiveClass = "text-[var(--portal-sidebar-foreground)] hover:bg-[var(--portal-sidebar-hover)] hover:text-[var(--portal-sidebar-foreground)]"

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onLinkClick}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      baseItemClass,
                      active ? activeClass : inactiveClass,
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        active ? "text-[var(--portal-sidebar-active-foreground)]" : "text-muted-foreground group-hover:text-[var(--portal-sidebar-foreground)]",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function DealerLayoutClient({
  children,
  nav,
  userEmail,
  portalLinks = [],
}: {
  children: React.ReactNode
  nav: NavSection[]
  userEmail: string
  portalLinks?: PortalLink[]
}) {
  // Store the pathname at which the menu was opened; menu is "open" only on that pathname.
  // This avoids a useEffect to close the menu on navigation.
  const [menuOpenPathname, setMenuOpenPathname] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()

  const mobileMenuOpen = menuOpenPathname === pathname

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

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      window.location.href = "/auth/signin"
    } catch {
      window.location.href = "/auth/signin"
    }
  }

  const closeMobileMenu = useCallback(() => setMenuOpenPathname(null), [])

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-portal-header/20 bg-portal-header text-portal-header-foreground shadow-sm"
        role="banner"
      >
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpenPathname(pathname)}
                className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link
                href="/dealer/dashboard"
                className="flex items-center gap-2 sm:gap-3 focus-ring rounded-lg"
                aria-label="AutoLenis Dealer Portal"
              >
                <Image
                  src="/images/auto-20lenis.png"
                  alt=""
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  priority
                />
                <span className="text-lg sm:text-xl font-bold tracking-tight hidden sm:inline select-none">
                  Dealer Portal
                </span>
                <span className="text-lg font-bold tracking-tight sm:hidden select-none">
                  Dealer
                </span>
              </Link>
            </div>

            {/* Right: portal switcher + email + logout */}
            <div className="flex items-center gap-2 sm:gap-4">
              <PortalSwitcher currentPortal="dealer" availablePortals={portalLinks} />
              <span
                className="text-xs sm:text-sm text-portal-header-foreground/70 hidden md:inline truncate max-w-[150px] lg:max-w-[200px] select-all"
                aria-label={`Logged in as ${userEmail}`}
              >
                {userEmail}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 text-sm text-portal-header-foreground/80 hover:text-portal-header-foreground p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                aria-label="Log out of your account"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline text-sm">
                  {isLoggingOut ? "Logging out…" : "Log Out"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 bottom-0 w-[min(320px,88vw)] bg-card shadow-2xl flex flex-col overflow-hidden safe-bottom">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-portal-header text-portal-header-foreground flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/images/auto-20lenis.png"
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7"
                />
                <span className="font-semibold tracking-tight text-sm">Dealer Portal</span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Portal switcher (mobile) */}
            <PortalSwitcher currentPortal="dealer" availablePortals={portalLinks} onLinkClick={closeMobileMenu} variant="mobile" />

            {/* Drawer nav — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2">
              <SidebarNav
                sections={nav}
                pathname={pathname}
                onLinkClick={closeMobileMenu}
                mobile
              />
            </div>

            {/* Drawer footer */}
            <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-muted/30">
              <p className="text-xs text-muted-foreground truncate select-all">{userEmail}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ─────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside
            className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="sticky top-24 rounded-xl border border-border/60 bg-[var(--portal-sidebar)] shadow-sm overflow-hidden">
              <div className="px-3 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <SidebarNav
                  sections={nav}
                  pathname={pathname}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
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
