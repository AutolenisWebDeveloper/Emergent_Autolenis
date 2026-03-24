import { EmailLayout } from "./email-layout"

interface WelcomeEmailProps {
  firstName: string
  role: "BUYER" | "DEALER" | "AFFILIATE"
}

export function WelcomeEmail({ firstName, role }: WelcomeEmailProps) {
  const roleContent = {
    BUYER: {
      headline: "Welcome to AutoLenis!",
      subheadline: "You're on your way to buying your car the smart way.",
      steps: [
        { title: "Get Pre-Qualified", desc: "Complete your pre-qualification to see your buying power." },
        { title: "Browse & Shortlist", desc: "Find vehicles you love and add them to your shortlist." },
        { title: "Start an Auction", desc: "Let dealers compete to give you the best price." },
        { title: "Sign & Drive", desc: "Choose the winning offer, sign online, and pick up your car." },
      ],
      cta: { text: "Get Pre-Qualified Now", href: "https://autolenis.com/buyer/onboarding" },
    },
    DEALER: {
      headline: "Welcome to the AutoLenis Dealer Network!",
      subheadline: "Connect with pre-qualified buyers ready to purchase.",
      steps: [
        { title: "Complete Onboarding", desc: "Finish your dealer profile and verification." },
        { title: "Add Inventory", desc: "List your vehicles to reach more buyers." },
        { title: "Submit Offers", desc: "Compete in auctions with your best prices." },
        { title: "Close Deals", desc: "Win auctions and grow your business." },
      ],
      cta: { text: "Complete Dealer Setup", href: "https://autolenis.com/dealer/onboarding" },
    },
    AFFILIATE: {
      headline: "Welcome to the AutoLenis Affiliate Program!",
      subheadline: "Earn money by referring car buyers to AutoLenis.",
      steps: [
        { title: "Share Your Link", desc: "Use your unique referral code to invite buyers." },
        { title: "Track Referrals", desc: "Monitor your referrals in real-time." },
        { title: "Earn Commissions", desc: "Get paid when your referrals complete purchases." },
        { title: "Grow Your Network", desc: "Build multi-level earnings with our tier system." },
      ],
      cta: { text: "View Your Dashboard", href: "https://autolenis.com/affiliate/dashboard" },
    },
  }

  const content = roleContent[role]

  return (
    <EmailLayout previewText={`Welcome to AutoLenis, ${firstName}!`}>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        {content.headline}
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {firstName}, {content.subheadline}
      </p>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          Here's how to get started:
        </h3>
        {content.steps.map((step, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginBottom: index < content.steps.length - 1 ? "16px" : "0",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#2D1B69",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={content.cta.href}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                backgroundColor: "#2D1B69",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                borderRadius: "8px",
              }}
            >
              {content.cta.text}
            </a>
          </td>
        </tr>
      </table>

      <p
        style={{
          margin: "24px 0 0",
          fontSize: "14px",
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        Questions? Reply to this email or visit our{" "}
        <a href="https://autolenis.com/faq" style={{ color: "#2D1B69" }}>
          FAQ
        </a>
        .
      </p>
    </EmailLayout>
  )
}
