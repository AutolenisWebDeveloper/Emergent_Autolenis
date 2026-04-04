"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PUBLIC HEADER / TOP NAVIGATION — Fortune 500 Fintech Standard
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * VISUAL / INTERACTION SPEC
 * ─────────────────────────
 * Surface:     Near-white (bg-background/95), not pure white.
 *              On scroll (>10px): subtle backdrop-blur + hairline bottom border + light elevation.
 * Height:      Desktop 64px (h-16), Mobile 56px (h-14).
 * Layout:      Logo (left) | Center nav links (desktop only) | CTAs (right).
 * Breakpoint:  lg (1024px) — below this, collapse to hamburger → Sheet drawer.
 *
 * Typography:  Nav links: text-sm font-medium, muted-foreground; active = foreground + underline accent.
 * Spacing:     Links gap-1 (px-3 each); no wrapping. Right CTAs gap-3.
 * Colors:      Brand purple only on: primary CTA gradient, active indicator.
 *              All other elements use neutral foreground/muted tokens.
 *
 * Micro-interactions:
 *   - Scroll state change: 200ms transition on background/border/shadow.
 *   - Link hover: 150ms color transition.
 *   - Active indicator: animated underline (framer-motion layoutId spring).
 *   - Mobile sheet: Radix Sheet with 300ms slide, backdrop overlay.
 *   - Hamburger icon: 150ms rotation transition between Menu ↔ X.
 *
 * Accessibility (WCAG 2.2 AA):
 *   - <header> landmark with role="banner".
 *   - <nav> with aria-label distinguishing desktop from mobile.
 *   - Hamburger: aria-expanded, aria-controls pointing to sheet.
 *   - Sheet uses Radix Dialog (auto focus trap, Escape to close).
 *   - All interactive elements have focus-ring (2px outline on :focus-visible).
 *   - Keyboard: Tab through all links, Enter/Space to activate.
 *   - prefers-reduced-motion: CSS handles globally (see globals.css).
 *
 * Menu items (ALL preserved, ordered):
 *   How It Works | Pricing | Refinance | About | Contract Shield |
 *   Contact | Partner Program | Dealers
 *   + Sign In (secondary CTA) + Get Started (primary CTA)
 *
 * Mobile behavior:
 *   Visible: Logo + "Get Started" CTA + Hamburger.
 *   Sheet (right): ALL nav links in order + Sign In + pinned "Get Started" at bottom.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { NAV_LINKS } from "@/components/nav/nav-config"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  // Scroll detection for header elevation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  )

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          : "bg-background/80 border-b border-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80 focus-ring"
        >
          <Image
            src="/images/auto-20lenis.png"
            alt="AutoLenis logo"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-foreground">
            AutoLenis
          </span>
        </Link>

        {/* ── Desktop Nav Links (center) ── */}
        <div className="hidden lg:flex items-center gap-1" role="menubar">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-ring",
                isActive(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-brand-purple"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* ── Desktop CTAs (right) ── */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-ring"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 focus-ring shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 50%, var(--brand-cyan) 100%)",
            }}
          >
            <span className="relative z-10">Get Started</span>
            <ChevronRight className="relative z-10 h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-200" aria-hidden="true" />
          </Link>
        </div>

        {/* ── Mobile: Get Started + Hamburger ── */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 focus-ring shadow-sm active:scale-[0.97]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 50%, var(--brand-cyan) 100%)",
            }}
          >
            Get Started
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center justify-center rounded-lg p-2 text-foreground transition-colors duration-150 hover:bg-muted/80 focus-ring touch-target"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-sheet"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* ── Mobile Sheet (Radix-based) ── */}
      <Sheet key={pathname} open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col p-0 lg:hidden"
          id="mobile-nav-sheet"
        >
          {/* Sheet header */}
          <SheetHeader className="flex-row items-center justify-between border-b border-border/40 px-4 py-3">
            <SheetTitle asChild>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg focus-ring"
              >
                <Image
                  src="/images/auto-20lenis.png"
                  alt="AutoLenis"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="font-bold tracking-tight text-foreground">
                  AutoLenis
                </span>
              </Link>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Site navigation menu
            </SheetDescription>
          </SheetHeader>

          {/* Nav links */}
          <nav
            className="flex-1 overflow-y-auto px-3 py-3"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors duration-150 touch-target focus-ring",
                      isActive(link.href)
                        ? "bg-primary/5 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {link.label}
                    {isActive(link.href) && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-purple" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Pinned CTAs at bottom */}
          <SheetFooter className="border-t border-border/40 px-4 py-4 safe-bottom">
            <Link
              href="/auth/signin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground touch-target focus-ring"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-base font-semibold text-primary-foreground transition-all duration-200 touch-target focus-ring shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 50%, var(--brand-cyan) 100%)",
              }}
            >
              Get Started
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  )
}
