interface AffiliateCommissionEmailProps {
  affiliateName: string
  commissionAmount: number
  level: number
  dashboardUrl: string
}

export function AffiliateCommissionEmail({
  affiliateName,
  commissionAmount,
  level,
  dashboardUrl,
}: AffiliateCommissionEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ backgroundColor: "#3d2066", padding: "30px", textAlign: "center" as const }}>
        <h1 style={{ color: "#ffffff", margin: 0, fontSize: "28px" }}>Great News!</h1>
      </div>

      <div style={{ padding: "30px", backgroundColor: "#ffffff" }}>
        <p style={{ fontSize: "18px", color: "#333333", marginBottom: "20px" }}>Hi {affiliateName},</p>

        <p style={{ fontSize: "16px", color: "#333333", lineHeight: "1.6" }}>
          Someone just purchased a car using your AutoLenis referral link!
        </p>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "12px",
            padding: "24px",
            margin: "24px 0",
            textAlign: "center" as const,
          }}
        >
          <p style={{ fontSize: "14px", color: "#666666", margin: "0 0 8px 0" }}>Your Level {level} Commission</p>
          <p style={{ fontSize: "36px", fontWeight: "bold", color: "#22c55e", margin: 0 }}>
            ${commissionAmount.toFixed(2)}
          </p>
        </div>

        <p style={{ fontSize: "16px", color: "#333333", lineHeight: "1.6" }}>
          This commission has been added to your available balance and will be included in your next payout.
        </p>

        <div style={{ textAlign: "center" as const, margin: "32px 0" }}>
          <a
            href={dashboardUrl}
            style={{
              backgroundColor: "#3d2066",
              color: "#ffffff",
              padding: "14px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            View Your Dashboard
          </a>
        </div>

        <p style={{ fontSize: "14px", color: "#666666", lineHeight: "1.6" }}>
          Keep sharing your link to earn more commissions! Remember, you earn on 3 levels when your referrals also refer
          others.
        </p>
      </div>

      <div style={{ backgroundColor: "#f5f5f5", padding: "20px", textAlign: "center" as const }}>
        <p style={{ fontSize: "12px", color: "#666666", margin: 0 }}>
          AutoLenis Affiliate Program
          <br />
          Questions? Contact us at info@autolenis.com
        </p>
      </div>
    </div>
  )
}
