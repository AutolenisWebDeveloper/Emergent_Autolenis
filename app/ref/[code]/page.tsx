"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Car, Users, Shield, DollarSign, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReferralLandingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  // const router = useRouter()
  const code = params['code'] as string
  const [isTracking, setIsTracking] = useState(true)
  const [affiliateName, setAffiliateName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function trackClick() {
      try {
        // Track the click
        const response = await fetch("/api/affiliate/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.affiliateName) {
            setAffiliateName(data.affiliateName)
          }
          // Store the referral code in localStorage for 30 days
          localStorage.setItem("ref_code", code)
          localStorage.setItem("ref_code_timestamp", Date.now().toString())
          localStorage.setItem(
            "affiliate_referral",
            JSON.stringify({
              refCode: data.refCode || code,
              affiliateId: data.affiliateId,
              firstTouchUrl: window.location.href,
              utmSource: searchParams.get("utm_source") || undefined,
              utmMedium: searchParams.get("utm_medium") || undefined,
              utmCampaign: searchParams.get("utm_campaign") || undefined,
              utmTerm: searchParams.get("utm_term") || undefined,
              utmContent: searchParams.get("utm_content") || undefined,
              capturedAt: new Date().toISOString(),
            }),
          )
        } else {
          setError("Invalid referral link")
        }
      } catch (err) {
        console.error("Failed to track click:", err)
      } finally {
        setIsTracking(false)
      }
    }

    if (code) {
      trackClick()
    }
  }, [code, searchParams])

  if (isTracking) {
    return (
      <div className="min-h-screen bg-[#2D1B69] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading your personalized experience...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Invalid Referral Link</h1>
          <p className="text-muted-foreground mb-8">
            This referral link appears to be invalid or has expired. You can still explore AutoLenis!
          </p>
          <Link href="/">
            <Button className="bg-[#2D1B69] hover:bg-[#2D1B69]/90">
              Go to Homepage
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-[#2D1B69] text-white overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Referral Badge */}
            {affiliateName && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
                <Users className="w-4 h-4 text-[#7ED321]" />
                <span className="text-sm text-white/90">
                  Referred by <span className="font-semibold text-white">{affiliateName}</span>
                </span>
              </div>
            )}

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-[#7ED321] via-[#00D9FF] to-[#0066FF] bg-clip-text text-transparent">
                AutoLenis
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto text-balance">
              {affiliateName
                ? `${affiliateName} thinks you'd love our car buying experience. Get the best price with complete transparency.`
                : "Your friend shared this exclusive link with you. Experience Car Buying. Reengineered."}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/buyer/onboarding">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] text-[#2D1B69] font-semibold hover:opacity-90 px-8"
                >
                  Start Buying a Car
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/affiliate">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 px-8 bg-transparent"
                >
                  Join Affiliate Program
                </Button>
              </Link>
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">$2,847</div>
                <div className="text-sm text-white/70">Avg Savings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">15K+</div>
                <div className="text-sm text-white/70">Happy Buyers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">4.9/5</div>
                <div className="text-sm text-white/70">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why AutoLenis */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose AutoLenis?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We've revolutionized car buying to save you time, money, and stress.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-[#7ED321]/10 flex items-center justify-center mb-4 mx-auto">
                <DollarSign className="w-7 h-7 text-[#7ED321]" />
              </div>
              <h3 className="font-bold mb-2">Best Price Guarantee</h3>
              <p className="text-sm text-muted-foreground">
                Dealers compete for your business, ensuring you get the lowest price.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-[#00D9FF]/10 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-7 h-7 text-[#00D9FF]" />
              </div>
              <h3 className="font-bold mb-2">Contract Shield</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered contract review protects you from hidden fees and surprises.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-[#0066FF]/10 flex items-center justify-center mb-4 mx-auto">
                <Car className="w-7 h-7 text-[#0066FF]" />
              </div>
              <h3 className="font-bold mb-2">Huge Selection</h3>
              <p className="text-sm text-muted-foreground">
                Access inventory from multiple trusted dealers in your area.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-[#2D1B69]/10 flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-7 h-7 text-[#2D1B69]" />
              </div>
              <h3 className="font-bold mb-2">Easy Process</h3>
              <p className="text-sm text-muted-foreground">
                From pre-qualification to pickup, everything is handled online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two Paths */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Would You Like to Do?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Buy a Car */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#7ED321]/20 hover:border-[#7ED321]/40 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-[#7ED321]/10 flex items-center justify-center mb-6">
                <Car className="w-8 h-8 text-[#7ED321]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Buy a Car</h3>
              <p className="text-muted-foreground mb-6">
                Start your car buying journey. Get pre-qualified, browse vehicles, and let dealers compete for your
                business.
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#7ED321]" />
                  <span>Free pre-qualification in minutes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#7ED321]" />
                  <span>Compare offers from multiple dealers</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#7ED321]" />
                  <span>Contract protection included</span>
                </li>
              </ul>
              <Link href="/buyer/onboarding">
                <Button className="w-full bg-[#7ED321] hover:bg-[#7ED321]/90 text-white">
                  Start Buying
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Join Affiliate */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#00D9FF]/20 hover:border-[#00D9FF]/40 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-[#00D9FF]/10 flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-[#00D9FF]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Become an Affiliate</h3>
              <p className="text-muted-foreground mb-6">
                Not ready to buy? Join our affiliate program and earn commissions by referring others.
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#00D9FF]" />
                  <span>Earn $100 per successful referral</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#00D9FF]" />
                  <span>30-day tracking cookie</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#00D9FF]" />
                  <span>Fast payouts via direct deposit</span>
                </li>
              </ul>
              <Link href="/auth/signup?role=affiliate">
                <Button className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-white">
                  Join Affiliate Program
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#2D1B69] text-white">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="text-xl font-bold">
            AutoLenis
          </Link>
          <p className="text-white/60 text-sm mt-2">Car Buying. Reengineered.</p>
        </div>
      </footer>
    </div>
  )
}
