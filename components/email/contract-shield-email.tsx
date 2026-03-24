import { EmailLayout } from "./email-layout"

interface ContractShieldEmailProps {
  recipientName: string
  status: "PASS" | "FAIL" | "ISSUES_FOUND"
  vehicleName: string
  dealId: string
  issueCount?: number
  isDealer?: boolean
}

export function ContractShieldEmail({
  recipientName,
  status,
  vehicleName,
  dealId,
  issueCount = 0,
  isDealer = false,
}: ContractShieldEmailProps) {
  const statusConfig = {
    PASS: {
      emoji: "✅",
      bgColor: "#f0fdf4",
      borderColor: "#bbf7d0",
      textColor: "#166534",
      headline: "Contract Shield Passed!",
      message: isDealer
        ? "The contract documents have passed our verification. The buyer can now proceed to e-sign."
        : "Great news! The contract has passed our verification. You can now proceed to sign.",
    },
    FAIL: {
      emoji: "❌",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
      textColor: "#991b1b",
      headline: "Contract Shield Found Issues",
      message: isDealer
        ? `We found ${issueCount} issue${issueCount > 1 ? "s" : ""} that need to be fixed before the buyer can proceed.`
        : `We found ${issueCount} issue${issueCount > 1 ? "s" : ""} with the contract. The dealer has been notified and must fix them.`,
    },
    ISSUES_FOUND: {
      emoji: "⚠️",
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
      textColor: "#92400e",
      headline: "Contract Needs Attention",
      message: isDealer
        ? `We found ${issueCount} item${issueCount > 1 ? "s" : ""} that need review. Please address these before the buyer can proceed.`
        : `We found ${issueCount} item${issueCount > 1 ? "s" : ""} that need the dealer's attention. We'll notify you once they're resolved.`,
    },
  }

  const config = statusConfig[status]

  return (
    <EmailLayout previewText={`Contract Shield ${status === "PASS" ? "Passed" : "Update"} - ${vehicleName}`}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: config.bgColor,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            border: `1px solid ${config.borderColor}`,
          }}
        >
          <span style={{ fontSize: "32px" }}>{config.emoji}</span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            fontWeight: "bold",
            color: config.textColor,
          }}
        >
          {config.headline}
        </h2>
      </div>

      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {recipientName}, {config.message}
      </p>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>Vehicle</p>
        <p style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>{vehicleName}</p>
      </div>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={`https://autolenis.com/${isDealer ? "dealer" : "buyer"}/contracts/${dealId}`}
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
              {status === "PASS" ? (isDealer ? "View Deal" : "Proceed to Sign") : "View Details"}
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
