"use client"

import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import Link from "next/link"
import { ArrowRight, Check, DollarSign, ChevronRight, Shield, Star, Truck, FileSearch, Users } from "lucide-react"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  SlideIn,
} from "@/components/ui/motion"
import { PLANS, PRICING_DISPLAY } from "@/src/config/pricingConfig"

/* ------------------------------------------------------------------ */
/*  Pricing Page — V2: FREE + PREMIUM ($499)                          */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const freePlan = PLANS.FREE
  const premiumPlan = PLANS.PREMIUM

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)",
        }}
      >
        <div className="pointer-events-none absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, oklch(0.85 0.10 162), transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, oklch(0.85 0.08 210), transparent 70%)" }} />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-green/15 bg-brand-green/5 mb-6">
              <DollarSign className="w-4 h-4 text-brand-green" />
              <span className="text-sm text-foreground/70 font-medium">Simple, transparent pricing</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-balance">
              Simple. Transparent.{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)",
                }}
              >
                Buyer-Aligned.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto text-pretty">
              Two simple plans. A {PRICING_DISPLAY.depositAmount} Serious Buyer Deposit to start your auction. No hidden costs, no surprises.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING CARDS — FREE + PREMIUM                              */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Deposit callout */}
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brand-cyan/20 bg-brand-cyan/5">
                <Shield className="w-4 h-4 text-brand-cyan" />
                <span className="text-sm text-foreground/80 font-medium">
                  {PRICING_DISPLAY.depositAmount} Serious Buyer Deposit required to start your auction — credited toward your plan
                </span>
              </div>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8">
            {/* FREE plan */}
            <SlideIn from="left">
              <div className="relative h-full bg-background border border-border rounded-2xl p-8 hover:border-brand-green/30 hover:shadow-lg transition-all duration-300 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{freePlan.label}</h3>
                  <p className="text-muted-foreground">{freePlan.tagline}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-foreground">{freePlan.priceLabel}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {PRICING_DISPLAY.depositAmount} deposit credited toward your vehicle purchase at closing
                  </p>
                </div>

                <ul className="flex flex-col gap-3.5 mb-8 flex-grow">
                  {freePlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-brand-green" />
                      </div>
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={freePlan.ctaHref}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-green), var(--brand-cyan))",
                  }}
                >
                  {freePlan.cta}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </SlideIn>

            {/* PREMIUM plan */}
            <SlideIn from="right">
              <div className="relative h-full rounded-2xl p-8 border-2 border-brand-purple/25 bg-surface-elevated shadow-[0_4px_24px_rgba(45,27,105,0.08)] hover:shadow-[0_8px_40px_rgba(45,27,105,0.12)] transition-all duration-300 overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, var(--brand-purple), transparent)" }} />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent)" }} />

                <div className="relative flex flex-col flex-grow">
                  <div className="mb-6">
                    {premiumPlan.badge && (
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold mb-4 bg-brand-purple/10 text-brand-purple">
                        {premiumPlan.badge}
                      </span>
                    )}
                    <h3 className="text-2xl font-bold text-foreground mb-2">{premiumPlan.label}</h3>
                    <p className="text-muted-foreground">{premiumPlan.tagline}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-foreground">{premiumPlan.priceLabel}</span>
                      <span className="text-muted-foreground">concierge fee</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {PRICING_DISPLAY.depositAmount} deposit credited toward fee — {PRICING_DISPLAY.premiumFeeRemaining} remaining
                    </p>
                  </div>

                  <ul className="flex flex-col gap-3.5 mb-8 flex-grow">
                    {premiumPlan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-brand-purple" />
                        </div>
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={premiumPlan.ctaHref}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                    }}
                  >
                    {premiumPlan.cta}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  WHAT PREMIUM ACTUALLY INCLUDES                               */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                What Premium Actually Includes
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {premiumPlan.valueProposition}
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Users, title: "Dedicated Buying Specialist", desc: "A dedicated specialist works with you through the entire buying process, from vehicle search to closing." },
              { icon: FileSearch, title: "Deal & Contract Review", desc: "We review the deal structure and contract details before you sign, flagging issues so they can be resolved." },
              { icon: DollarSign, title: "Financing Guidance", desc: "We help you find the right loan options and structure a financing workflow designed to reduce unnecessary credit inquiries." },
              { icon: Truck, title: "Free Home Delivery", desc: premiumPlan.deliveryText ?? "Your vehicle can be delivered directly to your home at no additional delivery charge." },
              { icon: Shield, title: "Priority Dealer Handling", desc: "Your request is prioritized across our dealer network so you get faster, more competitive responses." },
              { icon: Star, title: "End-to-End Coordination", desc: "From vehicle sourcing and offer negotiation to closing coordination — we handle the full process with you." },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="flex items-start gap-4 p-6 rounded-xl bg-surface-elevated border border-border hover:border-brand-purple/20 transition-colors duration-200">
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "color-mix(in oklch, var(--brand-purple) 10%, transparent)" }}>
                    <item.icon className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {premiumPlan.disclosureText && (
            <FadeIn delay={0.2}>
              <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed max-w-2xl mx-auto">
                {premiumPlan.disclosureText}
              </p>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DEPOSIT EXPLANATION                                         */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                Why the {PRICING_DISPLAY.depositAmount} Serious Buyer Deposit Is Required
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The {PRICING_DISPLAY.depositAmount} deposit is due before the auction begins. It starts the process, confirms serious buyer intent, and helps ensure dealers are participating in a real, high-quality auction.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-8">
            <StaggerItem>
              <div className="h-full bg-background border border-border rounded-2xl p-8 hover:border-brand-green/30 hover:shadow-lg transition-all duration-300">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "color-mix(in oklch, var(--brand-green) 10%, transparent)" }}
                >
                  <DollarSign className="w-6 h-6 text-brand-green" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Required to Start the Auction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The {PRICING_DISPLAY.depositAmount} Serious Buyer Deposit must be paid before your vehicle request is released to dealers. This activates the auction and allows dealers to begin submitting live offers.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="h-full bg-background border border-border rounded-2xl p-8 hover:border-brand-cyan/30 hover:shadow-lg transition-all duration-300">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "color-mix(in oklch, var(--brand-cyan) 10%, transparent)" }}
                >
                  <Shield className="w-6 h-6 text-brand-cyan" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Confirms a Serious Buyer</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The deposit helps verify that the buyer is genuinely ready to move forward. Dealers need confidence that they are bidding for a serious buyer, not a casual inquiry.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="h-full bg-background border border-border rounded-2xl p-8 hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "color-mix(in oklch, var(--brand-blue) 10%, transparent)" }}
                >
                  <Users className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Creates a Serious Auction Environment</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Requiring the deposit upfront helps filter out low-intent or non-committed submissions. This protects auction quality and helps keep dealer participation strong and meaningful.
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW WE GET PAID                                             */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">How We Get Paid</h2>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-surface-elevated rounded-2xl p-8 md:p-12 border border-border">
              <p className="text-lg text-foreground/80 leading-relaxed">
                AutoLenis offers a Free plan at no cost and a Premium full-service concierge plan for a flat {PRICING_DISPLAY.premiumFee} fee.
                Premium covers the entire buying process — from vehicle search and financing guidance to contract review and free home delivery.
                We may charge dealers platform access fees (subscription or participation-based).
                Our buyer-paid model keeps our incentives aligned with yours — helping you get the best deal possible.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12 text-foreground">
              Pricing FAQs
            </h2>
          </FadeIn>

          <StaggerContainer className="flex flex-col gap-5" stagger={0.08}>
            {[
              {
                q: `What is the ${PRICING_DISPLAY.depositAmount} Serious Buyer Deposit?`,
                a: `The ${PRICING_DISPLAY.depositAmount} Serious Buyer Deposit is required to start your auction. It verifies your intent and ensures all participants are serious. On the Free plan, it's credited toward your vehicle purchase at closing. On the Premium plan, it's credited toward your ${PRICING_DISPLAY.premiumFee} concierge fee (${PRICING_DISPLAY.premiumFeeRemaining} remaining). It's refundable if you don't receive any offers or cancel before selecting a winner.`,
              },
              {
                q: "What is the difference between Free and Premium?",
                a: `Both plans give you access to our reverse auction, best price engine, Contract Shield, and more. The Premium plan (${PRICING_DISPLAY.premiumFee} concierge fee) is our full end-to-end white-glove buying service — it includes a dedicated buying specialist, financing assistance to help find the right loan options, a smarter financing process designed to reduce unnecessary inquiries, deal and contract review, closing coordination, free home delivery, and priority support.`,
              },
              {
                q: "Are there any other fees?",
                a: "The concierge fee (Premium only) is the only cost you pay to AutoLenis. Standard dealer fees (DMV, taxes, etc.) still apply as they would with any car purchase, but we help you verify they're legitimate.",
              },
              {
                q: "How is this different from traditional car buying?",
                a: "Traditional dealerships build their profit into the vehicle price. AutoLenis separates our service fee, creating transparency and letting dealers compete on the actual car price — resulting in average savings of $2,500.",
              },
              {
                q: "Can I get a refund on my deposit?",
                a: `The ${PRICING_DISPLAY.depositAmount} deposit is refundable if you don't receive offers or if you cancel before selecting a winning deal. Once a winner is selected, the deposit is applied per your plan. The concierge fee (Premium) is charged only after you've chosen a deal.`,
              },
              {
                q: "Can I upgrade from Free to Premium?",
                a: `Yes. You can upgrade to Premium before or after paying your deposit. If you've already paid your deposit on the Free plan, it will be converted to a fee credit toward your ${PRICING_DISPLAY.premiumFee} concierge fee.`,
              },
            ].map((faq) => (
              <StaggerItem key={faq.q}>
                <div className="bg-background rounded-xl p-6 border border-border hover:border-brand-purple/15 transition-colors duration-200">
                  <h3 className="font-bold text-lg mb-2 text-foreground">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section
        className="relative py-20 sm:py-24 md:py-32 overflow-hidden"
        style={{
          background: "linear-gradient(175deg, var(--cta-start) 0%, var(--cta-end) 100%)",
        }}
      >
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, oklch(0.85 0.10 162), transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="flex flex-col items-center gap-8">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
                Save Thousands on Your Next Car
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Our transparent pricing means you keep more money in your pocket — an average of $2,500 more.
              </p>
              <Link
                href="/buyer/onboarding"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-[0_4px_16px_rgba(45,27,105,0.15)]"
                style={{
                  background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
                }}
              >
                Get Pre-Qualified Now
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/pricing" />

      <PublicFooter />
    </div>
  )
}
