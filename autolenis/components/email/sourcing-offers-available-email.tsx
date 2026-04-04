import { EmailLayout } from "./email-layout"

interface SourcingOffersAvailableEmailProps {
  buyerName: string
  caseId: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://autolenis.com"

export function SourcingOffersAvailableEmail({ buyerName, caseId }: SourcingOffersAvailableEmailProps) {
  return (
    <EmailLayout previewText="Offers Are Available for Your Vehicle Request">
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        Offers Are Available!
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {buyerName}, great news! We have sourced offers for your vehicle request. Log in to
        review and accept an offer.
      </p>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={`${APP_URL}/buyer/requests/${caseId}`}
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
              Review Offers
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
