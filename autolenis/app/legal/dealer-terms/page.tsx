import Link from "next/link"
import { ArrowLeft, Handshake } from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"

export default function DealerTermsPage() {
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/15 bg-brand-purple/5 mb-6">
            <Handshake className="w-4 h-4 text-brand-purple" />
            <span className="text-sm text-muted-foreground font-medium">
              Legal
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-balance">
            Dealer Terms & Conditions
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            Partnership requirements and guidelines for AutoLenis dealers
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <Link href="/dealer-application" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Dealer Application
        </Link>

        <p className="text-sm text-muted-foreground mb-10">Last updated: November 24, 2025</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By joining the AutoLenis dealer network, you agree to be bound by these Dealer Terms and Conditions. These
              terms govern your participation in the AutoLenis platform and your relationship with AutoLenis, Inc.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Dealer Qualifications</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">To participate as a dealer on the AutoLenis platform, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Hold a valid dealer license in your operating jurisdiction</li>
              <li>Maintain all required business insurance</li>
              <li>Comply with all applicable federal, state, and local laws</li>
              <li>Maintain a physical dealership location</li>
              <li>Provide accurate and up-to-date business information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Auction Participation</h2>
            <p className="text-muted-foreground leading-relaxed">
              As a dealer on the AutoLenis platform, you agree to participate in auctions in good faith. When you submit
              an offer on a vehicle, you are committing to honor that offer if selected by the buyer.
            </p>
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">3.1 Offer Requirements</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>All offers must be complete, accurate, and honor all disclosed terms</li>
                <li>Pricing must include all fees, taxes, and applicable charges</li>
                <li>Financing terms, if offered, must be available as presented</li>
                <li>Vehicles must be available for delivery as promised</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Contract Shield Review</h2>
            <p className="text-muted-foreground leading-relaxed">
              Contract Shield is a review assistant that compares uploaded documents to the buyer&apos;s accepted offer and
              reference data. It is designed to support your existing processes, not replace your own review or
              legal/compliance counsel.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4 mb-2">When using the platform, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Submit accurate and complete contract documentation</li>
              <li>Review and address any items flagged by Contract Shield</li>
              <li>Provide clarification or explanation for flagged items when appropriate</li>
              <li>Honor the pricing and terms presented in your winning offer</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Important:</strong> Contract Shield does not determine legal compliance. Final responsibility for
              the accuracy and legality of all documents remains with you and the buyer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Fees and Payments</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">5.1 Platform Fees</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">AutoLenis charges dealers the following fees:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Auction participation: Free</li>
                  <li>Transaction fee: 2.5% of vehicle sale price (minimum $299, maximum $799)</li>
                  <li>Payment processing fees may apply</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">5.2 Payment Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Transaction fees are automatically deducted from the buyer&apos;s payment and remitted to AutoLenis. You will
                  receive your net proceeds within 2-3 business days of completed delivery.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Dealer Integrity Score</h2>
            <p className="text-muted-foreground leading-relaxed">
              AutoLenis maintains an integrity score for each dealer based on performance metrics including contract
              accuracy, delivery timeliness, customer satisfaction, and compliance with platform policies.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Dealers with consistently low integrity scores may have their platform access restricted or terminated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Dealers are prohibited from:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Submitting false or misleading information</li>
              <li>Attempting to contact buyers outside the platform during the auction process</li>
              <li>Adding unauthorized fees to contracts</li>
              <li>Discriminating against buyers based on protected characteristics</li>
              <li>Engaging in any fraudulent or deceptive practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              AutoLenis reserves the right to suspend or terminate dealer access to the platform for violation of these
              terms, fraudulent activity, or conduct detrimental to the platform or its users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              AutoLenis provides the platform &quot;as is&quot; and makes no warranties regarding uninterrupted access or guaranteed
              transaction volume. Our liability is limited to the fees paid by you in the 12 months preceding any claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p><strong>Email:</strong> info@autolenis.com</p>
              <p><strong>Phone:</strong> (888) 555-1234</p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  )
}
