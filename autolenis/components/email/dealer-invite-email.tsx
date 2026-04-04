import { EmailLayout } from "./email-layout"

interface DealerInviteEmailProps {
  dealerName: string
  claimUrl: string
}

export function DealerInviteEmail({ dealerName, claimUrl }: DealerInviteEmailProps) {
  return (
    <EmailLayout previewText="You're Invited to Join AutoLenis">
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        You&apos;re Invited to Join AutoLenis
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {dealerName}, a buyer has accepted your offer through AutoLenis. To continue this
        transaction on our platform, please click below to set up your dealer account.
      </p>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={claimUrl}
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
              Claim Your Invitation
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
