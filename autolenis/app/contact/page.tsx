"use client"

import type React from "react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import ChatWidget from "@/components/ai/chat-widget"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, Phone, MapPin, Clock, ArrowRight, CheckCircle2, Loader2, Building2 } from "lucide-react"
import { useState } from "react"
import { FadeIn, SlideIn } from "@/components/ui/motion"
import { extractApiError } from "@/lib/utils/error-message"
import { csrfHeaders } from "@/lib/csrf-client"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    marketingConsent: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (!formData.subject) {
      setError("Please select a subject")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(formData),
      })

      const contentType = response.headers.get("content-type")
      let data
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || "Server error")
      }

      if (!response.ok || !data.success) {
        throw new Error(extractApiError(data.error, "Failed to send message"))
      }

      setIsSubmitted(true)
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent 70%)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-cyan/15 bg-brand-cyan/5">
                <Building2 className="w-4 h-4 text-brand-cyan" />
                <span className="text-sm text-muted-foreground font-medium">Contact AutoLenis</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground text-balance">
                Get in{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)" }}>
                  Touch
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-xl leading-relaxed">
                Questions about our process, privacy, or partnerships? Our team is here to help.
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/how-it-works"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                >
                  How It Works
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                >
                  About Us
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 md:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <FadeIn>
                <Card className="border border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl text-foreground">Send us a message</CardTitle>
                    <p className="text-muted-foreground">
                      Fill out the form below and we&apos;ll respond within one business day.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {isSubmitted ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-16 h-16 text-brand-green mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-foreground mb-2">Message Sent</h3>
                        <p className="text-muted-foreground mb-6">
                          Thank you for reaching out. We&apos;ll respond within one business day.
                        </p>
                        <Button
                          onClick={() => {
                            setIsSubmitted(false)
                            setFormData({
                              firstName: "",
                              lastName: "",
                              email: "",
                              phone: "",
                              subject: "",
                              message: "",
                              marketingConsent: false,
                            })
                          }}
                        >
                          Send Another Message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {error && (
                          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">{error}</div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                              id="firstName"
                              placeholder="John"
                              required
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                              id="lastName"
                              placeholder="Doe"
                              required
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@example.com"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="(555) 123-4567"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="subject">Subject *</Label>
                          <Select
                            value={formData.subject}
                            onValueChange={(value) => setFormData({ ...formData, subject: value })}
                          >
                            <SelectTrigger id="subject">
                              <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                              <SelectItem value="Application Process">Application Process</SelectItem>
                              <SelectItem value="Privacy & Data">Privacy & Data Questions</SelectItem>
                              <SelectItem value="Partner Program">Partner Program</SelectItem>
                              <SelectItem value="Dealer Partnership">Dealer Partnership</SelectItem>
                              <SelectItem value="Technical Support">Technical Support</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="message">Message *</Label>
                          <Textarea
                            id="message"
                            placeholder="How can we help you?"
                            rows={6}
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          />
                        </div>

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="marketingConsent"
                            checked={formData.marketingConsent}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, marketingConsent: checked as boolean })
                            }
                            className="mt-1"
                          />
                          <Label
                            htmlFor="marketingConsent"
                            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                          >
                            I agree to receive marketing communications from AutoLenis. I can unsubscribe at any time.
                          </Label>
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full font-semibold text-primary-foreground"
                          style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-blue))" }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-6">
              <SlideIn from="right" delay={0.1}>
                <Card className="border border-border text-primary-foreground" style={{ background: "linear-gradient(to bottom right, var(--brand-purple), hsl(265, 60%, 18%))" }}>
                  <CardContent className="pt-8">
                    <h3 className="text-xl font-bold mb-6">Contact Information</h3>
                    <div className="flex flex-col gap-6">
                      {[
                        { icon: Mail, color: "text-brand-cyan", label: "Email", content: <a href="mailto:info@autolenis.com" className="text-white/70 hover:text-white transition-colors">info@autolenis.com</a> },
                        { icon: Phone, color: "text-brand-green", label: "Phone", content: <a href="tel:+14692142132" className="text-white/70 hover:text-white transition-colors">(469) 214-2132</a> },
                        { icon: MapPin, color: "text-brand-blue", label: "Address", content: <p className="text-white/70">12800 Westridge Blvd, Ste 114<br />Frisco, TX 75035</p> },
                        { icon: Clock, color: "text-brand-green", label: "Hours", content: <p className="text-white/70">Monday - Friday: 9am - 6pm CST<br />Saturday: 10am - 4pm CST<br />Sunday: Closed</p> },
                      ].map((item) => (
                        <div key={item.label} className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <item.icon className={`h-5 w-5 ${item.color}`} />
                          </div>
                          <div>
                            <div className="font-semibold mb-1">{item.label}</div>
                            {item.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>

              <SlideIn from="right" delay={0.2}>
                <Card className="border border-border bg-brand-green/5">
                  <CardContent className="pt-8">
                    <h3 className="text-lg font-bold text-foreground mb-3">Quick Links</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { href: "/about", label: "About AutoLenis" },
                        { href: "/how-it-works", label: "How It Works" },
                        { href: "/affiliate", label: "Partner Program" },
                        { href: "/dealer-application", label: "Become a Dealer" },
                      ].map((link) => (
                        <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground transition-colors">
                          {link.label} &rarr;
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">Ready to Get Started?</h2>
              <p className="text-lg text-white/70 leading-relaxed text-pretty">
                Learn more about how AutoLenis can help you navigate your next vehicle purchase.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/buyer/onboarding"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Start Your Application
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/contact" />

      <PublicFooter />
      <ChatWidget variant="public" />
    </div>
  )
}
