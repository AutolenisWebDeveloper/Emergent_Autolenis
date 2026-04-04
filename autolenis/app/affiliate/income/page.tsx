"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Calculator,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Car,
  TrendingUp,
  Gift,
} from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion"

const COMMISSION_RATES = [0.15, 0.03, 0.02]
const LEVEL_NAMES = ["Direct Referral", "2nd Origin", "3rd Origin"]
const LEVEL_CSS_COLORS = ["var(--brand-green)", "var(--brand-cyan)", "var(--brand-blue)"]

const INCOME_DISTRIBUTION = [0.75, 0.15, 0.1]

export default function AffiliateIncomePage() {
  const selectedPackage = useState(499)[0]
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [calculatorTab, setCalculatorTab] = useState("estimate")

  const getDefaultSales = (pkg: number) => {
    const targetIncome = 2500
    const sales: number[] = []
    for (let i = 0; i < 3; i++) {
      const levelIncome = targetIncome * (INCOME_DISTRIBUTION[i] ?? 0)
      const commissionPerSale = pkg * (COMMISSION_RATES[i] ?? 0)
      sales.push(Math.round(levelIncome / commissionPerSale))
    }
    return sales
  }

  const [salesByLevel, setSalesByLevel] = useState(getDefaultSales(499))
  const [goalIncome, setGoalIncome] = useState(5000)

  const calculateIncome = () => {
    return salesByLevel.reduce((total, sales, index) => {
      return total + sales * selectedPackage * (COMMISSION_RATES[index] ?? 0)
    }, 0)
  }

  const calculateSalesForGoal = () => {
    const sales: number[] = []
    for (let i = 0; i < 3; i++) {
      const levelIncome = goalIncome * (INCOME_DISTRIBUTION[i] ?? 0)
      const commissionPerSale = selectedPackage * (COMMISSION_RATES[i] ?? 0)
      sales.push(Math.ceil(levelIncome / commissionPerSale))
    }
    return sales
  }

  const totalIncome = calculateIncome()
  const salesForGoal = calculateSalesForGoal()

  const faqs = [
    {
      question: "Is this a multi-level marketing (MLM) program?",
      answer:
        "No. This is a referral program based on car purchases, not recruitment. You share your link, and when someone buys a car, you earn a commission. There are no teams to build, no quotas to meet, no meetings to attend, and no one to recruit. The 'network origin bonuses' simply mean that when a car purchase traces back to your original referral (up to 3 levels), you receive a small bonus--but this happens automatically through car sales, not through recruiting people.",
    },
    {
      question: "How do network origin bonuses work?",
      answer:
        "Every AutoLenis customer automatically receives a referral link when they buy a car. If someone you referred shares their link and another person buys a car, you receive a 3% bonus because that sale originated from your network. This continues for up to 3 purchases in the chain. You don't have to do anything--it happens automatically when cars are purchased.",
    },
    {
      question: "Does my referral link expire?",
      answer:
        "No, your referral link never expires. As long as you're in the program, your link remains active. You can share it today, and if someone uses it to buy a car months or years later, you still earn your commission.",
    },
    {
      question: "How much can I realistically earn?",
      answer:
        "Your earnings depend on how many people use your link to buy cars through the Premium plan. For each direct referral (someone who buys using YOUR link), you earn 15% of the $499 concierge fee — that's $74.85 per car. Network origin bonuses (3% and 2% for levels 2–3) add additional income when car purchases trace back to your referrals. The total commission structure is 20% across all three levels.",
    },
    {
      question: "When and how do I get paid?",
      answer:
        "Commissions are paid out monthly via direct deposit or PayPal. Once a car purchase is completed and the transaction is verified, your commission is credited to your account and included in the next payout cycle.",
    },
    {
      question: "Do I need to buy a car to participate?",
      answer:
        "No. You can join the referral program for free and receive your link immediately. However, if you do purchase a car through AutoLenis, you'll automatically be enrolled and receive your referral link as part of the process.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(175deg, var(--hero-start) 0%, var(--hero-end) 50%, var(--background) 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-green/15 bg-brand-green/5">
                <Calculator className="w-4 h-4 text-brand-green" />
                <span className="text-sm text-muted-foreground font-medium">Income Calculator</span>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground text-balance">See How Much You Can Earn</h1>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
                Earn <span className="text-brand-green font-bold">up to 20% commission</span> when someone buys a car using
                your link. Plus, receive network origin bonuses when car purchases trace back to your referrals -- no
                recruiting required.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How You Earn */}
      <section className="py-16 md:py-24 bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How You Earn</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A simple referral program based on car purchases, not recruitment
              </p>
            </div>
          </FadeIn>

          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl p-8 text-primary-foreground mb-8" style={{ background: "var(--brand-purple)" }}>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: Car, color: "var(--brand-green)", title: "Direct Referral", desc: "Someone buys a car using YOUR link", pct: "15%", rate: 0.15 },
                  { icon: Gift, color: "var(--brand-cyan)", title: "2nd Level", desc: "Your referral's referral buys a car", pct: "3%", rate: 0.03 },
                  { icon: TrendingUp, color: "var(--brand-blue)", title: "3rd Level", desc: "Third level car purchase in your network", pct: "2%", rate: 0.02 },
                ].map((level) => (
                  <div key={level.title} className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: level.color }}>
                      <level.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{level.title}</h3>
                    <p className="text-white/70 text-sm mb-3">{level.desc}</p>
                    <div className="text-3xl font-bold" style={{ color: level.color }}>{level.pct}</div>
                    <div className="text-sm text-white/60">${(selectedPackage * level.rate).toFixed(2)} per sale</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-brand-green shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground mb-2">This is NOT multi-level marketing</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    You don&apos;t recruit anyone. Every AutoLenis customer automatically gets a referral link when they buy
                    a car. Network origin bonuses happen automatically when car purchases trace back to your original
                    referral (up to 3 levels). There are no teams, no downlines, no meetings -- just share your link and
                    earn when cars are purchased.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-16 md:py-24 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Commission Structure</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Earn up to 20% total commission on direct referrals plus bonuses from your network
              </p>
            </div>
          </FadeIn>

          {/* Commission Info */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="px-6 py-3 rounded-xl font-semibold text-primary-foreground" style={{ background: "var(--brand-purple)" }}>
              $499 Premium Plan
            </div>
          </div>

          <StaggerContainer className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            {COMMISSION_RATES.map((rate, index) => (
              <StaggerItem key={index}>
                <div
                  className="bg-background rounded-xl p-6 text-center border-2 transition-all hover:shadow-lg"
                  style={{ borderColor: `color-mix(in srgb, ${LEVEL_CSS_COLORS[index]} 25%, transparent)` }}
                >
                  <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: LEVEL_CSS_COLORS[index] }}>
                    {(rate * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{LEVEL_NAMES[index]}</div>
                  <div className="text-lg font-semibold text-foreground">${(selectedPackage * rate).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">per car sold</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-primary-foreground" style={{ background: "var(--brand-purple)" }}>
              <span className="text-lg font-semibold">Total Commission:</span>
              <span className="text-2xl font-bold text-brand-green">20%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real Example */}
      <section className="py-16 md:py-24" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Real Example: How Earnings Add Up</h2>
                <p className="text-lg text-white/70">See how network origin bonuses work with actual car purchases</p>
              </div>
            </FadeIn>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/15">
              <div className="flex flex-col gap-6">
                {[
                  { num: "1", color: "var(--brand-green)", text: "Your friend Sarah uses your link to buy a car ($499 Premium plan)", earn: "$74.85", label: "(15% direct referral)" },
                  { num: "2", color: "var(--brand-cyan)", text: "Sarah shares her link (she got one automatically). Her coworker Mike buys a car.", sub: "Sarah earns $74.85 (her direct referral)", earn: "$14.97", label: "(3% 2nd level bonus)" },
                  { num: "3", color: "var(--brand-blue)", text: "Mike's neighbor sees his new car and uses Mike's link to buy one too.", sub: "Mike earns $74.85, Sarah earns $14.97", earn: "$9.98", label: "(2% 3rd level bonus)" },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: step.color }}>
                      <span className="font-bold text-white">{step.num}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{step.text}</p>
                      {step.sub && <p className="text-white/60">{step.sub}</p>}
                      <p className="text-white/70">
                        You earn: <span className="font-bold" style={{ color: step.color }}>{step.earn}</span> {step.label}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="border-t border-white/15 pt-6 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg text-white">Your total from just these 3 car sales:</span>
                    <span className="text-3xl font-bold text-brand-green">$150.00</span>
                  </div>
                  <p className="text-white/50 text-sm mt-2">
                    You only shared your link once with Sarah. The rest happened automatically through car purchases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Income Calculator */}
      <section className="py-16 md:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Income Calculator</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Estimate your potential earnings or calculate what it takes to hit your income goal
              </p>
            </div>
          </FadeIn>

          <Card className="max-w-4xl mx-auto border border-border">
            <CardContent className="p-6 md:p-8">
              {/* V2: Single Premium fee — $499 */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
                <span className="font-semibold text-foreground">Premium Concierge Fee:</span>
                <span className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground" style={{ background: "var(--brand-purple)" }}>
                  $499
                </span>
              </div>

              <Tabs value={calculatorTab} onValueChange={setCalculatorTab}>
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="estimate" className="text-base">
                    Estimate My Income
                  </TabsTrigger>
                  <TabsTrigger value="goal" className="text-base">
                    Hit My Income Goal
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="estimate">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">
                      <h3 className="font-semibold text-foreground text-lg">Adjust Car Sales by Origin</h3>
                      {salesByLevel.map((sales, index) => (
                        <div key={index} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium" style={{ color: LEVEL_CSS_COLORS[index] }}>
                              {LEVEL_NAMES[index]} ({((COMMISSION_RATES[index] ?? 0) * 100).toFixed(0)}%)
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {sales} sales = ${(sales * selectedPackage * (COMMISSION_RATES[index] ?? 0)).toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[sales]}
                            onValueChange={(value) => {
                              const newSales = [...salesByLevel]
                              newSales[index] = value[0] ?? 0
                              setSalesByLevel(newSales)
                            }}
                            max={250}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl p-6 flex flex-col justify-center text-primary-foreground" style={{ background: "var(--brand-purple)" }}>
                      <div className="text-center">
                        <div className="text-sm text-white/70 mb-2">Estimated Monthly Income</div>
                        <div className="text-5xl font-bold text-brand-green mb-4">
                          ${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-sm text-white/70">per month</div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-white/15 flex flex-col gap-2">
                        {salesByLevel.map((sales, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-white/70">{LEVEL_NAMES[index]}:</span>
                            <span style={{ color: LEVEL_CSS_COLORS[index] }}>
                              ${(sales * selectedPackage * (COMMISSION_RATES[index] ?? 0)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="goal">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">
                      <h3 className="font-semibold text-foreground text-lg">Set Your Monthly Goal</h3>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Target Monthly Income</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="number"
                            value={goalIncome}
                            onChange={(e) => setGoalIncome(Number(e.target.value))}
                            className="pl-10 text-xl font-bold h-14"
                          />
                        </div>
                      </div>

                      <div className="bg-surface-elevated rounded-xl p-4 flex flex-col gap-3">
                        <div className="text-sm font-medium text-foreground mb-1">
                          Sales needed (using 75/15/10 distribution):
                        </div>
                        {salesForGoal.map((sales, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm" style={{ color: LEVEL_CSS_COLORS[index] }}>
                              {LEVEL_NAMES[index]} ({((INCOME_DISTRIBUTION[index] ?? 0) * 100).toFixed(0)}% of income):
                            </span>
                            <span className="font-bold text-foreground">{sales} sales</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-brand-green/10 rounded-2xl p-6 flex flex-col justify-center border-2 border-brand-green/20">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">Direct Referrals Needed</div>
                        <div className="text-6xl font-bold text-brand-green mb-2">{salesForGoal[0]}</div>
                        <div className="text-sm text-muted-foreground mb-4">car sales per month</div>
                        <div className="text-xs text-muted-foreground">
                          That&apos;s about {Math.ceil((salesForGoal?.[0] ?? 0) / 4)} per week using your direct link
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-brand-green/20">
                        <div className="text-center text-sm text-muted-foreground">
                          Network origin bonuses add an additional{" "}
                          <span className="font-bold text-foreground">${(goalIncome * 0.25).toLocaleString()}</span> from
                          car purchases that trace back to you
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about the referral program
              </p>
            </div>
          </FadeIn>

          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-background rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-accent transition-colors"
                >
                  <span className="font-semibold text-foreground">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {expandedFaq === index && <div className="px-6 pb-4 text-muted-foreground leading-relaxed">{faq.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24" style={{ background: "var(--brand-purple)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Earning?</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Get your free referral link and earn up to 20% on every car purchase, plus network origin bonuses
            </p>
            <Link
              href="/auth/signup?role=affiliate"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-foreground font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
            >
              Get My Referral Link
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
