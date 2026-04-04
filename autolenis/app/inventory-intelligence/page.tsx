"use client"

import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import Link from "next/link"
import {
  ArrowRight,
  Shield,
  Globe,
  CheckCircle2,
  Radar,
  Building2,
  Search,
  Lock,
  Eye,
  Car,
} from "lucide-react"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
} from "@/components/ui/motion"

const features = [
  {
    icon: Radar,
    title: "Dealer Discovery",
    description:
      "AutoLenis continuously discovers dealerships across target markets, expanding the network of potential vehicle sources to give buyers more options.",
  },
  {
    icon: Globe,
    title: "Market Inventory",
    description:
      "We aggregate vehicle listings from multiple sources, normalize the data, and present a broader view of what's available in the market — beyond our verified network.",
  },
  {
    icon: Shield,
    title: "Verified Inventory",
    description:
      "Vehicles from our active dealer partners are verified for availability and pricing. These are confirmed, trustworthy listings you can act on with confidence.",
  },
  {
    icon: Building2,
    title: "Dealer Onboarding",
    description:
      "When a buyer finds a vehicle from a non-network dealer, AutoLenis invites that dealer to join our platform. If they accept, their inventory becomes verified.",
  },
  {
    icon: Lock,
    title: "Identity Protection",
    description:
      "Buyer and dealer identities remain masked until deal commitment is confirmed. This prevents unsolicited contact and protects both parties throughout the process.",
  },
  {
    icon: Eye,
    title: "Anti-Circumvention",
    description:
      "Our systems monitor communications for attempts to share contact information outside the platform, ensuring the deal process remains secure and fair for everyone.",
  },
]

const trustLabels = [
  {
    label: "Verified Available",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Shield,
    description:
      "This vehicle is listed by an active AutoLenis dealer partner. The listing has been confirmed and the vehicle is currently available for purchase.",
  },
  {
    label: "Likely Available",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle2,
    description:
      "This vehicle was found from a high-confidence market source. While not directly verified by a network dealer, it has a strong likelihood of availability.",
  },
  {
    label: "Availability Unconfirmed",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Globe,
    description:
      "This vehicle was sourced from a public listing or third-party feed. Availability and pricing may have changed since last updated.",
  },
]

export default function InventoryIntelligencePage() {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-[#00D9FF]/5 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  How AutoLenis Finds{" "}
                  <span className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] bg-clip-text text-transparent">
                    Your Vehicle
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  Our Inventory Intelligence system searches across dealer networks and market sources
                  to find the right vehicle at the right price — with transparency you can trust.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/buyer/search"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Search Vehicles
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
                  >
                    How It Works
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">The Search Process</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  AutoLenis combines verified dealer inventory with broader market intelligence to give you the most comprehensive view of available vehicles.
                </p>
              </div>
            </FadeIn>

            <div className="max-w-4xl mx-auto">
              <StaggerContainer className="space-y-6">
                {[
                  { step: "1", title: "You set your preferences", desc: "Tell us what you're looking for — make, model, budget, features. Our system starts searching immediately." },
                  { step: "2", title: "We search verified inventory first", desc: "Vehicles from active AutoLenis dealer partners are matched and presented first. These are confirmed available at stated prices." },
                  { step: "3", title: "We expand to market sources", desc: "If more options exist beyond our network, we surface them with clear availability labels so you know exactly what to expect." },
                  { step: "4", title: "Non-network dealers get invited", desc: "If you're interested in a market vehicle, we invite that dealer to join AutoLenis and submit a verified offer — growing the network for everyone." },
                  { step: "5", title: "You choose, we protect the deal", desc: "Identities stay masked until commitment. Anti-circumvention systems ensure fair dealing throughout the process." },
                ].map((item) => (
                  <StaggerItem key={item.step}>
                    <div className="flex gap-6 items-start">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] flex items-center justify-center text-white font-bold text-lg">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Built-In Intelligence</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Every part of the vehicle discovery process is designed to be transparent, secure, and fair.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="bg-background rounded-xl border p-6 h-full hover:shadow-md transition-shadow">
                    <feature.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Trust Labels */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Understanding Trust Labels</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Every vehicle in your search results carries a trust label so you always know the source and confidence level.
                </p>
              </div>
            </FadeIn>

            <div className="max-w-3xl mx-auto space-y-6">
              {trustLabels.map((item) => (
                <ScaleIn key={item.label}>
                  <div className="flex items-start gap-4 p-6 rounded-xl border bg-background hover:shadow-sm transition-shadow">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${item.color} flex-shrink-0`}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </ScaleIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-gradient-to-r from-[#7ED321]/10 to-[#00D9FF]/10">
          <div className="container mx-auto px-4 text-center">
            <FadeIn>
              <Car className="h-12 w-12 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl font-bold mb-4">Ready to find your next vehicle?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Start your search with AutoLenis and experience transparent, competitive vehicle pricing from verified and market sources.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buyer/search"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Start Searching
                  <Search className="h-5 w-5" />
                </Link>
                <Link
                  href="/for-dealers"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-border rounded-lg font-medium hover:bg-muted/50 transition-colors"
                >
                  For Dealers
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
