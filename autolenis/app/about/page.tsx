"use client"

import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import Link from "next/link"
import {
  ArrowRight,
  Shield,
  Lock,
  FileCheck,
  Users,
  Target,
  Heart,
  Building2,
  Car,
  CheckCircle,
} from "lucide-react"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.15]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-cyan), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.08]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-purple), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/15 bg-brand-purple/5 mb-6">
              <Building2 className="w-4 h-4 text-brand-purple" />
              <span className="text-sm text-muted-foreground font-medium">
                About Us
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-balance">
              We Think Car Buying{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)",
                }}
              >
                Should Be Fair
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed mb-8">
              AutoLenis started because we were tired of watching people overpay
              for cars, sign contracts they didn{"'"}t understand, or feel
              pressured into bad deals. We built something better.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <Link
              href="/how-it-works"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))",
              }}
            >
              See How It Works
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="flex flex-col gap-6">
                <span className="inline-flex w-fit px-4 py-1.5 rounded-full text-sm font-medium bg-brand-purple/8 text-brand-purple uppercase tracking-[0.1em]">
                  What We Actually Do
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  The Short Version
                </h2>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
                  <p>
                    You tell us you want to buy a car. We assess your
                    shopping readiness and connect you with dealers who can help.
                    They send back real offers. You compare them and pick what
                    works.
                  </p>
                  <p>
                    That{"'"}s it. We{"'"}re the middleman that helps you see
                    more options without visiting 10 dealerships.
                  </p>
                  <p>
                    The dealers have the cars and handle the sale. We just
                    make the connection easier and more transparent.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn direction="left" delay={0.2}>
              <div className="rounded-2xl p-8 border border-border bg-surface-elevated">
                <h3 className="text-xl font-bold text-foreground mb-6">
                  Let{"'"}s Be Clear
                </h3>
                <div className="flex flex-col gap-4">
                  {[
                    {
                      positive: true,
                      text: "A platform that connects buyers with dealers",
                    },
                    {
                      positive: true,
                      text: "A buyer-paid concierge platform (Free plan or Premium at $499)",
                    },
                    {
                      positive: false,
                      text: "A bank, credit union, or financing provider of any kind",
                    },
                    {
                      positive: false,
                      text: "A car dealership -- we don't own or sell cars",
                    },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      {item.positive ? (
                        <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-destructive flex items-center justify-center mt-0.5 flex-shrink-0">
                          <div className="w-2 h-0.5 bg-destructive" />
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-foreground">
                          {item.positive ? "We are:" : "We are not:"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {item.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 bg-brand-purple/8 text-brand-purple uppercase tracking-[0.1em]">
                Why We Built This
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Buying a Car Shouldn{"'"}t Feel Like a Battle
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We{"'"}ve all had that experience -- walking into a dealership
                and feeling like you{"'"}re walking into a negotiation you{"'"}
                re destined to lose. It doesn{"'"}t have to be that way.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Target,
                color: "var(--brand-green)",
                title: "Transparency",
                desc: "We show you the numbers. All of them. No hiding fees until the last minute or using confusing terms to obscure the real cost.",
              },
              {
                icon: Shield,
                color: "var(--brand-cyan)",
                title: "Protection",
                desc: "Our Contract Shield tool helps you understand what you're signing. If something looks off, you'll know before you commit.",
              },
              {
                icon: Heart,
                color: "var(--brand-purple)",
                title: "Access",
                desc: "Not everyone has perfect credit or knows how to negotiate. We give everyone the same visibility into their options.",
              },
            ].map((val) => (
              <StaggerItem key={val.title}>
                <div className="h-full bg-background rounded-2xl p-8 border border-border hover:border-brand-purple/15 hover:shadow-lg transition-all duration-300">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                    style={{
                      background: `color-mix(in oklch, ${val.color} 10%, transparent)`,
                    }}
                  >
                    <val.icon
                      className="w-7 h-7"
                      style={{ color: val.color }}
                    />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-3">
                    {val.title}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 bg-brand-green/10 text-brand-green uppercase tracking-[0.1em]">
                Your Data
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                We Take Privacy Seriously
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                You{"'"}re trusting us with personal information. Here{"'"}s how
                we handle it.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div
              className="rounded-2xl p-8 md:p-12 text-primary-foreground mb-12"
              style={{
                background:
                  "linear-gradient(155deg, var(--brand-purple) 0%, var(--brand-blue) 100%)",
              }}
            >
              <p className="text-lg leading-relaxed mb-8 text-white/85">
                We collect your info because dealers need it to give you real
                offers. We share it with the dealers you{"'"}re
                working with -- that{"'"}s the whole point. But we don{"'"}t
                sell your data to random marketing companies or spam you with
                unrelated stuff.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: Lock,
                    title: "Encrypted",
                    desc: "Your data is encrypted in transit and at rest. Industry standard stuff.",
                  },
                  {
                    icon: FileCheck,
                    title: "Consent-Based",
                    desc: "We tell you what we're doing with your info and get your okay first.",
                  },
                  {
                    icon: Shield,
                    title: "Purpose-Limited",
                    desc: "Your info goes to dealers for your car purchase. That's it.",
                  },
                  {
                    icon: Users,
                    title: "No Data Selling",
                    desc: "We make money when deals close, not by selling your contact info.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-white/70">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="rounded-2xl p-8 border border-border bg-surface-elevated">
              <h3 className="text-xl font-bold text-foreground mb-6">
                The Fine Print, Summarized
              </h3>
              <div className="flex flex-col gap-4">
                {[
                  "We're aware of regulations like FCRA and GLBA that govern how financial data should be handled. We take compliance seriously.",
                  "We work with dealers who meet our standards for treating customers fairly.",
                  "We don't make promises we can't keep -- like guaranteed approval or guaranteed savings.",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 bg-brand-cyan/10 text-brand-cyan uppercase tracking-[0.1em]">
                The Ecosystem
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                How It All Connects
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We{"'"}re in the middle, making the connection between you and
                the people who can actually get you a car.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                color: "var(--brand-green)",
                title: "You",
                desc: "You complete your prequalification and tell us what you're looking for. We show you real options from real dealers.",
              },
              {
                icon: Building2,
                color: "var(--brand-cyan)",
                title: "AutoLenis",
                desc: "We assess your shopping readiness and connect you with verified dealers. We manage the guided workflow from prequalification to pickup.",
              },
              {
                icon: Car,
                color: "var(--brand-purple)",
                title: "Dealers",
                desc: "Licensed dealerships have the cars. They handle pricing, paperwork, and getting you the keys.",
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="h-full bg-background rounded-2xl p-8 border border-border text-center hover:shadow-lg transition-shadow duration-300">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                    style={{
                      background: `color-mix(in oklch, ${item.color} 10%, transparent)`,
                    }}
                  >
                    <item.icon
                      className="w-8 h-8"
                      style={{ color: item.color }}
                    />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-3">
                    {item.title}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative py-20 sm:py-24 md:py-32 overflow-hidden"
        style={{
          background:
            "linear-gradient(155deg, var(--brand-purple) 0%, var(--brand-blue) 60%, var(--brand-cyan) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.12]"
          style={{
            background: "radial-gradient(circle, white, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="flex flex-col items-center gap-8">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground text-balance">
                Questions?
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-lg">
                We{"'"}re happy to chat. Reach out if you want to know more
                about how AutoLenis works.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/how-it-works"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-white text-brand-purple transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  See How It Works
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/about" />

      <PublicFooter />
    </div>
  )
}
