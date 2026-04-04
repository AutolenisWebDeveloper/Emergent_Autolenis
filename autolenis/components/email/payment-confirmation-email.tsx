import { EmailLayout } from "./email-layout"

interface PaymentConfirmationEmailProps {
  buyerName: string
  paymentType: "DEPOSIT" | "SERVICE_FEE"
  amount: string
  vehicleName?: string
  transactionId: string
  date: string
}

export function PaymentConfirmationEmail({
  buyerName,
  paymentType,
  amount,
  vehicleName,
  transactionId,
  date,
}: PaymentConfirmationEmailProps) {
  const typeConfig = {
    DEPOSIT: {
      title: "Deposit Confirmed",
      description: "Your refundable deposit has been received.",
    },
    SERVICE_FEE: {
      title: "Service Fee Payment Confirmed",
      description: "Your AutoLenis service fee has been processed.",
    },
  }

  const config = typeConfig[paymentType]

  return (
    <EmailLayout previewText={`${config.title} - ${amount}`}>
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
          <span style={{ fontSize: "32px" }}>✓</span>
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#166534",
          }}
        >
          {config.title}
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
        Hi {buyerName}, {config.description}
      </p>

      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <table role="presentation" width="100%">
          <tr>
            <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Amount</span>
            </td>
            <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#111827" }}>{amount}</span>
            </td>
          </tr>
          {vehicleName && (
            <tr>
              <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>Vehicle</span>
              </td>
              <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{vehicleName}</span>
              </td>
            </tr>
          )}
          <tr>
            <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Transaction ID</span>
            </td>
            <td style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>
              <span style={{ fontSize: "14px", fontFamily: "monospace", color: "#111827" }}>{transactionId}</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Date</span>
            </td>
            <td style={{ padding: "8px 0", textAlign: "right" }}>
              <span style={{ fontSize: "14px", color: "#111827" }}>{date}</span>
            </td>
          </tr>
        </table>
      </div>

      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <a
              href="https://autolenis.com/buyer/dashboard"
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
              View Dashboard
            </a>
          </td>
        </tr>
      </table>
    </EmailLayout>
  )
}
