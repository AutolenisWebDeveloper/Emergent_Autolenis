import { EmailLayout } from "./email-layout"

interface ReferralCommissionEmailProps {
  affiliateName: string
  referredBuyerName: string
  commissionAmount: string
  tier: number
  totalEarnings: string
}

export function ReferralCommissionEmail({
  affiliateName,
  referredBuyerName,
  commissionAmount,
  tier,
  totalEarnings,
}: ReferralCommissionEmailProps) {
  return (
    <EmailLayout previewText={`You earned ${commissionAmount} from a referral!`}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#dcfce7",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "32px" }}>💰</span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#166534",
          }}
        >
          Commission Earned!
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
        Hi {affiliateName}, you've earned a commission from your referral network!
      </p>

      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>Commission Earned</p>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "36px",
            fontWeight: "bold",
            color: "#166534",
          }}
        >
          {commissionAmount}
        </p>
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Referred Buyer</span>
              <br />
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{referredBuyerName}</span>
            </td>
            <td style={{ padding: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Tier Level</span>
              <br />
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Level {tier}</span>
            </td>
          </tr>
        </table>
      </div>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "16px 24px",
          marginBottom: "24px",
        }}
      >
        <table role="presentation" width="100%">
          <tr>
            <td>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Total Earnings</span>
            </td>
            <td style={{ textAlign: "right" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#2D1B69" }}>{totalEarnings}</span>
            </td>
          </tr>
        </table>
      </div>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href="https://autolenis.com/affiliate/dashboard"
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
              View Earnings
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
