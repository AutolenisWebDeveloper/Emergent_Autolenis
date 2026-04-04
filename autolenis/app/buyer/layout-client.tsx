"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CheckCircle2,
  Search,
  Heart,
  Gavel,
  FileText,
  Users2,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Car,
  Shield,
  ShieldCheck,
  Landmark,
  ClipboardList,
  Banknote,
  Receipt,
  PenLine,
  QrCode,
  FolderOpen,
  LayoutList,
  FileStack,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SessionStatusBanner } from "@/components/auth/session-status-banner"
import { AuthDebugDrawer } from "@/components/auth/auth-debug-drawer"
import { PortalSwitcher } from "@/components/portal-switcher"
import type { PortalLink } from "@/components/portal-switcher"

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  CheckCircle2,
  Search,
  Heart,
  Gavel,
  FileText,
  Users2,
  Settings,
  Car,
  Shield,
  ShieldCheck,
  Landmark,
  ClipboardList,
  Banknote,
  Receipt,
  PenLine,
  QrCode,
  FolderOpen,
  LayoutList,
  FileStack,
}

export interface NavSubItem {
  href: string
  label: string
  icon?: string
}

export interface NavItem {
  href: string
  label: string
  icon: string
  exact?: boolean
  subItems?: NavSubItem[]
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

interface SidebarNavProps {
  sections: NavSection[]
  pathname: string
  expandedItems: string[]
  onToggleExpand: (href: string) => void
  onLinkClick?: () => void
  mobile?: boolean
}

function isActive(href: string, pathname: string, exact = false): boolean {
  if (exact || href === "/buyer/dashboard") {
    return pathname === href
  }
  // Match exact path or any deeper subpath
  return pathname === href || pathname.startsWith(href + "/")
}

function SidebarNav({ sections, pathname, expandedItems, onToggleExpand, onLinkClick, mobile = false }: SidebarNavProps) {
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
            {section.items.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                pathname={pathname}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                onLinkClick={onLinkClick}
                mobile={mobile}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

interface NavItemComponentProps {
  item: NavItem
  pathname: string
  expandedItems: string[]
  onToggleExpand: (href: string) => void
  onLinkClick?: () => void
  mobile?: boolean
}

function NavItemComponent({ item, pathname, expandedItems, onToggleExpand, onLinkClick, mobile = false }: NavItemComponentProps) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard
  const active = isActive(item.href, pathname, item.exact)
  const hasSubItems = (item.subItems?.length ?? 0) > 0
  const isExpanded = expandedItems.includes(item.href)

  const handleClick = useCallback(() => {
    if (hasSubItems) {
      onToggleExpand(item.href)
    }
    if (!hasSubItems && onLinkClick) {
      onLinkClick()
    }
  }, [hasSubItems, item.href, onToggleExpand, onLinkClick])

  const baseItemClass = cn(
    "group flex items-center gap-2.5 w-full rounded-lg transition-all duration-150",
    "text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    mobile ? "px-4 py-2.5 min-h-[44px]" : "px-3 py-2",
  )

  const activeClass = "bg-[var(--portal-sidebar-active)] text-[var(--portal-sidebar-active-foreground)] shadow-sm"
  const inactiveClass = "text-[var(--portal-sidebar-foreground)] hover:bg-[var(--portal-sidebar-hover)] hover:text-[var(--portal-sidebar-foreground)]"

  if (hasSubItems) {
    return (
      <li>
        <button
          type="button"
          onClick={handleClick}
          aria-expanded={isExpanded}
          aria-controls={`subnav-${item.href.replace(/\//g, "-")}`}
          className={cn(
            baseItemClass,
            active ? activeClass : inactiveClass,
            "w-full",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors",
              active ? "text-[var(--portal-sidebar-active-foreground)]" : "text-muted-foreground group-hover:text-[var(--portal-sidebar-foreground)]",
            )}
            aria-hidden="true"
          />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-transform" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-transform" aria-hidden="true" />
          )}
        </button>

        {isExpanded && item.subItems && (
          <ul
            id={`subnav-${item.href.replace(/\//g, "-")}`}
            role="list"
            className={cn(
              "mt-1 space-y-0.5",
              mobile ? "ml-4 pl-4 border-l border-border/60" : "ml-3 pl-3 border-l border-border/60",
            )}
          >
            {item.subItems.map((subItem, subIdx) => {
              const SubIcon = subItem.icon ? (iconMap[subItem.icon] ?? null) : null
              const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/")
              // Sub-step ordering for My Deal
              const currentSubIdx = item.subItems!.findIndex(
                (s) => pathname === s.href || pathname.startsWith(s.href + "/"),
              )
              const isCompleted = currentSubIdx > -1 && subIdx < currentSubIdx
              const isCurrent = subActive
              const isUpcoming = currentSubIdx > -1 && subIdx > currentSubIdx

              return (
                <li key={subItem.href}>
                  <Link
                    href={subItem.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-2 rounded-md transition-all duration-150",
                      "text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      mobile ? "px-3 py-2 min-h-[40px]" : "px-3 py-1.5",
                      isCurrent
                        ? "text-[var(--portal-sidebar-active-foreground)] font-medium bg-[var(--portal-sidebar-active)]/60"
                        : isCompleted
                          ? "text-muted-foreground hover:text-[var(--portal-sidebar-foreground)] hover:bg-[var(--portal-sidebar-hover)]"
                          : isUpcoming
                            ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-[var(--portal-sidebar-hover)]"
                            : "text-muted-foreground hover:text-[var(--portal-sidebar-foreground)] hover:bg-[var(--portal-sidebar-hover)]",
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {SubIcon && (
                      <SubIcon
                        className={cn(
                          "h-3.5 w-3.5 flex-shrink-0",
                          isCurrent ? "text-[var(--portal-sidebar-active-foreground)]" : isCompleted ? "text-[var(--brand-green)]" : "text-muted-foreground/50",
                        )}
                        aria-hidden="true"
                      />
                    )}
                    {!SubIcon && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
                          isCurrent ? "bg-[var(--portal-sidebar-active-foreground)]" : isCompleted ? "bg-[var(--brand-green)]" : "bg-muted-foreground/30",
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{subItem.label}</span>
                    {isCompleted && (
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--brand-green)] ml-auto" aria-label="Completed" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li>
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
}

export function BuyerLayoutClient({
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

  // Compute which parent items contain the active route — reacts to both pathname and nav changes.
  const autoExpandedItems = useMemo(() => {
    const items: string[] = []
    nav.forEach((section) => {
      section.items.forEach((item) => {
        if (item.subItems?.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
        )) {
          items.push(item.href)
        }
      })
    })
    return items
  }, [pathname, nav])

  // Auto-expand the section containing the active sub-item.
  // Uses "setState during render" pattern (React docs: storing info from previous renders)
  // to avoid calling setState inside a useEffect, which would cause cascading renders.
  // useMemo returns a stable reference when neither pathname nor nav changes, so this
  // conditional only fires when the active section actually changes.
  const [expandedItems, setExpandedItems] = useState<string[]>(autoExpandedItems)
  const [lastAutoExpandedItems, setLastAutoExpandedItems] = useState(autoExpandedItems)
  if (lastAutoExpandedItems !== autoExpandedItems) {
    setLastAutoExpandedItems(autoExpandedItems)
    setExpandedItems((prev) => {
      const toAdd = autoExpandedItems.filter((item) => !prev.includes(item))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }

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

  const toggleExpand = useCallback((href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    )
  }, [])

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
                href="/buyer/dashboard"
                className="flex items-center gap-2 sm:gap-3 focus-ring rounded-lg"
                aria-label="AutoLenis Buyer Dashboard"
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
                  AutoLenis
                </span>
              </Link>
            </div>

            {/* Right: portal switcher + email + logout */}
            <div className="flex items-center gap-2 sm:gap-4">
              <PortalSwitcher currentPortal="buyer" availablePortals={portalLinks} />
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
                <span className="font-semibold tracking-tight text-sm">Buyer Dashboard</span>
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
            <PortalSwitcher currentPortal="buyer" availablePortals={portalLinks} onLinkClick={closeMobileMenu} variant="mobile" />

            {/* Drawer nav — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2">
              <SidebarNav
                sections={nav}
                pathname={pathname}
                expandedItems={expandedItems}
                onToggleExpand={toggleExpand}
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
                  expandedItems={expandedItems}
                  onToggleExpand={toggleExpand}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main id="main-content" className="flex-1 min-w-0" role="main">
            <SessionStatusBanner portal="buyer" />
            {children}
          </main>
        </div>
      </div>

      {/* Developer Debug Drawer */}
      <AuthDebugDrawer portal="buyer" />
    </div>
  )
}
