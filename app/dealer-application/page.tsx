"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowRight,
  Users,
  Shield,
  CheckCircle,
  Star,
  DollarSign,
  Zap,
  Loader2,
  TrendingUp,
  Clock,
  Target,
  Handshake,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { FadeIn, StaggerContainer, StaggerItem, SlideIn, ScaleIn } from "@/components/ui/motion"

export default function DealerApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    dealershipName: "",
    businessType: "",
    yearsInBusiness: "",
    licenseNumber: "",
    taxId: "",
    contactName: "",
    contactTitle: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    averageInventory: "",
    primaryVehicleTypes: "",
    monthlyVolume: "",
    website: "",
    howDidYouHear: "",
    additionalInfo: "",
    agreeToTerms: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.contactName.split(" ")[0] || formData.contactName,
          lastName: formData.contactName.split(" ").slice(1).join(" ") || "",
          role: "DEALER",
        }),
      })

      const signupData = await signupResponse.json()

      if (!signupData.success) {
        throw new Error(signupData.error || "Failed to create account")
      }

      const registerResponse = await fetch("/api/dealer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealershipName: formData.dealershipName,
          businessType: formData.businessType,
          licenseNumber: formData.licenseNumber,
          yearsInBusiness: formData.yearsInBusiness,
          contactName: formData.contactName,
          contactTitle: formData.contactTitle,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          averageInventory: formData.averageInventory,
          monthlyVolume: formData.monthlyVolume,
          website: formData.website,
          additionalInfo: formData.additionalInfo,
        }),
      })

      const registerData = await registerResponse.json()

      if (registerData.error) {
        throw new Error(registerData.error)
      }

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 2 business days.",
      })

      router.push("/dealer/onboarding?pending=true")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(circle, var(--brand-green), transparent 70%)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col gap-8">
              <FadeIn delay={0.1}>
                <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border border-amber-400/20 bg-amber-400/5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm text-muted-foreground font-medium">Join 500+ dealers nationwide</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                  Grow Your{" "}
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)" }}>
                    Dealership
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-xl leading-relaxed">
                  Connect with pre-qualified buyers through our buyer-paid concierge platform. AutoLenis is buyer-aligned -- dealers participate by submitting competitive offers.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#apply"
                    className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                  >
                    Apply Now
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </a>
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                  >
                    How It Works
                  </Link>
                </div>
              </FadeIn>
            </div>

            <SlideIn from="right" delay={0.2}>
              <div className="relative">
                <div className="bg-background rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_48px_rgba(45,27,105,0.08)] p-6 md:p-8 border border-border flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold text-xl">Dealer Benefits</span>
                    <span className="px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-sm font-semibold">No Upfront Cost</span>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {[
                      "Pre-qualified, ready-to-buy leads",
                      "Buyer-paid platform model",
                      "Streamlined digital contracts",
                      "Real-time inventory management",
                      "Dedicated dealer support team",
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-brand-green mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-1">Average increase in sales</div>
                    <div className="text-3xl font-bold text-brand-purple">+35%</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { val: "500+", label: "Dealers" },
                    { val: "50K+", label: "Buyers" },
                    { val: "$0", label: "Upfront" },
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

      {/* Qualified Leads */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-cyan/10 border border-brand-cyan/15 mb-6">
                <Target className="w-4 h-4 text-brand-cyan" />
                <span className="text-sm font-medium text-brand-cyan">Qualified Leads</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
                Connect with Buyers Who Are <span className="text-brand-cyan">Ready to Purchase</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Stop wasting time on tire-kickers. Every lead you receive is pre-qualified with verified credit scores,
                confirmed budgets, and genuine purchase intent.
              </p>
            </div>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <StaggerContainer className="flex flex-col gap-8">
              {[
                { icon: Users, color: "brand-green", title: "Pre-Qualified Buyers Only", desc: "Every buyer completes our 5-minute pre-qualification process. You receive their credit tier, budget range, and vehicle preferences before making contact." },
                { icon: DollarSign, color: "brand-cyan", title: "Pay-Per-Sale Model", desc: "No monthly fees, no subscriptions, no upfront costs. You only pay a small commission when you successfully close a deal through our platform." },
                { icon: Zap, color: "brand-blue", title: "Streamlined Sales Process", desc: "Digital contracts, e-signatures, and automated compliance checks mean you can close deals faster with less paperwork and fewer delays." },
                { icon: Shield, color: "brand-purple", title: "Built-In Compliance", desc: "Our platform automatically ensures all deals meet state and federal regulatory requirements, protecting both you and your customers." },
              ].map((benefit) => (
                <StaggerItem key={benefit.title}>
                  <div className="flex gap-5">
                    <div className={`shrink-0 w-12 h-12 rounded-xl bg-${benefit.color}/10 flex items-center justify-center`}>
                      <benefit.icon className={`w-6 h-6 text-${benefit.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <SlideIn from="right" delay={0.2}>
              <div className="lg:sticky lg:top-8">
                <div className="bg-surface-elevated rounded-2xl p-8 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-8">Results Our Dealers See</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { icon: TrendingUp, color: "text-brand-green", label: "Close Rate", val: "92%", sub: "on qualified leads" },
                      { icon: DollarSign, color: "text-brand-cyan", label: "ROI", val: "3x", sub: "vs traditional ads" },
                      { icon: Clock, color: "text-brand-blue", label: "Time to Sale", val: "24h", sub: "average" },
                      { icon: Handshake, color: "text-brand-purple", label: "Partner Network", val: "500+", sub: "dealerships" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-background rounded-xl p-5 shadow-sm border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">{stat.val}</div>
                        <div className="text-sm text-muted-foreground">{stat.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-background rounded-xl p-5 shadow-sm border border-border">
                    <p className="text-muted-foreground italic mb-4">
                      &ldquo;We&apos;ve increased our monthly sales by 40% since joining AutoLenis. The quality of leads is unlike
                      anything we&apos;ve seen from other platforms.&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold" style={{ background: "var(--brand-purple)" }}>
                        MJ
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Michael Johnson</div>
                        <div className="text-sm text-muted-foreground">Johnson Auto Group, TX</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-20 md:py-28 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Partner With AutoLenis</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join our network and access a stream of pre-qualified buyers ready to purchase
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, color: "brand-green", title: "Qualified Leads", desc: "Every buyer is pre-qualified with verified credit and budget before they reach you." },
              { icon: DollarSign, color: "brand-cyan", title: "Pay Per Sale", desc: "No monthly fees or subscriptions. You only pay a small commission when you close a deal." },
              { icon: Zap, color: "brand-blue", title: "Fast Process", desc: "Digital contracts and e-signatures mean deals close faster than traditional sales." },
              { icon: Shield, color: "brand-purple", title: "Compliance Built-In", desc: "Our platform ensures all deals meet regulatory requirements automatically." },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-${item.color}/10 flex items-center justify-center mb-6 mx-auto`}>
                    <item.icon className={`w-8 h-8 text-${item.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 md:py-28 bg-surface-elevated scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Apply to Join Our Network</h2>
                <p className="text-lg text-muted-foreground">
                  Complete the application below and our team will review within 2 business days.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">Dealer Application</CardTitle>
                  <CardDescription>Step {step} of 3</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {step === 1 && (
                      <div className="flex flex-col gap-6">
                        <h3 className="text-lg font-semibold text-foreground">Business Information</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="dealershipName">Dealership Name *</Label>
                            <Input
                              id="dealershipName"
                              value={formData.dealershipName}
                              onChange={(e) => setFormData({ ...formData, dealershipName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="businessType">Business Type *</Label>
                            <Select
                              value={formData.businessType}
                              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="franchise">Franchise Dealer</SelectItem>
                                <SelectItem value="independent">Independent Dealer</SelectItem>
                                <SelectItem value="used">Used Car Dealer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="licenseNumber">Dealer License Number *</Label>
                            <Input
                              id="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                            <Select
                              value={formData.yearsInBusiness}
                              onValueChange={(value) => setFormData({ ...formData, yearsInBusiness: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0-2">0-2 years</SelectItem>
                                <SelectItem value="3-5">3-5 years</SelectItem>
                                <SelectItem value="6-10">6-10 years</SelectItem>
                                <SelectItem value="10+">10+ years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => setStep(2)}
                          className="w-full font-semibold text-primary-foreground"
                          style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="flex flex-col gap-6">
                        <h3 className="text-lg font-semibold text-foreground">Contact & Location</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="contactName">Contact Name *</Label>
                            <Input
                              id="contactName"
                              value={formData.contactName}
                              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="contactTitle">Title *</Label>
                            <Input
                              id="contactTitle"
                              value={formData.contactTitle}
                              onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="password">Create Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Minimum 8 characters"
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            You&apos;ll use this to access your dealer portal once approved.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="address">Address *</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                          />
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="city">City *</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="state">State *</Label>
                            <Input
                              id="state"
                              value={formData.state}
                              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="zipCode">ZIP Code *</Label>
                            <Input
                              id="zipCode"
                              value={formData.zipCode}
                              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                            Back
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setStep(3)}
                            className="flex-1 font-semibold text-primary-foreground"
                            style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                          >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="flex flex-col gap-6">
                        <h3 className="text-lg font-semibold text-foreground">Inventory & Additional Info</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="averageInventory">Average Inventory Size *</Label>
                            <Select
                              value={formData.averageInventory}
                              onValueChange={(value) => setFormData({ ...formData, averageInventory: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-25">1-25 vehicles</SelectItem>
                                <SelectItem value="26-50">26-50 vehicles</SelectItem>
                                <SelectItem value="51-100">51-100 vehicles</SelectItem>
                                <SelectItem value="100+">100+ vehicles</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="monthlyVolume">Monthly Sales Volume *</Label>
                            <Select
                              value={formData.monthlyVolume}
                              onValueChange={(value) => setFormData({ ...formData, monthlyVolume: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-10">1-10 vehicles</SelectItem>
                                <SelectItem value="11-25">11-25 vehicles</SelectItem>
                                <SelectItem value="26-50">26-50 vehicles</SelectItem>
                                <SelectItem value="50+">50+ vehicles</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="website">Website (optional)</Label>
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="additionalInfo">Additional Information (optional)</Label>
                          <Textarea
                            id="additionalInfo"
                            placeholder="Tell us anything else you'd like us to know..."
                            value={formData.additionalInfo}
                            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                            rows={4}
                          />
                        </div>

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="agreeToTerms"
                            checked={formData.agreeToTerms}
                            onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
                          />
                          <Label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed">
                            I agree to the{" "}
                            <Link href="/legal/dealer-terms" className="text-brand-purple underline">
                              Dealer Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/legal/privacy" className="text-brand-purple underline">
                              Privacy Policy
                            </Link>
                            .
                          </Label>
                        </div>

                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="flex-1"
                            disabled={isSubmitting}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={!formData.agreeToTerms || isSubmitting}
                            className="flex-1 font-semibold text-primary-foreground"
                            style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Application"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">Ready to Grow Your Business?</h2>
              <p className="text-lg text-white/70 leading-relaxed text-pretty">
                Join hundreds of dealers who are increasing their sales with AutoLenis.
              </p>
              <div className="flex justify-center">
                <a
                  href="#apply"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/dealer-application" />

      <PublicFooter />
    </div>
  )
}
