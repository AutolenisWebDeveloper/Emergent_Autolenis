import Link from "next/link"
import { FileText, AlertCircle } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <section className="bg-[#3d2066] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <FileText className="w-16 h-16 mx-auto mb-6 text-[#d4af37]" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-white/90">Understanding your agreement with AutoLenis</p>
            <p className="text-sm text-white/70 mt-4">
              Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-12 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-amber-50 border-l-4 border-[#d4af37] p-6 rounded-r-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[#3d2066] mb-2">Important Notice</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    AutoLenis is a concierge platform that connects consumers with lenders and dealers. We are NOT a
                    lender, dealer, or financial institution. We do not make credit decisions, offer financing, or sell
                    vehicles. All financing and purchase decisions are made directly between you and third-party
                    lenders/dealers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Agreement to Terms */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">1. Agreement to Terms</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  By accessing or using AutoLenis, you agree to be bound by these Terms of Service and our Privacy
                  Policy. If you do not agree to these terms, you may not use our platform.
                </p>
                <p>
                  These terms constitute a legally binding agreement between you and AutoLenis. We reserve the right to
                  modify these terms at any time, and your continued use indicates acceptance of any changes.
                </p>
              </div>
            </div>

            {/* Description of Service */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">2. Description of Service</h2>
              <div className="space-y-3 text-gray-700">
                <p>AutoLenis provides:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A platform to connect consumers with automotive lenders and dealers</li>
                  <li>Pre-qualification assistance and financing application routing</li>
                  <li>Vehicle search and dealer matching services</li>
                  <li>A referral program for users to earn commissions</li>
                </ul>
                <div className="bg-amber-50 p-4 rounded-lg mt-4">
                  <p className="font-semibold text-[#3d2066] mb-2">What We Are NOT:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>A lender or credit provider</li>
                    <li>A car dealer or vehicle seller</li>
                    <li>A credit repair service or financial advisor</li>
                    <li>A guarantor of loan approval or specific terms</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* User Responsibilities */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">3. User Responsibilities</h2>
              <div className="space-y-3 text-gray-700">
                <p>By using AutoLenis, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use the platform only for lawful purposes</li>
                  <li>Not attempt to circumvent security measures or access unauthorized areas</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Review and understand terms from lenders and dealers before entering agreements</li>
                </ul>
              </div>
            </div>

            {/* Disclaimers */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">4. Disclaimers & Limitations</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-[#3d2066] mb-2">No Guarantees</h3>
                  <p>
                    AutoLenis does not guarantee loan approval, specific interest rates, vehicle availability, or
                    pricing. All final decisions are made by third-party lenders and dealers.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#3d2066] mb-2">Third-Party Relationships</h3>
                  <p>
                    We facilitate connections with third parties but are not responsible for their actions, services, or
                    compliance. You acknowledge that your agreements are directly with lenders and dealers, not with
                    AutoLenis.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#3d2066] mb-2">Service Availability</h3>
                  <p>
                    We strive for 99.9% uptime but do not guarantee uninterrupted access. We reserve the right to
                    modify, suspend, or discontinue services at any time.
                  </p>
                </div>
              </div>
            </div>

            {/* Partner Program Terms */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">5. Partner Program Terms</h2>
              <div className="space-y-3 text-gray-700">
                <p>If you participate in our referral program:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must not make unauthorized claims about AutoLenis services</li>
                  <li>You cannot guarantee loan approval or specific terms to referrals</li>
                  <li>Commission payments are subject to successful, completed transactions</li>
                  <li>We reserve the right to withhold commissions for fraudulent activity</li>
                  <li>You are responsible for any tax obligations on earned commissions</li>
                  <li>Your referral link remains active as long as you are in good standing</li>
                </ul>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700">
                All content, trademarks, logos, and intellectual property on AutoLenis are owned by or licensed to us.
                You may not copy, reproduce, or redistribute any content without explicit written permission.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">7. Limitation of Liability</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  To the fullest extent permitted by law, AutoLenis and its affiliates shall not be liable for any
                  indirect, incidental, special, consequential, or punitive damages arising from your use of the
                  platform.
                </p>
                <p>
                  Our total liability for any claims related to the platform shall not exceed the amount you paid to
                  AutoLenis in the twelve months preceding the claim.
                </p>
              </div>
            </div>

            {/* Governing Law */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">8. Governing Law & Disputes</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  These Terms shall be governed by the laws of the United States and the state in which AutoLenis
                  operates, without regard to conflict of law principles.
                </p>
                <p>
                  Any disputes shall be resolved through binding arbitration in accordance with the rules of the
                  American Arbitration Association.
                </p>
              </div>
            </div>

            {/* Termination */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">9. Termination</h2>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate your access to AutoLenis at any time for violation of these
                Terms, fraudulent activity, or at our discretion. You may also terminate your account at any time by
                contacting us.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-[#3d2066] text-white p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
              <p className="mb-4">If you have questions or concerns about these Terms of Service, please contact us:</p>
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:legal@autolenis.com" className="text-[#d4af37] hover:underline">
                    legal@autolenis.com
                  </a>
                </p>
                <p>
                  <strong>General Inquiries:</strong>{" "}
                  <Link href="/contact" className="text-[#d4af37] hover:underline">
                    Contact Form
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
