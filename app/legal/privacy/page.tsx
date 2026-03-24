import { Shield } from "lucide-react"
import { PublicNav } from "@/components/layout/public-nav"
import { PublicFooter } from "@/components/layout/public-footer"

export default function PrivacyPage() {
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
            <Shield className="w-4 h-4 text-brand-purple" />
            <span className="text-sm text-muted-foreground font-medium">
              Legal
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-6 text-balance">
            Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            How we collect, use, and protect your personal information
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className="text-sm text-muted-foreground mb-10">Last updated: January 2024</p>

        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              AutoLenis ("we," "our," or "us") respects your privacy and is committed to protecting your personal
              information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">2.1 Personal Information</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Name, email address, phone number</li>
                  <li>Mailing address</li>
                  <li>Date of birth</li>
                  <li>Social Security number (for credit checks)</li>
                  <li>Employment and income information</li>
                  <li>Driver's license information</li>
                  <li>Payment information</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">2.2 Credit Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  With your consent, we obtain credit reports and credit scores from credit bureaus for
                  pre-qualification purposes.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">2.3 Usage Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We automatically collect information about how you use our service, including IP address, browser
                  type, pages visited, and time spent on pages.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">2.4 Vehicle Preferences</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We collect information about your vehicle preferences, search history, and shortlisted vehicles.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve our services</li>
              <li>Process pre-qualification requests and credit checks</li>
              <li>Facilitate auctions and connect you with dealers</li>
              <li>Process payments and refunds</li>
              <li>Verify contracts through Contract Shield</li>
              <li>Coordinate insurance and e-signature services</li>
              <li>Schedule vehicle pickup</li>
              <li>Send service-related notifications</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
              <li>Analyze usage and improve our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Share Your Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">4.1 With Dealers</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We share limited information with dealers participating in your auction, including your vehicle
                  preferences and pre-qualified budget range. We do not share your full credit report with dealers.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.2 With Service Providers</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We share information with third-party service providers who perform services on our behalf, including
                  credit bureaus, payment processors, insurance providers, and e-signature services.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.3 With Lenders</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you choose to finance your vehicle through our partner lenders, we share necessary information to
                  process your loan application.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.4 For Legal Reasons</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may disclose your information if required by law, court order, or governmental request, or to
                  protect our rights and safety.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">4.5 With Affiliates</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you were referred by an affiliate, we share limited information necessary to calculate and pay
                  commissions.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Credit Reporting</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use soft credit inquiries for pre-qualification, which do not affect your credit score. If you proceed
              with financing, the lender will perform a hard credit inquiry, which may impact your credit score.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including encryption, secure
              servers, and access controls. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with legal
              obligations. You may request deletion of your account and data at any time, subject to legal retention
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Your Rights and Choices</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access and review your personal information</li>
                <li>Request corrections to inaccurate information</li>
                <li>Request deletion of your account and data</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent for credit checks</li>
                <li>Export your data in a portable format</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, contact us at info@autolenis.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to improve your experience, analyze usage, and serve
              personalized content. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service may contain links to third-party websites. We are not responsible for the privacy practices of
              these external sites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for individuals under 18 years of age. We do not knowingly collect information
              from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. California Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              California residents have additional rights under the California Consumer Privacy Act (CCPA), including
              the right to know what personal information we collect and the right to opt out of the sale of personal
              information. We may sell or share your personal information for business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the
              updated policy on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>AutoLenis Privacy Team</p>
              <p>Email: info@autolenis.com</p>
              <p>Phone: 1-800-AUTO-LENS</p>
            </div>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
