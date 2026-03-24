"use client"

import Link from "next/link"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import {
  ArrowRight,
  Shield,
  CheckCircle2,
  XCircle,
  Check,
  Lock,
  Car,
  Users,
  Sparkles,
  AlertTriangle,
  FileCheck,
  BarChart3,
  Zap,
  Target,
  Clock,
  Star,
  Eye,
  ShieldCheck,
  FileText,
  CalendarCheck,
  UserCheck,
  Building2,
  Network,
  Settings,
} from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { QualificationEstimateStrip } from "@/components/calculator/qualification-estimate-strip"
import ChatWidget from "@/components/ai/chat-widget"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  SlideIn,
} from "@/components/ui/motion"
import { HeroDeviceRotator } from "@/components/hero/hero-device-rotator"

/* ------------------------------------------------------------------ */
/*  Testimonial data                                                   */
/* ------------------------------------------------------------------ */
const testimonials = [
  { quote: "I saved over $3,200 compared to what the dealership originally quoted me. The whole process took less than a week.", name: "Marcus T.", role: "First-Time Buyer, Dallas" },
  { quote: "AutoLenis handled everything. I just picked the best offer and showed up to sign. No back-and-forth, no pressure.", name: "Sarah K.", role: "Returning Customer, Houston" },
  { quote: "My credit wasn't great, but they still found me real options. Nobody tried to hide anything from me.", name: "David R.", role: "Credit Recovery, Austin" },
  { quote: "The Contract Shield caught a $1,800 warranty add-on I didn't ask for. That alone was worth it.", name: "Jennifer L.", role: "Lease Transition, San Antonio" },
  { quote: "As a dealer, the leads we get through AutoLenis are pre-qualified and serious. It saves us time and closes faster.", name: "Mike P.", role: "Dealer Partner, Fort Worth" },
  { quote: "I recommended it to three friends. Two of them already bought cars through AutoLenis. The referral program is a nice bonus.", name: "Tanya W.", role: "Affiliate Partner, Plano" },
  { quote: "Having everything side by side -- rates, payments, total cost -- made the decision so much easier.", name: "Chris H.", role: "Repeat Buyer, Arlington" },
  { quote: "I was skeptical about doing this online, but the AI concierge walked me through every step clearly.", name: "Angela M.", role: "First-Time Buyer, El Paso" },
]

/* ------------------------------------------------------------------ */
/*  Marquee component (CSS-only infinite scroll)                       */
/* ------------------------------------------------------------------ */
function TestimonialMarquee({ items, direction = "left" }: { items: typeof testimonials; direction?: "left" | "right" }) {
  const doubled = [...items, ...items]
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className={`flex gap-6 shrink-0 ${direction === "left" ? "animate-[marquee-left_60s_linear_infinite]" : "animate-[marquee-right_60s_linear_infinite]"}`}
      >
        {doubled.map((t, i) => (
          <div
            key={i}
            className="w-[360px] shrink-0 rounded-2xl border border-border bg-background p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, si) => (
                <Star key={si} className="w-3.5 h-3.5 fill-brand-purple text-brand-purple" />
              ))}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed flex-1">{`"${t.quote}"`}</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-purple">{t.name[0]}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Homepage                                                          */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ============================================================ */}
      {/*  1. HERO — Premium Automotive Concierge                      */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse at center, var(--brand-purple), transparent 70%)" }}
        />
        {/* Dot pattern for visual depth */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.25 }} />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16 pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-16 sm:pb-20 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 xl:gap-28 items-center">
            {/* ---- Left Column: Copy ---- */}
            <div className="flex flex-col text-center lg:text-left">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/12 bg-brand-purple/[0.04] mb-8 mx-auto lg:mx-0 self-center lg:self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">AI-Powered Car Buying Concierge</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.75rem] xl:text-[4.25rem] font-bold leading-[1.06] tracking-tight text-foreground text-balance mb-6">
                  AutoLenis — Car Buying,{" "}
                  <span className="text-brand-purple">Reengineered.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed text-balance mb-8">
                  Skip the dealership back-and-forth. Get pre-qualified, submit a vehicle request,
                  and receive verified out-the-door offers from competing dealers — all inside one
                  guided digital workflow designed for transparency and buyer control.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                  <Link
                    href="/buyer/onboarding"
                    className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base text-primary-foreground transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_6px_24px_rgba(45,27,105,0.18)]"
                    style={{ background: "var(--brand-purple)" }}
                  >
                    Get Pre-Qualified
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors duration-200"
                  >
                    See How It Works
                  </Link>
                </div>
              </FadeIn>

              {/* Live preview mockup -- mobile / tablet only */}
              <div className="block lg:hidden mb-10">
                <FadeIn delay={0.45}>
                  <div className="flex flex-col items-center gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-green/8 border border-brand-green/12">
                      <Sparkles className="w-3.5 h-3.5 text-brand-green" />
                      <span className="text-xs font-semibold text-brand-green tracking-wide">Live Preview</span>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-foreground text-balance">
                      Your Buyer Console — Every Offer, One Dashboard
                    </p>
                  </div>
                  <HeroDeviceRotator variant="mobile" />
                </FadeIn>
              </div>

              {/* Value bullets */}
              <FadeIn delay={0.5}>
                <div className="flex flex-col gap-3.5 text-left max-w-md mx-auto lg:mx-0 mb-10">
                  {[
                    "Get pre-qualified without affecting your credit score",
                    "Receive verified out-the-door offers from competing dealers",
                    "Compare pricing, terms, and total costs side by side",
                    "Complete your purchase digitally — from pre-qualification to pickup",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10">
                        <Check className="h-3 w-3 text-brand-green" />
                      </div>
                      <span className="text-sm text-foreground/80 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Trust stats row */}
              <FadeIn delay={0.55}>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4">
                  {[
                    { value: 2400, suffix: "+", label: "Buyers Served" },
                    { value: 3.2, suffix: "K", label: "Avg. Saved", prefix: "$", decimals: 1 },
                    { value: 98, suffix: "%", label: "Satisfaction" },
                    { value: 150, suffix: "+", label: "Dealer Partners" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center lg:text-left">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* ---- Right Column: Buyer Console (desktop) ---- */}
            <div className="hidden lg:flex flex-col gap-4">
              <SlideIn from="right" delay={0.3}>
                <div className="flex flex-col gap-3 mb-2">
                  <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-brand-green/8 border border-brand-green/12">
                    <Sparkles className="w-3.5 h-3.5 text-brand-green" />
                    <span className="text-xs font-semibold text-brand-green tracking-wide">Live Preview</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance leading-[1.12]">
                    Your Buyer Console — Every Offer, One Dashboard
                  </h2>
                </div>
                <HeroDeviceRotator variant="desktop" />
              </SlideIn>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  2. WHY AUTOLENIS EXISTS — Problem / Solution                */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Why AutoLenis Exists</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              The Traditional Car-Buying Process Is Broken
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-6 leading-relaxed">
              The average buyer spends 12+ hours navigating a fragmented, pressure-driven process —
              bouncing between dealerships, enduring repeated negotiations, sitting through finance
              office upsells, and leaving unsure whether the final price was fair.
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
              AutoLenis was built as the modern alternative — a guided digital workflow that puts buyers
              in control, brings dealers to compete for your business, and replaces confusion with
              clarity at every step.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8">
            <SlideIn from="left">
              <div className="h-full bg-background border border-border rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-xl bg-destructive/8 border border-destructive/15 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground">Traditional Dealership Process</h3>
                </div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-8 pl-[calc(2.5rem+0.75rem)]">
                  What Buyers Experience Today
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    "Hours spent driving from dealer to dealer",
                    "Endless back-and-forth negotiation and haggling",
                    "Unclear pricing with hidden fees and add-ons",
                    "Finance office pressure to commit on the spot",
                    "Uncertainty around interest rates and terms",
                    "Signing paperwork you don't fully understand",
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-destructive/5 flex items-center justify-center mt-0.5">
                        <XCircle className="w-3.5 h-3.5 text-destructive/60" />
                      </div>
                      <span className="text-foreground/80 text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>

            <SlideIn from="right">
              <div className="h-full bg-background border border-border rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-xl bg-brand-green/8 border border-brand-green/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-brand-green" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-foreground">The AutoLenis Concierge</h3>
                </div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-8 pl-[calc(2.5rem+0.75rem)]">
                  A Guided, Transparent Digital Workflow
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    "Submit one vehicle request — dealers come to you",
                    "Verified out-the-door pricing with no hidden costs",
                    "Real lender terms presented clearly upfront",
                    "Side-by-side deal comparisons in your buyer console",
                    "Digital document flow — review at your own pace",
                    "Guided purchase management from start to finish",
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-green/8 flex items-center justify-center mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                      </div>
                      <span className="text-foreground/80 text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. HOW AUTOLENIS WORKS — 6-Step Process                     */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">How AutoLenis Works</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              Your Guided Vehicle-Buying Journey
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
              AutoLenis manages your entire purchase process through a structured digital workflow —
              from initial pre-qualification through vehicle pickup. Every step is designed for
              transparency, efficiency, and buyer control.
            </p>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" stagger={0.08}>
            {[
              { num: "01", icon: UserCheck, title: "Get Pre-Qualified", desc: "Complete a quick application with a soft credit check that does not affect your score. Understand your real buying power and budget range before shopping." },
              { num: "02", icon: FileText, title: "Submit Your Vehicle Request", desc: "Tell us what you're looking for — make, model, features, and budget. Instead of chasing dealerships, let qualified dealers come to you." },
              { num: "03", icon: Eye, title: "Receive Verified Out-the-Door Offers", desc: "Competing dealers submit verified offers with complete out-the-door pricing — including taxes, fees, and all costs. No hidden charges." },
              { num: "04", icon: BarChart3, title: "Compare and Choose With Confidence", desc: "Review every offer side by side in your buyer console. Compare rates, payments, terms, and total costs. Take your time — no pressure." },
              { num: "05", icon: FileCheck, title: "Complete Documents Digitally", desc: "Review and sign your paperwork through a guided digital document flow. Contract Shield flags anything that needs a closer look." },
              { num: "06", icon: CalendarCheck, title: "Schedule Pickup and Finish", desc: "Coordinate with your chosen dealer, finalize delivery details, and complete your purchase — faster and with fewer surprises." },
            ].map((step) => (
              <StaggerItem key={step.num}>
                <div className="group h-full bg-surface-elevated rounded-2xl border border-border p-6 md:p-8 transition-all duration-300 hover:shadow-md hover:border-brand-purple/15 hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl font-bold text-brand-purple/20 tabular-nums">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/6 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-brand-purple" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.5}>
            <div className="flex justify-center mt-14">
              <Link
                href="/buyer/onboarding"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-primary-foreground font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_6px_24px_rgba(45,27,105,0.18)]"
                style={{ background: "var(--brand-purple)" }}
              >
                Start Your Vehicle Request
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  QUALIFICATION CALCULATOR                                    */}
      {/* ============================================================ */}
      <FadeIn>
        <QualificationEstimateStrip />
      </FadeIn>

      {/* ============================================================ */}
      {/*  4. VALUE PROPOSITION — Key Advantages                       */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Why Buyers Choose AutoLenis</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              A Cleaner, Faster, More Transparent Purchase Experience
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
              AutoLenis is not a listing site or a lead-generation tool. It is a premium concierge platform
              that manages your entire vehicle-buying journey — from pre-qualification through pickup — with
              the tools, protections, and transparency you need to make a confident decision.
            </p>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" stagger={0.08}>
            {[
              { icon: Eye, title: "Transparent Out-the-Door Pricing", desc: "Every offer includes the full cost — taxes, fees, and charges. You see the real price before you commit." },
              { icon: Shield, title: "Reduced Dealership Pressure", desc: "No in-person negotiations. No finance office upsells. Review offers at your own pace in a controlled digital environment." },
              { icon: Zap, title: "Smarter Buyer Control", desc: "You set the terms. Dealers compete for your business by submitting verified offers to your buyer console." },
              { icon: Clock, title: "Significant Time Savings", desc: "Replace hours of dealership visits with a streamlined digital process. Most buyers receive offers within days of submitting a request." },
              { icon: Target, title: "Guided Purchase Management", desc: "From pre-qualification to document signing and delivery coordination, every step is managed through one connected platform." },
              { icon: Lock, title: "Connected Digital Workflow", desc: "Insurance options, digital document flow, contract review, and closing coordination — all integrated into your buyer journey." },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="group h-full bg-surface-elevated rounded-2xl border border-border p-6 md:p-8 transition-all duration-300 hover:shadow-md hover:border-brand-purple/12 hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-purple/6 flex items-center justify-center mb-5">
                    <item.icon className="w-5 h-5 text-brand-purple" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. TRUST / PROTECTION — Why Trust AutoLenis                 */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-green uppercase tracking-[0.15em] mb-4 text-center">Trust and Protection</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              Built for Confidence at Every Step
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
              AutoLenis is designed as a compliance-conscious, systemized platform where every element
              of the buying process — from pricing verification to contract review — is structured to
              reduce mistakes, prevent surprises, and give buyers the clarity they need.
            </p>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <FadeIn direction="right">
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full bg-brand-purple/6 border border-brand-purple/12">
                  <Shield className="w-4 h-4 text-brand-purple" />
                  <span className="text-sm font-semibold text-brand-purple">Contract Shield</span>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                  Know What {"You're"} Signing Before You Sign
                </h3>

                <p className="text-muted-foreground leading-relaxed">
                  Automotive contracts can be complex. Contract Shield scans your documents and highlights
                  items that deserve a closer look — unexpected fees, warranty add-ons, or terms that could
                  affect your total cost.
                </p>

                <ul className="flex flex-col gap-4">
                  {[
                    "Flags hidden fees and undisclosed add-ons",
                    "Explains key terms in plain, clear language",
                    "Identifies items worth discussing before signing",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Check className="w-4 h-4 text-brand-green" />
                      </div>
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contract-shield"
                  className="group inline-flex items-center gap-2 self-start text-brand-purple font-semibold hover:underline text-sm"
                >
                  Learn more about Contract Shield
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={0.2}>
              <div className="flex flex-col gap-6">
                <div className="bg-background rounded-2xl shadow-sm p-6 md:p-8 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-green/8 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Why Buyers Trust AutoLenis</div>
                      <div className="text-sm text-muted-foreground">Platform protections</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {[
                      { label: "Guided process", desc: "Every step is structured and managed — you always know what happens next." },
                      { label: "Verified pricing structure", desc: "Out-the-door offers include all costs. The price you see is the price you evaluate." },
                      { label: "Professional digital workflow", desc: "Documents, communications, and decisions flow through a secure, organized platform." },
                      { label: "Premium experience", desc: "Designed to reduce uncertainty and help you make informed, confident decisions." },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-brand-green/[0.04] border border-brand-green/12">
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="w-4 h-4 text-brand-green" />
                          <span className="font-medium text-foreground text-sm">{item.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. AUDIENCE CLARITY — Who AutoLenis Serves                  */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">One Connected Platform</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              Built for Every Side of the Transaction
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-20 leading-relaxed">
              AutoLenis connects buyers, dealers, affiliates, and platform administrators inside one
              high-performance ecosystem — creating a more structured, qualified, and efficient
              vehicle-buying experience for everyone involved.
            </p>
          </FadeIn>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" stagger={0.08}>
            {[
              { icon: Users, title: "Buyers", desc: "Get pre-qualified, submit a vehicle request, receive verified offers, and complete your purchase through a guided concierge workflow.", color: "text-brand-purple", bg: "bg-brand-purple/6", link: "/how-it-works", linkText: "How It Works" },
              { icon: Building2, title: "Dealers", desc: "Access pre-qualified, ready-to-buy leads through a structured process. Submit competitive offers to serious buyers — no tire-kickers.", color: "text-brand-green", bg: "bg-brand-green/6", link: "/dealer-application", linkText: "Apply as a Dealer" },
              { icon: Network, title: "Affiliates", desc: "Refer buyers into the AutoLenis ecosystem and earn commissions when they complete a purchase. Share your link — get paid when it works.", color: "text-brand-cyan", bg: "bg-brand-cyan/6", link: "/affiliate", linkText: "Partner Program" },
              { icon: Settings, title: "Admins", desc: "Manage platform operations, oversee deal flow, monitor compliance, and maintain the infrastructure that powers the entire ecosystem.", color: "text-brand-blue", bg: "bg-brand-blue/6", link: "/about", linkText: "About AutoLenis" },
            ].map((role) => (
              <StaggerItem key={role.title}>
                <div className="group h-full bg-surface-elevated rounded-2xl border border-border p-6 md:p-8 transition-all duration-300 hover:shadow-md hover:border-brand-purple/12 hover:-translate-y-0.5 flex flex-col">
                  <div className={`w-12 h-12 rounded-xl ${role.bg} flex items-center justify-center mb-6`}>
                    <role.icon className={`w-6 h-6 ${role.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{role.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">{role.desc}</p>
                  <div className="pt-5 border-t border-border">
                    <Link href={role.link} className={`group/link inline-flex items-center gap-1.5 text-sm font-semibold ${role.color} hover:underline`}>
                      {role.linkText}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS MARQUEE                                        */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-surface-elevated overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-14">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Real Results</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-5 text-foreground text-balance">
              Trusted by Buyers, Dealers, and Partners
            </h2>
          </FadeIn>
        </div>

        <div className="flex flex-col gap-6">
          <TestimonialMarquee items={testimonials.slice(0, 4)} direction="left" />
          <TestimonialMarquee items={testimonials.slice(4)} direction="right" />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-[0.15em] mb-4 text-center">Common Questions</p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-14 text-foreground">What Buyers Want to Know</h2>
          </FadeIn>

          <StaggerContainer className="flex flex-col gap-5" stagger={0.08}>
            {[
              { q: "Is AutoLenis a lender or a dealer?", a: "Neither. AutoLenis is an informational concierge platform that connects you with lenders and dealers. They handle financing and sell the vehicle — we provide the tools and guided workflow to help you compare and decide with confidence." },
              { q: "Does this hurt my credit score?", a: "The initial check is a soft inquiry, which does not affect your score. If you move forward with a specific lender, they may perform a hard pull as part of their standard process." },
              { q: "How does AutoLenis get paid?", a: "AutoLenis offers a Free plan and a Premium end-to-end concierge plan for a flat $499 fee. Premium includes the full buying process — dedicated specialist, financing guidance, contract review, closing coordination, and free home delivery. A $99 Serious Buyer Deposit is required to start your auction. On the Free plan, the deposit is credited toward your vehicle purchase at closing. On the Premium plan, it's credited toward the $499 fee. We may charge dealers platform access fees — our buyer-paid model keeps our incentives aligned with yours." },
              { q: "What if my credit score is lower than expected?", a: "We work with lenders across the credit spectrum. You may not qualify for the lowest rates, but we will show you what is actually available — no misleading promises." },
              { q: "How long does the process take?", a: "The application takes about five minutes. Verified offers typically arrive within one to two business days. How quickly you close depends on your timeline and the dealer." },
              { q: "What makes AutoLenis different from car listing sites?", a: "AutoLenis is not a listing site. We manage a guided transaction journey — from pre-qualification through pickup — with verified pricing, digital document flow, and concierge-level support throughout." },
            ].map((faq) => (
              <StaggerItem key={faq.q}>
                <div className="bg-surface-elevated rounded-2xl p-6 border border-border hover:border-brand-purple/12 transition-colors duration-200">
                  <h3 className="font-bold text-lg mb-2 text-foreground">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. FINAL CTA — Premium Conversion                          */}
      {/* ============================================================ */}
      <section className="relative py-24 sm:py-28 md:py-32 overflow-hidden" style={{ background: "var(--brand-purple)" }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground text-balance mb-6">
              Ready to Buy Your Next Vehicle the Smarter Way?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-xl mx-auto mb-12">
              Get pre-qualified, submit a vehicle request, and let competing dealers bring verified
              offers to you. No dealership games. No hidden fees. Just clarity and control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/buyer/onboarding"
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base text-foreground bg-background transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Get Pre-Qualified Now
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-primary-foreground/20 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors duration-200"
              >
                Learn How the Process Works
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/" />

      <PublicFooter />
      <ChatWidget />
    </div>
  )
}
