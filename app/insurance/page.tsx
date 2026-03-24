"use client"

import Link from "next/link"
import { ArrowRight, Shield, Upload, Star, FileSearch, CheckCircle } from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import { FadeIn, SlideIn, ScaleIn } from "@/components/ui/motion"

export default function InsurancePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.15]" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent 70%)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-green/15 bg-brand-green/5">
                  <Star className="w-4 h-4 text-brand-green" />
                  <span className="text-sm text-muted-foreground font-medium">Required for vehicle purchase</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                  Insurance{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)" }}>
                    Made Simple
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-xl leading-relaxed">
                  Insurance is required before finalizing your vehicle purchase. Compare quotes from top providers or
                  upload proof of your existing coverage -- all in one seamless step.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/buyer/onboarding"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Start Your Purchase
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                  >
                    Learn How It Works
                  </Link>
                </div>
              </FadeIn>
            </div>

            <SlideIn from="right" delay={0.2}>
              <div className="relative">
                <div className="bg-background rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(45,27,105,0.08)] p-6 md:p-8 border border-border flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold text-xl">Insurance Options</span>
                    <span className="px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-sm font-semibold">Required Step</span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="p-4 rounded-xl bg-brand-green/5 border border-brand-green/15">
                      <div className="flex items-start gap-3">
                        <FileSearch className="w-6 h-6 text-brand-green mt-0.5" />
                        <div>
                          <div className="font-semibold text-foreground">Compare Quotes</div>
                          <div className="text-sm text-muted-foreground">Get quotes from multiple providers instantly</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/15">
                      <div className="flex items-start gap-3">
                        <Upload className="w-6 h-6 text-brand-cyan mt-0.5" />
                        <div>
                          <div className="font-semibold text-foreground">Upload Existing</div>
                          <div className="text-sm text-muted-foreground">Already have coverage? Upload proof to continue</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 text-brand-purple" />
                      <span>Insurance verified before pickup</span>
                    </div>
                  </div>

                  <Link
                    href="/buyer/onboarding"
                    className="block w-full py-3.5 rounded-xl text-primary-foreground font-semibold text-lg text-center hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Get Started
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { val: "5+", label: "Providers" },
                    { val: "100%", label: "Compliant" },
                    { val: "Fast", label: "Verification" },
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

      {/* How Insurance Works */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Insurance is integrated into your car buying journey—choose your path
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Option 1: Get Quotes */}
            <div className="bg-brand-green/5 rounded-2xl p-8 border-2 border-brand-green/15">
              <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-6">
                <FileSearch className="w-8 h-8 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Need Insurance?</h3>
              <p className="text-muted-foreground mb-6">
                We partner with top insurance providers to get you competitive quotes based on your vehicle and profile.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                  <span>Compare quotes from multiple providers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                  <span>See coverage details side-by-side</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                  <span>Purchase directly through AutoLenis</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" />
                  <span>Automatic verification—no delays</span>
                </li>
              </ul>
            </div>

            {/* Option 2: Upload Existing */}
            <div className="bg-brand-cyan/5 rounded-2xl p-8 border-2 border-brand-cyan/15">
              <div className="w-16 h-16 rounded-2xl bg-brand-cyan/10 flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-brand-cyan" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Already Have Insurance?</h3>
              <p className="text-muted-foreground mb-6">
                If you have existing coverage, simply upload proof and we'll verify it meets state requirements.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span>Upload your insurance card or declaration</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span>We verify coverage meets requirements</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span>Instant approval in most cases</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-cyan mt-0.5 flex-shrink-0" />
                  <span>Continue to pickup scheduling</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Insurance is Required */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Insurance is Required</h2>
              <p className="text-lg text-muted-foreground">
                Insurance protects you, the dealer, and ensures a smooth vehicle handoff
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-brand-purple" />
                </div>
                <h3 className="text-lg font-bold mb-2">Legal Requirement</h3>
                <p className="text-sm text-muted-foreground">
                  Most states require proof of insurance before you can legally drive your new vehicle off the lot.
                </p>
              </div>

              <div className="bg-background p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-brand-green" />
                </div>
                <h3 className="text-lg font-bold mb-2">Your Protection</h3>
                <p className="text-sm text-muted-foreground">
                  Coverage protects you financially from accidents, theft, and damage from the moment you take
                  ownership.
                </p>
              </div>

              <div className="bg-background p-6 rounded-2xl shadow-sm border border-border">
                <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center mb-4">
                  <FileSearch className="w-6 h-6 text-brand-cyan" />
                </div>
                <h3 className="text-lg font-bold mb-2">Delivery Requirement</h3>
                <p className="text-sm text-muted-foreground">
                  Proof of insurance is required before vehicle delivery or pickup. You can upload your current insurance, mark it as pending, or request help.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">Ready to Buy Your Car?</h2>
              <p className="text-lg text-white/70 leading-relaxed text-pretty">
                Start your purchase journey. Insurance is just one simple step in our streamlined process.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buyer/onboarding"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Get Pre-Qualified Now
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/20 text-white font-semibold text-lg hover:bg-white/10 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/insurance" />

      <PublicFooter />
    </div>
  )
}
