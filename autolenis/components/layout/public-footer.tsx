"use client"

import Image from "next/image"
import Link from "next/link"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion"

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/insurance", label: "Insurance" },
      { href: "/pricing", label: "Pricing" },
      { href: "/refinance", label: "Refinance" },
      { href: "/contract-shield", label: "Contract Shield" },
      { href: "/buyer/onboarding", label: "Get Started" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/affiliate", label: "Partner Program" },
      { href: "/dealer-application", label: "For Dealers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/dealer-terms", label: "Dealer Terms" },
    ],
  },
]

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="relative overflow-hidden bg-footer-bg"
      role="contentinfo"
    >
      {/* Top border gradient for separation */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--footer-accent) 30%, var(--footer-accent) 70%, transparent)",
          opacity: 0.3,
        }}
      />

      {/* Subtle decorative gradient orb */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse, var(--footer-accent) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-10 lg:pt-24 lg:pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-14 mb-14 lg:mb-20">
          {/* Brand column */}
          <FadeIn className="col-span-2" delay={0}>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 mb-5 focus-ring rounded-lg transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/auto-20lenis.png"
                alt=""
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-lg font-bold tracking-tight" style={{ color: "oklch(0.65 0.18 278)" }}>
                AutoLenis
              </span>
            </Link>
            <p className="text-sm text-footer-muted max-w-xs leading-relaxed mb-6">
              AI-powered car buying concierge built for buyers who value
              control, clarity, and convenience. Free to start — Premium
              full-service concierge available for a flat $499 fee, including
              financing guidance and free home delivery.
            </p>
            {/* Trust indicators */}
            <div className="flex items-center gap-4 text-xs text-footer-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                SSL Secured
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                256-bit Encryption
              </span>
            </div>
          </FadeIn>

          {/* Link columns */}
          {footerSections.map((section, idx) => (
            <StaggerContainer key={section.title} delay={0.1 + idx * 0.05}>
              <StaggerItem>
                <h3 className="text-xs font-semibold text-footer-foreground mb-5 tracking-widest uppercase">
                  {section.title}
                </h3>
              </StaggerItem>
              <ul className="flex flex-col gap-3">
                {section.links.map((link) => (
                  <StaggerItem key={link.href}>
                    <li>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center text-sm text-footer-muted hover:text-footer-foreground transition-colors duration-200 focus-ring rounded"
                      >
                        <span className="relative">
                          {link.label}
                          <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-footer-accent/60 transition-all duration-300 group-hover:w-full" />
                        </span>
                      </Link>
                    </li>
                  </StaggerItem>
                ))}
              </ul>
            </StaggerContainer>
          ))}
        </div>

        {/* Separator */}
        <FadeIn>
          <div className="h-px bg-gradient-to-r from-transparent via-footer-accent/25 to-transparent" />
        </FadeIn>

        {/* Bottom bar */}
        <FadeIn delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-xs text-footer-muted order-2 sm:order-1">
              &copy; {currentYear} <span style={{ color: "oklch(0.65 0.18 278)" }}>AutoLenis</span>. All rights reserved.
            </p>
          </div>
        </FadeIn>
      </div>
    </footer>
  )
}
