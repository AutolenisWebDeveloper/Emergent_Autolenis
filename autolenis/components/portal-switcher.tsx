"use client"

import Link from "next/link"
import {
  LayoutDashboard,
  Car,
  Building2,
  Users,
  ArrowRightLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ─────────────────────────────────────────────────────── */

export type PortalId = "buyer" | "dealer" | "admin" | "affiliate"

export interface PortalLink {
  /** Target portal identifier */
  portal: PortalId
  /** Navigation target */
  href: string
  /** Full label (desktop) */
  label: string
  /** Short label (mobile / compact) */
  shortLabel: string
}

export interface PortalSwitcherProps {
  /** Which portal is currently active */
  currentPortal: PortalId
  /** List of other portals the user may navigate to */
  availablePortals: PortalLink[]
  /** Callback fired when a link is clicked (e.g. close mobile menu) */
  onLinkClick?: () => void
  /** Display variant */
  variant?: "header" | "mobile"
}

/* ── Icon map ──────────────────────────────────────────────────── */

const portalIcons: Record<PortalId, LucideIcon> = {
  buyer: Car,
  dealer: Building2,
  admin: LayoutDashboard,
  affiliate: Users,
}

/* ── Component ─────────────────────────────────────────────────── */

export function PortalSwitcher({
  currentPortal,
  availablePortals,
  onLinkClick,
  variant = "header",
}: PortalSwitcherProps) {
  if (availablePortals.length === 0) return null

  if (variant === "mobile") {
    return (
      <div className="p-3 border-b border-border" data-testid="portal-switcher-mobile">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 px-1 mb-2 select-none">
          Switch Portal
        </p>
        <div className="space-y-1">
          {availablePortals.map((p) => {
            const Icon = portalIcons[p.portal]
            return (
              <Link
                key={p.portal}
                href={p.href}
                onClick={onLinkClick}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                data-testid={`portal-link-mobile-${p.portal}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{p.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Header variant (desktop)
  return (
    <div className="flex items-center gap-1.5" data-testid="portal-switcher-header">
      {availablePortals.map((p) => {
        const Icon = portalIcons[p.portal]
        return (
          <Link
            key={p.portal}
            href={p.href}
            className={cn(
              "hidden sm:flex items-center gap-1.5 text-xs sm:text-sm",
              "text-portal-header-foreground/80 hover:text-portal-header-foreground",
              "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/15",
              "hover:bg-white/10 transition-colors focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
            data-testid={`portal-link-header-${p.portal}`}
          >
            <ArrowRightLeft className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">{p.label}</span>
            <span className="md:hidden">{p.shortLabel}</span>
          </Link>
        )
      })}
    </div>
  )
}
