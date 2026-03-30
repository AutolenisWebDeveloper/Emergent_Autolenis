"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"
import { PageFaithBlock } from "@/components/marketing/page-faith-block"
import ChatWidget from "@/components/ai/chat-widget"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion"

const faqs = [
  {
    category: "Core Value & Differentiation",
    questions: [
      {
        q: "What exactly is AutoLenis?",
        a: "AutoLenis is an end-to-end car-buying concierge platform that helps you go from pre-qualification to pickup through a structured workflow—so you can shop smarter, avoid pressure, and reduce surprises.",
      },
      {
        q: "How is AutoLenis different from going directly to a dealer?",
        a: "Direct-to-dealer usually means you negotiate alone inside their environment. AutoLenis shifts leverage by structuring the process so dealers compete for your deal and the paperwork is checked before you commit.",
      },
      {
        q: 'How is AutoLenis different from a "free" broker?',
        a: '"Free" often means the broker\'s incentive is aligned to the dealer payout—not necessarily your best deal. AutoLenis is built to create process leverage and verification, not just referrals.',
      },
      {
        q: "Why would I pay a fee if dealers and brokers claim they can do it for free?",
        a: "Because the real cost is often hidden in price, financing terms, add-ons, time, and mistakes. The fee pays for structure, protection, and execution discipline—the things that reduce expensive surprises.",
      },
      {
        q: "What problems does AutoLenis solve that most people underestimate?",
        a: 'Time waste, negotiation pressure, confusing fees, contract surprises, insurance delays, and "deal drift" where the final numbers change at signing.',
      },
      {
        q: "Is AutoLenis only for people with bad credit?",
        a: "No. AutoLenis is for buyers who want a clean, controlled process—whether your credit is strong or still improving.",
      },
      {
        q: "Will I actually get a better deal?",
        a: "AutoLenis is designed to increase leverage by creating structured competition and reducing friction—but no platform can guarantee a specific price outcome.",
      },
      {
        q: "Do dealers take AutoLenis buyers seriously?",
        a: "Yes—because you show up with a defined request, verified intent, and a process that reduces wasted back-and-forth.",
      },
      {
        q: "Is AutoLenis trying to replace dealerships?",
        a: "No. AutoLenis helps buyers and dealers transact more efficiently—dealers still sell the car; AutoLenis improves the workflow.",
      },
      {
        q: "What's the biggest reason buyers choose AutoLenis?",
        a: "They want control, clarity, and fewer surprises—without spending weeks negotiating and second-guessing paperwork.",
      },
    ],
  },
  {
    category: 'Fees, Value, ROI & "Is It Worth It?"',
    questions: [
      {
        q: "What do the fees actually pay for?",
        a: "They pay for a structured system: qualification flow, sourcing/offer workflow, coordination, contract verification (Contract Shield), guided next steps, and concierge support.",
      },
      {
        q: "How do I know the fee isn't just a markup?",
        a: "A markup is hidden in the deal; the AutoLenis fee is explicit. You're paying for process execution and protection instead of guessing where the cost got buried.",
      },
      {
        q: "What if I'm a strong negotiator—why pay?",
        a: "Even strong negotiators get burned in the contract stage. AutoLenis is as much about verification and workflow control as negotiation.",
      },
      {
        q: "What if I can find the same car cheaper myself?",
        a: "Then you can choose it. AutoLenis is valuable when you want deal structure, verification, and a guided path to completion, not endless shopping.",
      },
      {
        q: 'How does AutoLenis prevent "last-minute changes" at signing?',
        a: "By pushing deal confirmation and documentation checks earlier—so discrepancies surface before you're at the desk.",
      },
      {
        q: "What's the real cost of using a free broker?",
        a: "Often: higher total price, financing padding, limited transparency, pressure to close, and reduced recourse when the deal changes.",
      },
      {
        q: "Is AutoLenis worth it for lower-priced cars?",
        a: 'If the cost of mistakes, delays, and contract surprises matters to you, yes. The "value" isn\'t just price—it\'s reducing avoidable risk and time loss.',
      },
      {
        q: "Do I pay if I don't buy?",
        a: "AutoLenis can be structured with different fee triggers; the clean rule is: you pay for work performed and/or when you choose to proceed (exact policy depends on your current fee model).",
      },
      {
        q: "Can AutoLenis save me time?",
        a: "Yes—because it standardizes steps, reduces repeated negotiations, and keeps everything in one guided workflow.",
      },
      {
        q: "What's the simplest reason the fee makes sense?",
        a: 'You\'re buying leverage and protection—two things that are hard to get "free" in a dealer-driven transaction.',
      },
    ],
  },
  {
    category: "Trust, Independence & Incentives",
    questions: [
      {
        q: "Does AutoLenis get paid by dealers?",
        a: "AutoLenis should disclose this clearly. The trust standard: if any dealer-side compensation exists, it must be transparent and never compromise buyer confidentiality.",
      },
      {
        q: "Is AutoLenis biased toward certain dealers?",
        a: "The platform is built to route offers through a structured process. If dealer ranking exists, it should be based on objective factors (responsiveness, verified terms, compliance, customer outcomes).",
      },
      {
        q: "How do I know AutoLenis isn't steering me?",
        a: "You keep decision control. AutoLenis presents verified options and helps you complete the transaction; you choose whether to proceed.",
      },
      {
        q: "Will AutoLenis share my information with multiple dealers?",
        a: "Only what's necessary to receive offers and complete the deal. Data minimization and permission-based sharing should be the default.",
      },
      {
        q: "Can a dealer see competing offers?",
        a: "No. Dealers cannot see competitor pricing or identities—this preserves real competition.",
      },
    ],
  },
  {
    category: "Process: Step-by-Step Buyer Journey",
    questions: [
      {
        q: "What are the steps from start to finish?",
        a: "Prequal → vehicle request/shortlist → offers/competition → select best offer → fees/financing → insurance → contract verification → e-sign → pickup/delivery.",
      },
      {
        q: "How long does the process take?",
        a: "It depends on inventory and responsiveness, but AutoLenis is designed to compress delays by standardizing every step and keeping momentum.",
      },
      {
        q: "Do I have to talk to dealers?",
        a: "Typically far less than normal. You can keep communication structured and limited until you're ready.",
      },
      {
        q: "What if I'm not sure what vehicle I want?",
        a: "AutoLenis can guide your request into a tight spec—budget, mileage, features, must-haves—so offers are relevant.",
      },
      {
        q: "What if I'm upside down on my current car?",
        a: "AutoLenis can structure the deal path to account for payoff/negative equity considerations—without pretending it disappears.",
      },
    ],
  },
  {
    category: "Offers, Pricing, Negotiation & Competition",
    questions: [
      {
        q: "How do offers work inside AutoLenis?",
        a: "You submit a defined request; dealers respond with structured offers; you compare and select—without typical showroom pressure.",
      },
      {
        q: "Can I counteroffer?",
        a: "Yes, if enabled in your flow—AutoLenis can support structured counter terms without turning it into chaos.",
      },
      {
        q: "Do I see the full breakdown of costs?",
        a: "That's the standard: vehicle price, fees, taxes, add-ons, financing terms (if applicable) should be clearly presented.",
      },
      {
        q: "What stops a dealer from bait-and-switch?",
        a: "Process controls, documentation checks, and the ability to pause or stop when numbers change. AutoLenis is built to surface changes early.",
      },
      {
        q: "Can I bring my own financing?",
        a: "Yes. You can proceed with outside financing; AutoLenis still adds value on process, contract verification, and coordination.",
      },
    ],
  },
  {
    category: "Contract Shield, Verification & Risk Reduction",
    questions: [
      {
        q: "What is Contract Shield?",
        a: "Contract Shield is a contract verification layer designed to catch inconsistencies, missing disclosures, and unexpected add-ons before you commit.",
      },
      {
        q: "What kinds of issues can Contract Shield catch?",
        a: "Examples: unexpected products/add-ons, fee mismatches, term inconsistencies, missing required disclosures, or payment numbers that don't match the offer.",
      },
      {
        q: "Is Contract Shield legal advice?",
        a: "No. It's a verification and clarity tool—not a substitute for an attorney.",
      },
      {
        q: "What happens if the contract is flagged?",
        a: "The transaction pauses, the issues are identified, and the dealer can correct them—or AutoLenis routes the situation through a controlled review path.",
      },
      {
        q: "Why does contract verification matter so much?",
        a: "Because many bad deals happen at signing—when fatigue, pressure, and complexity are highest.",
      },
    ],
  },
  {
    category: "Insurance, Pickup/Delivery & Completion",
    questions: [
      {
        q: "Can AutoLenis help with insurance?",
        a: "Yes—AutoLenis can support insurance quote workflows or verification so you don't get stuck at delivery.",
      },
      {
        q: "Do I have to buy insurance through AutoLenis?",
        a: "No. You can use your own provider. AutoLenis helps ensure you meet the dealer's proof requirements on time.",
      },
      {
        q: "How does pickup/delivery scheduling work?",
        a: "Once contract and insurance steps are satisfied, the platform coordinates pickup/delivery scheduling and confirms requirements.",
      },
      {
        q: "Will I know exactly what to bring to pickup?",
        a: "That's the goal—AutoLenis should generate a clear checklist so you don't lose the car or delay closing.",
      },
    ],
  },
  {
    category: "Edge Cases, Support & Control",
    questions: [
      {
        q: "What if there are no dealers in my area yet?",
        a: "AutoLenis can route you into a sourcing path—collect your top vehicle preferences and expand outreach until offers can be obtained.",
      },
      {
        q: "What if I change my mind after getting offers?",
        a: "You can revise your request. AutoLenis is designed to keep the process structured, not punitive.",
      },
      {
        q: "What if I find a car on my own—can AutoLenis still help?",
        a: "Yes—AutoLenis can still add value by verifying terms, supporting the contract stage, and guiding you through completion steps.",
      },
      {
        q: "What happens if something goes wrong mid-transaction?",
        a: "AutoLenis gives you a controlled escalation path—documented, trackable, and easier to resolve than ad-hoc texting and calls.",
      },
      {
        q: "Who supports me if I have questions at 9pm?",
        a: "Lenis Concierge can answer immediately about process and your status, and escalate to human support when required.",
      },
      {
        q: "If I summarize: why AutoLenis instead of the old way?",
        a: "Because AutoLenis turns a chaotic, dealer-led negotiation into a structured, verified, buyer-controlled workflow—so you reduce surprises, save time, and complete with confidence.",
      },
    ],
  },
]

export default function FAQPage() {
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
          className="pointer-events-none absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, var(--brand-cyan), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <FadeIn delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-4 text-balance">
              Frequently Asked{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-cyan) 50%, var(--brand-blue) 100%)",
                }}
              >
                Questions
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions about AutoLenis, our process,
              and how we help you get the best deal on your next vehicle.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-24 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="flex flex-col gap-12" stagger={0.06}>
            {faqs.map((category, idx) => (
              <StaggerItem key={idx}>
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-brand-purple">
                    {category.category}
                  </h2>
                  <Accordion
                    type="single"
                    collapsible
                    className="flex flex-col gap-3"
                  >
                    {category.questions.map((faq, qIdx) => (
                      <AccordionItem
                        key={qIdx}
                        value={`${idx}-${qIdx}`}
                        className="border border-border rounded-xl px-6 bg-card hover:border-brand-purple/15 transition-colors"
                      >
                        <AccordionTrigger className="text-left font-semibold text-foreground hover:text-brand-purple">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
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
          className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.1]"
          style={{
            background: "radial-gradient(circle, white, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="flex flex-col items-center gap-8">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground text-balance">
                Still have questions?
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto text-balance">
                Our team is here to help. Reach out and we{"'"}ll get back to
                you within 24 hours.
              </p>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-purple font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Contact Us
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Faith & Encouragement */}
      <PageFaithBlock pathname="/faq" />

      <PublicFooter />
      <ChatWidget variant="public" />
    </div>
  )
}
