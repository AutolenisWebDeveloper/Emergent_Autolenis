"use client"

import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  Shield,
  TrendingUp,
  Key,
  Target,
  Heart,
  FileCheck,
  Lock,
  Car,
  ChevronRight,
  DollarSign,
  AlertCircle,
} from "lucide-react"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  ScaleIn,
} from "@/components/ui/motion"

/* ------------------------------------------------------------------ */
/*  How It Works Page                                                  */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: "1",
    color: "var(--brand-green)",
    icon: FileCheck,
    title: "Secure Application & Consent",
    desc: "Start with a secure digital application. We clearly explain how your information is used and obtain explicit consent before any credit-related workflow proceeds.",
    bullets: [
      "Clear privacy and consent disclosures",
      "Encrypted submission and access controls",
      "You stay in control from start to finish",
    ],
    side: "right" as const,
  },
  {
    num: "2",
    color: "var(--brand-cyan)",
    icon: TrendingUp,
    title: "Pre-Qualification + Budget Guardrails",
    desc: "With your authorization, AutoLenis supports a pre-qualification workflow to estimate your financing range so you can shop responsibly.",
    bullets: [
      "Budget band visibility (what you can realistically target)",
      "Guardrails that keep your search aligned to your range",
      "No obligation to proceed",
    ],
    side: "left" as const,
  },
  {
    num: "3",
    color: "var(--brand-blue)",
    icon: Car,
    title: "Dealer Matching + Competitive Offers",
    desc: "Based on your vehicle preferences and financing status, AutoLenis connects you to licensed dealers who can fulfill your request. Dealers compete to earn your business with transparent offers.",
    bullets: [
      "Licensed, vetted dealer network",
      "Offers aligned to your criteria (vehicle, budget, location)",
      "Dealers handle inventory and delivery logistics",
    ],
    side: "right" as const,
  },
  {
    num: "4",
    color: "var(--brand-purple)",
    icon: Shield,
    title: "Review & Compare (Best Price Report + Contract Shield™)",
    desc: "Review and compare offers in one dashboard with clear totals and line-item visibility. Then use Contract Shield™ to verify the paperwork before you sign.",
    bullets: [
      "Side-by-side comparison across total cost and terms",
      "Clear breakdown of taxes, fees, and add-ons",
      "Contract Shield™ flags common issues (junk fees, unexpected products, math/term mismatches)",
      "Fix-list workflow so issues can be corrected before closing",
    ],
    side: "left" as const,
  },
  {
    num: "5",
    color: "var(--brand-green)",
    icon: Key,
    title: "Close & Pickup (Digital or In-Person)",
    desc: "When you're ready, you finalize directly with the dealer. AutoLenis stays with you through signing and delivery.",
    bullets: [
      "Digital or in-person signing options",
      "Flexible pickup or delivery coordination",
      "Support through completion",
    ],
    side: "right" as const,
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ============================================================ */}
      {/*  HERO - Light, bright, enterprise                            */}
      {/* ============================================================ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, oklch(0.85 0.08 210), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, oklch(0.88 0.08 280), transparent 70%)" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left */}
            <div className="flex flex-col gap-6 sm:gap-8 text-center md:text-left">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 self-center md:self-start px-4 py-2 rounded-full border border-brand-purple/15 bg-brand-purple/5">
                  <Shield className="w-4 h-4 text-brand-purple" />
                  <span className="text-sm text-foreground/70 font-medium">Transparent, structured process</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                  How{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)",
                    }}
                  >
                    AutoLenis
                  </span>{" "}
                  Works
                </h1>
              </FadeIn>

              <FadeIn delay={0.25}>
                <p className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground text-balance max-w-xl mx-auto md:mx-0">
                  Verified offers. Clear terms. Confident closing.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance max-w-xl mx-auto md:mx-0 leading-relaxed">
                  AutoLenis is a digital concierge for car buyers. We help you understand your buying power, surface
                  competitive dealer offers, and verify the paperwork before you sign—so you can buy with clarity, not
                  pressure.
                </p>
              </FadeIn>

              <FadeIn delay={0.35}>
                <p className="text-sm text-muted-foreground/80 max-w-xl mx-auto md:mx-0 leading-relaxed">
                  AutoLenis is not a lender or a dealership. Lenders make all credit decisions. Dealers manage inventory,
                  contracts, and delivery.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
                  <Link
                    href="/buyer/onboarding"
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_2px_8px_rgba(45,27,105,0.12)]"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                    }}
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                  >
                    Talk to Concierge
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right - Steps Preview Card */}
            <FadeIn direction="left" delay={0.3}>
              <div className="relative">
                <div className="bg-background rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(45,27,105,0.08)] p-6 md:p-8 border border-border">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-foreground font-bold text-xl">5 Clear Steps</span>
                    <span className="px-3 py-1 rounded-full bg-brand-green/10 text-sm font-semibold text-brand-green">
                      Guided Process
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {[
                      { num: "1", color: "var(--brand-green)", title: "Application & Consent", sub: "Secure start with clear authorization" },
                      { num: "2", color: "var(--brand-cyan)", title: "Pre-Qualification", sub: "Budget guardrails and financing range" },
                      { num: "3", color: "var(--brand-blue)", title: "Dealer Matching", sub: "Competitive offers from licensed dealers" },
                      { num: "4", color: "var(--brand-purple)", title: "Review & Compare", sub: "Best Price Report + Contract Shield™" },
                      { num: "5", color: "var(--brand-green)", title: "Close & Pickup", sub: "Digital or in-person signing" },
                    ].map((s) => (
                      <div key={s.num} className="flex items-start gap-4">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm"
                          style={{ background: `color-mix(in oklch, ${s.color} 12%, transparent)`, color: s.color }}
                        >
                          {s.num}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/buyer/onboarding"
                    className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Get Started
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { val: 5, suffix: "", label: "Clear Steps" },
                    { val: 0, suffix: "", label: "Secure Process", display: "Secure" },
                    { val: 500, suffix: "+", label: "Partners" },
                  ].map((stat, i) => (
                    <ScaleIn key={i} delay={0.5 + i * 0.1}>
                      <div className="rounded-xl p-3 sm:p-4 text-center border border-border bg-background shadow-sm">
                        <div className="text-lg sm:text-xl font-bold text-brand-purple">
                          {stat.display || <AnimatedCounter target={stat.val} suffix={stat.suffix} />}
                        </div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    </ScaleIn>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHAT YOU GET WITH AUTOLENIS                                  */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 bg-surface-elevated border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                What You Get With AutoLenis
              </h2>
            </div>
          </FadeIn>
          <StaggerContainer className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {[
              "Pre-qualification clarity so you shop within a real budget band",
              "Dealer competition to surface strong offers without negotiation games",
              "Out-the-door transparency (price, taxes, fees, and totals)",
              "Side-by-side comparisons across offers and terms",
              "Contract Shield™ review to catch junk fees, add-ons, and inconsistencies before signing",
              "End-to-end concierge support through pickup or delivery",
            ].map((item) => (
              <StaggerItem key={item}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-brand-green/15">
                    <Check className="w-3 h-3 text-brand-green" />
                  </div>
                  <span className="text-foreground/80 text-sm leading-relaxed">{item}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ABOUT SECTION                                               */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14 md:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 bg-brand-purple/8 text-brand-purple">
                About AutoLenis
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                A Digital Concierge for Car Buyers
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                AutoLenis helps you navigate pre-qualification, offers, and purchase in one secure flow. We connect you
                with participating lenders and licensed dealers—AutoLenis is not a lender or a dealership.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <FadeIn>
              <div className="flex flex-col gap-6">
                <h3 className="text-2xl font-bold text-foreground">What We Do</h3>
                <p className="text-muted-foreground leading-relaxed">
                  With your consent, we collect the information needed to support pre-qualification and offer
                  matching—then route it securely to relevant partners.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Lenders make all credit decisions. Dealers manage inventory, contracts, and delivery. AutoLenis
                  provides the platform, clarity, and guardrails so you can move forward with confidence.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid grid-cols-2 gap-4">
              {[
                { val: "500+", label: "Partner Dealers", color: "var(--brand-green)" },
                { val: "Secure", label: "Data Handling", color: "var(--brand-cyan)" },
                { val: "24/7", label: "Digital Access", color: "var(--brand-blue)" },
                { val: "Clear", label: "Consent Process", color: "var(--brand-purple)" },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="rounded-2xl p-6 text-center border border-border bg-surface-elevated">
                    <div className="text-3xl font-bold text-brand-purple">{stat.val}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Core Values */}
          <StaggerContainer className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Target, color: "var(--brand-green)", title: "Transparency", desc: "Clear pricing and terms—no surprises at signing." },
              { icon: Lock, color: "var(--brand-cyan)", title: "Data Protection", desc: "Consent-based collection with secure handling and limited access." },
              { icon: Heart, color: "var(--brand-purple)", title: "Consumer Focus", desc: "Tools built to inform and verify—not pressure you." },
            ].map((val) => (
              <StaggerItem key={val.title}>
                <div className="h-full bg-surface-elevated rounded-2xl p-8 border border-border hover:border-brand-purple/15 hover:shadow-lg transition-all duration-300">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: `color-mix(in oklch, ${val.color} 10%, transparent)` }}
                  >
                    <val.icon className="w-7 h-7" style={{ color: val.color }} />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-3">{val.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{val.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5-STEP PROCESS (Timeline)                                   */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                The Process, Step by Step
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Five stages—from application to keys in hand.
              </p>
            </div>
          </FadeIn>

          <div className="relative flex flex-col gap-16 md:gap-20">
            {/* Vertical timeline line (desktop) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-brand-green via-brand-cyan to-brand-purple opacity-20" />

            {steps.map((step, idx) => {
              const isLeft = step.side === "left"
              const Icon = step.icon
              return (
                <FadeIn key={step.num} direction={isLeft ? "left" : "right"} delay={0.1}>
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center relative">
                    {/* Timeline dot (desktop) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-background items-center justify-center z-10" style={{ background: step.color }}>
                      <span className="text-white font-bold text-sm">{step.num}</span>
                    </div>

                    {/* Content */}
                    <div className={`flex flex-col gap-5 ${isLeft ? "md:col-start-2 md:pl-12" : "md:pr-12"}`}>
                      <div
                        className="md:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl font-bold text-xl self-start"
                        style={{ background: `color-mix(in oklch, ${step.color} 12%, transparent)`, color: step.color }}
                      >
                        {step.num}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">{step.title}</h2>
                      <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{step.desc}</p>
                      <ul className="flex flex-col gap-3">
                        {step.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: `color-mix(in oklch, ${step.color} 15%, transparent)` }}>
                              <Check className="w-3 h-3" style={{ color: step.color }} />
                            </div>
                            <span className="text-foreground/80">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual */}
                    <div className={`rounded-2xl p-8 aspect-square flex items-center justify-center ${isLeft ? "md:col-start-1 md:row-start-1" : ""}`} style={{ background: `color-mix(in oklch, ${step.color} 6%, var(--surface-elevated))` }}>
                      <Icon className="w-24 h-24 md:w-32 md:h-32 opacity-60" style={{ color: step.color }} />
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING (Concierge Fee)                                     */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 bg-brand-purple/8 text-brand-purple">
                Pricing
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Concierge Fee
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                AutoLenis provides a concierge-grade buying experience designed to protect your time and your terms.
                Premium includes the full process — from vehicle search and financing guidance to contract review and free home delivery.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-background rounded-2xl p-8 md:p-12 border border-border shadow-sm">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-brand-green" />
                    Concierge Fee
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-green/5 border border-brand-green/10">
                      <span className="text-2xl font-bold text-brand-green">Free</span>
                      <span className="text-sm text-muted-foreground">Free Plan — $99 deposit credited toward purchase</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
                      <span className="text-2xl font-bold text-brand-purple">$499</span>
                      <span className="text-sm text-muted-foreground">Full-service concierge — $99 deposit credited toward fee</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-foreground">What Premium covers</h3>
                  <ul className="flex flex-col gap-3">
                    {[
                      "Dedicated buying specialist from search to delivery",
                      "Financing assistance to help find the right loan options",
                      "Deal and contract review before you sign",
                      "Closing coordination and free home delivery",
                      "Contract Shield™ review support prior to signing",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-brand-green/15">
                          <Check className="w-3 h-3 text-brand-green" />
                        </div>
                        <span className="text-foreground/80 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-6">
                Fees are for platform services and concierge support. Financing terms and dealer pricing are set by
                participating lenders and dealers.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  IMPORTANT CLARITY                                            */}
      {/* ============================================================ */}
      <section className="py-16 md:py-20 bg-background border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Important Clarity
              </h2>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: AlertCircle,
                color: "var(--brand-cyan)",
                title: "AutoLenis is not a lender.",
                desc: "Participating lenders/credit unions make underwriting decisions and set final terms.",
              },
              {
                icon: Car,
                color: "var(--brand-blue)",
                title: "AutoLenis is not a dealership.",
                desc: "Dealers provide vehicles, contracts, and delivery.",
              },
              {
                icon: Heart,
                color: "var(--brand-purple)",
                title: "No pressure.",
                desc: "You can pause, compare, or walk away at any time.",
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="h-full bg-surface-elevated rounded-2xl p-8 border border-border">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `color-mix(in oklch, ${item.color} 10%, transparent)` }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA - Light premium gradient                          */}
      {/* ============================================================ */}
      <section
        className="relative py-20 sm:py-24 md:py-32 overflow-hidden"
        style={{
          background: "linear-gradient(175deg, var(--cta-start) 0%, var(--cta-end) 100%)",
        }}
      >
        <div className="pointer-events-none absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, oklch(0.85 0.08 210), transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="flex flex-col items-center gap-8">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
                Ready to See Your Best Options?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Get started in minutes and review offers with clarity—before you ever waste time at a dealership.
              </p>
              <Link
                href="/buyer/onboarding"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-[0_4px_16px_rgba(45,27,105,0.15)]"
                style={{
                  background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                }}
              >
                Get Started
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/how-it-works" />

      <PublicFooter />
    </div>
  )
}
