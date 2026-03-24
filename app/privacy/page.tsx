import Link from "next/link"
import { Shield, Lock, Eye } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <section className="bg-[#3d2066] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-[#d4af37]" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-white/90">Your data privacy and security are our top priorities</p>
            <p className="text-sm text-white/70 mt-4">
              Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-12 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#3d2066] mb-6">Quick Summary</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <Lock className="w-8 h-8 text-[#d4af37] mb-3" />
                <h3 className="font-semibold text-[#3d2066] mb-2">Data Collection</h3>
                <p className="text-sm text-gray-600">
                  We collect only the information necessary to provide our concierge services with your explicit
                  consent.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <Eye className="w-8 h-8 text-[#d4af37] mb-3" />
                <h3 className="font-semibold text-[#3d2066] mb-2">Data Use</h3>
                <p className="text-sm text-gray-600">
                  Your data is used exclusively to connect you with lenders and dealers. We never sell your personal
                  information.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <Shield className="w-8 h-8 text-[#d4af37] mb-3" />
                <h3 className="font-semibold text-[#3d2066] mb-2">Your Rights</h3>
                <p className="text-sm text-gray-600">
                  You have the right to access, correct, or delete your personal data at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Policy */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Information We Collect */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">1. Information We Collect</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-[#3d2066] mb-2">Personal Information</h3>
                  <p className="mb-2">With your consent, we may collect:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name, email address, and phone number</li>
                    <li>Financial information (income, credit score estimates)</li>
                    <li>Vehicle preferences and purchase details</li>
                    <li>Location data (for dealer matching)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#3d2066] mb-2">Technical Information</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Device information and browser type</li>
                    <li>IP address and usage data</li>
                    <li>Cookies and tracking technologies</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Your Information */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">2. How We Use Your Information</h2>
              <div className="space-y-3 text-gray-700">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Connect you with appropriate lenders and dealers based on your criteria</li>
                  <li>Facilitate pre-qualification and financing applications</li>
                  <li>Provide customer support and platform updates</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal and regulatory requirements</li>
                </ul>
                <p className="font-semibold text-[#3d2066] mt-4">
                  We do NOT sell your personal information to third parties.
                </p>
              </div>
            </div>

            {/* Information Sharing */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">3. Information Sharing</h2>
              <div className="space-y-3 text-gray-700">
                <p>We may share your information with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Lenders:</strong> To process your financing applications
                  </li>
                  <li>
                    <strong>Dealers:</strong> To match you with available vehicles
                  </li>
                  <li>
                    <strong>Service Providers:</strong> Third parties that help us operate our platform (with strict
                    data protection agreements)
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> When required by law or to protect our rights
                  </li>
                </ul>
                <p className="mt-4">
                  All third parties are contractually obligated to protect your data and use it only for authorized
                  purposes.
                </p>
              </div>
            </div>

            {/* Data Security */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">4. Data Security</h2>
              <div className="space-y-3 text-gray-700">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure server infrastructure with regular security audits</li>
                  <li>Access controls and authentication protocols</li>
                  <li>Regular security training for our team</li>
                </ul>
                <p className="mt-4 text-sm text-gray-600">
                  While we take extensive precautions, no system is 100% secure. We encourage you to protect your
                  account credentials.
                </p>
              </div>
            </div>

            {/* Your Rights */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">5. Your Privacy Rights</h2>
              <div className="space-y-3 text-gray-700">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of your personal data
                  </li>
                  <li>
                    <strong>Correct:</strong> Update or correct inaccurate information
                  </li>
                  <li>
                    <strong>Delete:</strong> Request deletion of your data (subject to legal requirements)
                  </li>
                  <li>
                    <strong>Opt-Out:</strong> Unsubscribe from marketing communications
                  </li>
                  <li>
                    <strong>Restrict:</strong> Limit how we process your data
                  </li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, contact us at{" "}
                  <a href="mailto:privacy@autolenis.com" className="text-[#d4af37] hover:underline">
                    privacy@autolenis.com
                  </a>
                </p>
              </div>
            </div>

            {/* Cookies */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">6. Cookies & Tracking</h2>
              <div className="space-y-3 text-gray-700">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Track referral links for our partner program</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings, though some features may be limited if cookies
                  are disabled.
                </p>
              </div>
            </div>

            {/* Children's Privacy */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700">
                AutoLenis is not intended for individuals under 18 years of age. We do not knowingly collect information
                from children. If we discover we have collected data from a child, we will promptly delete it.
              </p>
            </div>

            {/* Changes to Policy */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-[#3d2066] mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or
                through a prominent notice on our platform. Your continued use of AutoLenis after changes indicates
                acceptance of the updated policy.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-[#3d2066] text-white p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Questions About Privacy?</h2>
              <p className="mb-4">
                If you have any questions or concerns about how we handle your data, please contact us:
              </p>
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:privacy@autolenis.com" className="text-[#d4af37] hover:underline">
                    privacy@autolenis.com
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
