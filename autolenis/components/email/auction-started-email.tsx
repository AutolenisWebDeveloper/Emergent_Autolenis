import { EmailLayout } from "./email-layout"

interface AuctionStartedEmailProps {
  buyerName: string
  vehicleName: string
  auctionId: string
  endsAt: string
  dealerCount: number
}

export function AuctionStartedEmail({
  buyerName,
  vehicleName,
  auctionId,
  endsAt,
  dealerCount,
}: AuctionStartedEmailProps) {
  return (
    <EmailLayout previewText={`Your auction for ${vehicleName} has started!`}>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        Your Auction Has Started!
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {buyerName}, dealers are now competing to give you the best price on your vehicle.
      </p>

      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: "18px",
            fontWeight: "600",
            color: "#166534",
          }}
        >
          {vehicleName}
        </h3>
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Auction ID:</span>
              <br />
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>#{auctionId.slice(0, 8)}</span>
            </td>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Ends:</span>
              <br />
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{endsAt}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Dealers Invited:</span>
              <br />
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{dealerCount} dealers</span>
            </td>
          </tr>
        </table>
      </div>

      <p
        style={{
          margin: "0 0 24px",
          fontSize: "14px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        We'll notify you as offers come in. You can view all offers and select your winner once the auction ends.
      </p>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={`https://autolenis.com/buyer/auction/${auctionId}`}
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
              View Auction Status
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
