"use client"

import Link from "next/link"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import {
  ArrowRight,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Car,
  Calculator,
  Link2,
  Shield,
  Users,
  Briefcase,
  Heart,
} from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { FadeIn, StaggerContainer, StaggerItem, SlideIn, ScaleIn } from "@/components/ui/motion"

export default function AffiliateProgramPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(circle, var(--brand-green), transparent 70%)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border border-brand-green/15 bg-brand-green/5">
                  <DollarSign className="w-4 h-4 text-brand-green" />
                  <span className="text-sm text-muted-foreground font-medium">Referral Program</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                  Share AutoLenis,{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)" }}>
                    Get Paid
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-xl leading-relaxed">
                  Know someone looking for a car? Send them our way. When they buy through AutoLenis, you earn a referral
                  fee. No selling, no recruiting, just sharing a link.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/auth/signup?role=affiliate"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Get Your Link
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/affiliate/income"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                  >
                    <Calculator className="w-5 h-5" />
                    See the Math
                  </Link>
                </div>
              </FadeIn>
            </div>

            <SlideIn from="right" delay={0.2}>
              <div className="relative">
                <div className="bg-background rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(45,27,105,0.08)] p-6 md:p-8 border border-border flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold text-xl">The Deal</span>
                    <span className="px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-sm font-semibold">Free</span>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {["Get a personal referral link", "Share it with people who need cars", "Earn 15% when they buy", "Link never expires"].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-muted-foreground">
                        <CheckCircle className="w-5 h-5 text-brand-green shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-1">When someone uses your link and buys a car:</div>
                    <div className="text-3xl font-bold text-brand-purple">You Get 15%</div>
                  </div>

                  <Link
                    href="/affiliate/income"
                    className="block w-full py-3.5 rounded-xl text-primary-foreground font-semibold text-lg text-center hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    See Full Details
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { val: "15%", label: "Your Cut" },
                    { val: "Free", label: "To Join" },
                    { val: "\u221E", label: "Link Life" },
                  ].map((stat, i) => (
                    <ScaleIn key={i} delay={0.5 + i * 0.1}>
                      <div className="rounded-xl p-3 sm:p-4 text-center border border-border bg-background shadow-sm">
                        <div className="text-lg sm:text-xl font-bold text-brand-purple">{stat.val}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    </ScaleIn>
                  ))}
                </div>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Not MLM Clarification */}
      <section className="py-12 md:py-14 bg-brand-green/5 border-y border-brand-green/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-4xl mx-auto text-center flex flex-col gap-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">This is Not MLM</h2>
              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                Let&apos;s be clear: you don&apos;t recruit people to sell anything. You don&apos;t build a team. You don&apos;t have quotas
                or meetings. You just share a link. When someone uses it to buy a car, you get paid. That&apos;s the whole
                thing.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Three steps. That&apos;s it.</p>
            </div>
          </FadeIn>

          <StaggerContainer className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              { num: "1", color: "brand-green", title: "Sign Up", desc: "Create a free account and get your personal referral link. Takes 2 minutes." },
              { num: "2", color: "brand-cyan", title: "Share Your Link", desc: "Send it to friends, family, coworkers--anyone you know who's looking for a car." },
              { num: "3", color: "brand-blue", title: "Get Paid", desc: "When they complete a purchase through AutoLenis, you earn a referral fee." },
            ].map((step) => (
              <StaggerItem key={step.num}>
                <div className="text-center flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-${step.color}/10 flex items-center justify-center`}>
                    <span className={`text-2xl font-bold text-${step.color}`}>{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Compensation */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What You Earn</h2>
              <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
                You get 15% of our fee when someone you referred buys a car. Plus, if that person refers someone else who
                buys, you get a smaller bonus from those purchases too -- up to 3 levels deep.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/15 mb-8">
              <h3 className="text-xl font-bold mb-6 text-center text-white">The Breakdown</h3>

              <div className="flex flex-col gap-6">
                {[
                  { num: "1", color: "var(--brand-green)", pct: "15%", title: "Someone you referred buys a car", desc: "You shared your link, they used it, they bought a car. You get 15% of our fee." },
                  { num: "2", color: "var(--brand-cyan)", pct: "3%", title: "Their referral buys a car", desc: "The person you referred gets their own link. When their friend buys, you get a 3% bonus." },
                  { num: "3", color: "var(--brand-blue)", pct: "2%", title: "One more level out", desc: "This goes one more step. If that person's referral buys, you get 2%." },
                ].map((tier) => (
                  <div key={tier.num} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: tier.color }}>
                      <span className="font-bold text-white">{tier.num}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg text-white">{tier.title}</p>
                        <span className="font-bold text-xl" style={{ color: tier.color }}>{tier.pct}</span>
                      </div>
                      <p className="text-white/60 leading-relaxed">{tier.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="font-bold mb-3 flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-brand-green" />
                Quick Rules
              </h4>
              <ul className="flex flex-col gap-2 text-white/70 text-sm">
                {[
                  "You get paid when the car purchase actually closes--not just when someone applies.",
                  "Don't make stuff up about what AutoLenis can do. Be honest when you share.",
                  "Only refer real people who actually want to buy cars. Not bots. Not fake leads.",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <span className="text-brand-green">&#8226;</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <FadeIn>
            <div className="text-center mt-12">
              <Link
                href="/affiliate/income"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
              >
                See Examples & Calculator
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Who Does This Work For?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Basically anyone who knows people who buy cars. Here are some examples.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Users, color: "brand-green", title: "Financial Advisors", desc: "Your clients ask you about big purchases anyway. Now you can point them somewhere good." },
              { icon: Briefcase, color: "brand-cyan", title: "HR & Office Managers", desc: "New hires, relocating employees--people at work ask about cars. You can help." },
              { icon: Heart, color: "brand-blue", title: "Community Leaders", desc: "Church groups, local organizations--when someone needs a car, you can share a resource." },
              { icon: TrendingUp, color: "brand-purple", title: "Anyone, Really", desc: "If you know people who buy cars and you want to help them out, this works." },
            ].map((persona) => (
              <StaggerItem key={persona.title}>
                <div className="bg-surface-elevated rounded-2xl p-8 border border-border text-center hover:shadow-md transition-shadow">
                  <div className={`w-16 h-16 rounded-2xl bg-${persona.color}/10 flex items-center justify-center mb-6 mx-auto`}>
                    <persona.icon className={`w-8 h-8 text-${persona.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{persona.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{persona.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Two Ways to Join */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Two Ways to Get Started</h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <FadeIn delay={0.1}>
              <div className="bg-background rounded-2xl p-8 border-2 border-brand-green/15">
                <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-6 mx-auto">
                  <Car className="w-8 h-8 text-brand-green" />
                </div>
                <div className="inline-flex px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-sm font-semibold mb-4">
                  Buying a Car?
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">You Get a Link Automatically</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  When you buy a car through AutoLenis, you automatically get your own referral link. Share it with others
                  and earn when they buy too.
                </p>
                <Link
                  href="/buyer/onboarding"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-primary-foreground font-semibold w-full transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--brand-green), var(--brand-cyan))" }}
                >
                  Start Shopping for a Car
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="bg-background rounded-2xl p-8 border-2 border-brand-cyan/15">
                <div className="w-16 h-16 rounded-2xl bg-brand-cyan/10 flex items-center justify-center mb-6 mx-auto">
                  <Link2 className="w-8 h-8 text-brand-cyan" />
                </div>
                <div className="inline-flex px-3 py-1 rounded-full bg-brand-cyan/10 text-brand-cyan text-sm font-semibold mb-4">
                  Not Buying Right Now?
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Sign Up Directly</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  You don&apos;t need to buy a car to participate. Just sign up, get your link, and start sharing. It&apos;s free.
                </p>
                <Link
                  href="/auth/signup?role=affiliate"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-primary-foreground font-semibold w-full transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                >
                  Get Your Referral Link
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">Questions</h2>
            </FadeIn>

            <StaggerContainer className="flex flex-col gap-5">
              {[
                { q: "Is this multi-level marketing?", a: "No. You're not recruiting people to join a sales team. You're not selling products. You just share a link, and when someone uses it to buy a car, you get paid. The \"levels\" just mean that if your referral also refers someone, you get a small bonus from that too--but you're not managing anyone or building anything." },
                { q: "When do I get paid?", a: "After the car deal closes. Not when someone clicks your link, not when they apply--when they actually buy a car and the transaction is complete." },
                { q: "Does my link expire?", a: "Nope. Your link works as long as you're in the program. Share it today, someone uses it next year--you still get paid." },
                { q: "What does \"15% of the fee\" mean?", a: "AutoLenis offers a Premium concierge plan at $499. You get 15% of that fee when someone you referred completes their purchase on the Premium plan. This is a buyer-paid model — our incentives are aligned with the buyer." },
                { q: "Do I have to buy a car myself to participate?", a: "No. You can sign up for the referral program without ever buying a car through us." },
              ].map((faq) => (
                <StaggerItem key={faq.q}>
                  <div className="bg-surface-elevated rounded-xl p-6 border border-border">
                    <h3 className="font-bold text-lg text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">Ready to Start?</h2>
              <p className="text-lg text-white/70 leading-relaxed text-pretty">
                Get your referral link in a couple minutes. It&apos;s free, and it never expires.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/auth/signup?role=affiliate"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Get Your Link
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/affiliate" />

      <PublicFooter />
    </div>
  )
}
