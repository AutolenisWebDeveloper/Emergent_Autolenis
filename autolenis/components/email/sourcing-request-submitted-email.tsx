import { EmailLayout } from "./email-layout"

interface SourcingRequestSubmittedEmailProps {
  buyerName: string
}

export function SourcingRequestSubmittedEmail({ buyerName }: SourcingRequestSubmittedEmailProps) {
  return (
    <EmailLayout previewText="Your Vehicle Request Has Been Submitted">
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        Your Vehicle Request Has Been Submitted
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {buyerName}, we&apos;ve received your vehicle request. Our team will start sourcing
        offers from our dealer network. You&apos;ll be notified as soon as offers are available.
      </p>

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
