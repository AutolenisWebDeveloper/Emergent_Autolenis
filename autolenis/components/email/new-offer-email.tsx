import { escapeHtml } from "@/lib/utils/escape-html"
import { EmailLayout } from "./email-layout"

interface NewOfferEmailProps {
  buyerName: string
  vehicleName: string
  auctionId: string
  offerCount: number
  lowestPrice: string
}

export function NewOfferEmail({ buyerName, vehicleName, auctionId, offerCount, lowestPrice }: NewOfferEmailProps) {
  const safeBuyerName = escapeHtml(buyerName)
  const safeVehicleName = escapeHtml(vehicleName)
  const safeLowestPrice = escapeHtml(lowestPrice)

  return (
    <EmailLayout previewText={`New offer received for ${safeVehicleName}!`}>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        New Offer Received!
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {safeBuyerName}, you have a new offer on your auction.
      </p>

      <div
        style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#6b7280" }}>{safeVehicleName}</p>
        <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280" }}>
          {offerCount} offer{offerCount > 1 ? "s" : ""} received
        </p>
        <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#6b7280" }}>Current Best Price</p>
        <p
          style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: "bold",
            color: "#166534",
          }}
        >
          {safeLowestPrice}
        </p>
      </div>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href={`https://autolenis.com/buyer/auction/${auctionId}/offers`}
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
              View All Offers
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
