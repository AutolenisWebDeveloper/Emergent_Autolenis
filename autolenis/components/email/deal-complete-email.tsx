import { escapeHtml } from "@/lib/utils/escape-html"
import { EmailLayout } from "./email-layout"

interface DealCompleteEmailProps {
  buyerName: string
  vehicleName: string
  dealerName: string
  totalPrice: string
  savings: string
  pickupDate: string
  pickupLocation: string
}

export function DealCompleteEmail({
  buyerName,
  vehicleName,
  dealerName,
  totalPrice,
  savings,
  pickupDate,
  pickupLocation,
}: DealCompleteEmailProps) {
  const safeBuyerName = escapeHtml(buyerName)
  const safeVehicleName = escapeHtml(vehicleName)
  const safeDealerName = escapeHtml(dealerName)
  const safeTotalPrice = escapeHtml(totalPrice)
  const safeSavings = escapeHtml(savings)
  const safePickupDate = escapeHtml(pickupDate)
  const safePickupLocation = escapeHtml(pickupLocation)

  return (
    <EmailLayout previewText={`Congratulations on your new ${safeVehicleName}!`}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#2D1B69",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "40px" }}>🚗</span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "28px",
            fontWeight: "bold",
            color: "#2D1B69",
          }}
        >
          Congratulations!
        </h2>
        <p style={{ margin: 0, fontSize: "18px", color: "#4b5563" }}>Your deal is complete</p>
      </div>

      <p
        style={{
          margin: "0 0 24px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        Hi {safeBuyerName}, you've successfully purchased your new vehicle through AutoLenis!
      </p>

      <div
        style={{
          background: "linear-gradient(135deg, #2D1B69 0%, #4c1d95 100%)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          color: "#ffffff",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: "bold" }}>{safeVehicleName}</h3>
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", opacity: 0.8 }}>Total Price</span>
              <br />
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>{safeTotalPrice}</span>
            </td>
            <td style={{ padding: "8px 0", textAlign: "right" }}>
              <span style={{ fontSize: "14px", opacity: 0.8 }}>You Saved</span>
              <br />
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "#7ED321" }}>{safeSavings}</span>
            </td>
          </tr>
        </table>
      </div>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h4 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "600", color: "#111827" }}>Pickup Details</h4>
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "4px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Dealer:</span>
            </td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{safeDealerName}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "4px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Date:</span>
            </td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{safePickupDate}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "4px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Location:</span>
            </td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{safePickupLocation}</span>
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
        Don't forget to bring a valid ID and your insurance information to the pickup. If you have any questions, please
        contact us or the dealer directly.
      </p>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href="https://autolenis.com/buyer/deal"
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
              View Deal Details
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
