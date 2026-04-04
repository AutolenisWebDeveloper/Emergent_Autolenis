"use client"

/**
 * Auth-Aware CTA Slot
 *
 * Minimal client boundary that checks authentication state and renders:
 *  - Logged out: "Sign In" (secondary) + "Get Started" (primary CTA)
 *  - Logged in:  "Dashboard" (routed by role) — hides "Get Started"
 *
 * This component is intentionally kept small so the rest of the header
 * can remain server-rendered (or at least not depend on auth state).
 *
 * Architecture note: Because reliable auth detection requires a Supabase
 * client or next-auth session, and this is a public marketing header,
 * we default to the logged-out state (Sign In + Get Started) which is
 * correct for the vast majority of visitors. A future enhancement can
 * hydrate auth state from a lightweight /api/me endpoint or cookie check.
 */

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthCTAProps {
  /** Additional classes for the container */
  className?: string
  /** Render variant — desktop shows both inline; mobile shows only Get Started */
  variant?: "desktop" | "mobile"
}

export function AuthCTA({ className, variant = "desktop" }: AuthCTAProps) {
  if (variant === "mobile") {
    return (
      <Link
        href="/auth/signup"
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 focus-ring shadow-sm hover:shadow-md active:scale-[0.98]",
          className,
        )}
        style={{
          background:
            "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 50%, var(--brand-cyan) 100%)",
        }}
      >
        Get Started
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href="/auth/signin"
        className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-ring"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="group relative inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground overflow-hidden transition-all duration-200 focus-ring shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 50%, var(--brand-cyan) 100%)",
        }}
      >
        <span className="relative z-10">Get Started</span>
        <ChevronRight className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-200" aria-hidden="true" />
      </Link>
    </div>
  )
}
