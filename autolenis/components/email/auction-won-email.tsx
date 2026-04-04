import { EmailLayout } from "./email-layout"

interface AuctionWonEmailProps {
  dealerName: string
  vehicleName: string
  buyerName: string
  winningPrice: string
  auctionId: string
}

export function AuctionWonEmail({ dealerName, vehicleName, buyerName, winningPrice }: AuctionWonEmailProps) {
  return (
    <EmailLayout previewText={`Congratulations! You won the auction for ${vehicleName}`}>
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
          <span style={{ fontSize: "32px" }}>🎉</span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#166534",
          }}
        >
          Congratulations, You Won!
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
        Hi {dealerName}, your offer has been selected by the buyer!
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
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Vehicle:</span>
              <br />
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{vehicleName}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Buyer:</span>
              <br />
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827" }}>{buyerName}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Winning Price:</span>
              <br />
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "#166534" }}>{winningPrice}</span>
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
        <strong>Next Steps:</strong> Upload the contract documents for Contract Shield review. The buyer will be able to
        proceed once the contracts pass our verification.
      </p>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={`https://autolenis.com/dealer/contracts`}
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
              Upload Contracts
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
