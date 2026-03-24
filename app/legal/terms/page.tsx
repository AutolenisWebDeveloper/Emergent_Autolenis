import { FileText } from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"

export default function TermsPage() {
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
            <FileText className="w-4 h-4 text-brand-purple" />
            <span className="text-sm text-muted-foreground font-medium">
              Legal
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-balance">
            Terms of Service
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            The terms and conditions governing your use of AutoLenis
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className="text-sm text-muted-foreground mb-10">Last updated: January 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using AutoLenis ("Service"), you agree to be bound by these Terms of Service ("Terms"). If
              you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              AutoLenis is a vehicle purchasing platform that connects buyers with dealers through a reverse auction
              system. Our services include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Pre-qualification and credit assessment</li>
              <li>Vehicle search and shortlisting</li>
              <li>Silent reverse auction management</li>
              <li>Contract Shield review and verification</li>
              <li>Insurance coordination</li>
              <li>E-signature services</li>
              <li>Pickup scheduling and coordination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must create an account to use certain features of the Service. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Fees and Payments</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">4.1 Deposit</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A $99 refundable deposit is required to initiate an auction. This deposit will be refunded if no
                  dealer offers are received.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.2 Concierge Service Fee</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our Premium concierge service fee is $499. The $99 Serious Buyer Deposit is credited toward this
                  fee ($400 remaining). On the Free plan, the deposit is credited toward your vehicle purchase
                  at closing. You may pay the Premium fee directly or include it in your financing.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.3 Payment Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All payments are processed securely through our payment processor. By providing payment information,
                  you authorize us to charge the applicable fees.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Pre-Qualification and Credit Checks</h2>
            <p className="text-muted-foreground leading-relaxed">
              By consenting to pre-qualification, you authorize AutoLenis to perform a soft credit inquiry. Soft
              inquiries do not affect your credit score. Final financing will require a hard credit inquiry from the
              lender.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Auctions</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                AutoLenis facilitates reverse auctions where dealers submit offers for vehicles on your shortlist.
                Auctions are silent, meaning dealers cannot see competing offers.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You are not obligated to accept any offer. If you choose to proceed with a dealer offer, you will enter
                into a purchase agreement directly with that dealer.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Contract Shield</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Contract Shield is an automated review feature that compares contract documents against your accepted
              offer and basic reference data. It is designed to help identify potential discrepancies for your review.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Contract Shield does not:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Provide legal, tax, or financial advice</li>
              <li>Guarantee that your contract is correct, complete, or enforceable</li>
              <li>Replace the need for you to carefully review all documents</li>
              <li>Guarantee detection of every possible issue or discrepancy</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Any flags or messages provided by Contract Shield are for informational purposes only. You are responsible
              for reviewing and understanding your contract before signing. If you have questions about your rights or
              obligations, consider speaking with a qualified attorney or other professional.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Dealer Relationships</h2>
            <p className="text-muted-foreground leading-relaxed">
              AutoLenis is not a dealer and does not sell vehicles. We connect you with independent dealers. Your
              vehicle purchase agreement is directly with the dealer, not AutoLenis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Affiliate Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              Participants in our affiliate program must comply with our affiliate terms and conditions. Commissions are
              paid only on completed deals where our concierge service fee has been received.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Communications, Marketing, and Third-Party Partners</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              AutoLenis may communicate with you through email, SMS, or other means to provide updates, marketing
              offers, or information related to third-party partners. You agree to receive such communications and
              authorize AutoLenis to use your contact information for these purposes.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may opt-out of marketing communications at any time by following the instructions provided in the
              communications or by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide false or misleading information</li>
              <li>Impersonate any person or entity</li>
              <li>Attempt to manipulate auction results</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Interfere with the operation of the Service</li>
              <li>Attempt to gain unauthorized access to systems or accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the Service are owned by AutoLenis and are protected by
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. AUTOLENIS DISCLAIMS ALL WARRANTIES,
              EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, AUTOLENIS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless AutoLenis from any claims, damages, or expenses arising from your
              use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violation of these Terms. You may terminate your
              account by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">17. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">18. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Delaware, without regard to conflict of law
              principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">19. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at info@autolenis.com
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
