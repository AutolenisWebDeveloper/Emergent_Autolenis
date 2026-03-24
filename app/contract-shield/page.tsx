"use client"

import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import Link from "next/link"
import {
  Shield,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  Eye,
  FileText,
  HelpCircle,
  Info,
} from "lucide-react"
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn, SlideIn } from "@/components/ui/motion"

export default function ContractShieldPage() {
  const features = [
    {
      icon: FileSearch,
      title: "Automated Review",
      description:
        "Our system compares contract numbers against your accepted offer to help identify potential discrepancies worth reviewing.",
    },
    {
      icon: Eye,
      title: "Fee Comparison",
      description:
        "We compare fees against typical ranges for your area. This may help you identify items to discuss with the dealer.",
    },
    {
      icon: AlertTriangle,
      title: "Difference Flagging",
      description:
        "If we notice differences between the contract and your accepted offer, we'll highlight them for your review.",
    },
    {
      icon: HelpCircle,
      title: "Review Assistance",
      description: "Get plain-language explanations of items that may need clarification before you sign.",
    },
  ]

  const flaggedItems = [
    { name: "Documentation Fee", status: "review", amount: "$799", note: "Higher than typical for your area" },
    { name: "Paint Protection", status: "info", amount: "$1,299", note: "Optional - confirm you requested this" },
    { name: "APR", status: "success", amount: "4.9%", note: "Matches your financing offer" },
    { name: "Total Price", status: "success", amount: "$32,450", note: "Matches accepted offer" },
    { name: "Trade-in Value", status: "success", amount: "$8,500", note: "Matches agreed value" },
  ]

  const stats = [
    { value: "$1,847", label: "Average Savings Per Contract" },
    { value: "23%", label: "Contracts Have Hidden Fees" },
    { value: "99.7%", label: "Detection Accuracy" },
    { value: "< 30s", label: "Analysis Time" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(circle, var(--brand-green), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent 70%)" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border border-brand-green/15 bg-brand-green/5">
                  <Shield className="w-4 h-4 text-brand-green" />
                  <span className="text-sm text-muted-foreground font-medium">Contract Review Assistant</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                  Contract Shield<span className="text-brand-green">&trade;</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed text-pretty">
                  Our automated review tool compares your contract against your accepted offer and helps identify items
                  that may be worth reviewing with the dealer before you sign.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/auth/signup"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </FadeIn>

              <FadeIn delay={0.5}>
                <div className="flex flex-wrap items-center gap-5 pt-2 text-sm text-muted-foreground">
                  {["Automated scanning", "Instant results", "Included with concierge fee"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* Contract Analysis Preview Card */}
            <SlideIn from="right" delay={0.2}>
              <div className="relative">
                <div className="bg-background rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(45,27,105,0.08)] p-6 md:p-8 border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-brand-purple" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Contract Review</div>
                        <div className="text-sm text-muted-foreground">2024 Honda Accord EX-L</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-medium">
                      2 Items to Review
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {flaggedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {item.status === "success" ? (
                            <CheckCircle className="w-5 h-5 text-brand-green shrink-0" />
                          ) : item.status === "review" ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          ) : (
                            <Info className="w-5 h-5 text-brand-blue shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-foreground text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.note}</div>
                          </div>
                        </div>
                        <span
                          className={`font-semibold text-sm ${
                            item.status === "success"
                              ? "text-brand-green"
                              : item.status === "review"
                                ? "text-amber-600"
                                : "text-brand-blue"
                          }`}
                        >
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
                    <div className="flex items-center gap-2 text-brand-blue font-semibold text-sm">
                      <Info className="w-4 h-4 shrink-0" />
                      Items Flagged for Your Review
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      We&apos;ve highlighted a few items you may want to discuss with the dealer
                    </p>
                  </div>
                </div>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-14 md:py-16 bg-surface-elevated border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StaggerItem key={index}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-brand-purple mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-background scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-xs font-semibold tracking-[0.15em] uppercase text-brand-purple mb-4">How It Works</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">Simple Contract Review</h2>
              <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                Contract Shield automatically reviews uploaded contract documents and compares them to your accepted offer.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: FileText, color: "brand-green", title: "1. Documents Uploaded", desc: "When the dealer uploads contract documents, our system automatically begins review." },
              { icon: FileSearch, color: "brand-cyan", title: "2. Comparison Run", desc: "We compare contract details against your accepted offer and typical fee ranges for your area." },
              { icon: Eye, color: "brand-blue", title: "3. Review Summary", desc: "You receive a summary highlighting any items that may be worth discussing with the dealer." },
            ].map((step) => (
              <StaggerItem key={step.title}>
                <div className="text-center flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-${step.color}/10 flex items-center justify-center`}>
                    <step.icon className={`w-8 h-8 text-${step.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground text-pretty leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-block text-xs font-semibold tracking-[0.15em] uppercase text-brand-green mb-4">Features</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">What We Review</h2>
              <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                Contract Shield compares several aspects of your purchase agreement to help you ask informed questions.
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="bg-background rounded-xl p-6 border border-border hover:shadow-md hover:border-brand-purple/15 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-brand-purple/8 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-brand-purple" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-pretty leading-relaxed">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-16 bg-background border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <div className="bg-surface-elevated border border-border rounded-xl p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  Important Information
                </h3>
                <div className="text-sm text-muted-foreground flex flex-col gap-3 leading-relaxed">
                  <p>
                    <strong className="text-foreground">Contract Shield is an informational tool only.</strong> It does not provide legal, tax, or
                    financial advice. It is designed to help you identify potential discrepancies for discussion with your
                    dealer.
                  </p>
                  <p>
                    Contract Shield may not detect every issue. The tool compares data based on what we have available and
                    typical reference information. It cannot guarantee accuracy or completeness.
                  </p>
                  <p>
                    <strong className="text-foreground">You are responsible for reviewing and understanding your contract before signing.</strong> If
                    you have questions about your rights or obligations, consider speaking with a qualified attorney or
                    professional.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">Review Your Contract Before Signing</h2>
              <p className="text-lg text-white/70 leading-relaxed text-pretty">
                Contract Shield is included with every AutoLenis purchase to help you review your contract details.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/20 text-white font-semibold text-lg hover:bg-white/10 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/contract-shield" />

      <PublicFooter />
    </div>
  )
}
