import { EmailLayout } from "./email-layout"

interface AdminVehicleRequestEmailProps {
  buyerName: string
  buyerEmail: string
  marketZip: string
  vehicles: Array<{
    make: string
    model?: string
    yearMin?: number
    yearMax?: number
    condition: string
    budgetType?: string
    maxTotalOtdBudgetCents?: number | null
    maxMonthlyPaymentCents?: number | null
    desiredDownPaymentCents?: number | null
  }>
}

function formatCentsAsDollars(cents: number | null | undefined): string {
  if (cents == null) return "—"
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function budgetTypeLabel(bt?: string): string {
  if (bt === "TOTAL_PRICE") return "Total Out-the-Door"
  if (bt === "MONTHLY_PAYMENT") return "Monthly Payment"
  if (bt === "TOTAL") return "Total Price"
  if (bt === "MONTHLY") return "Monthly"
  return bt ?? "—"
}

export function AdminVehicleRequestEmail({
  buyerName,
  buyerEmail,
  marketZip,
  vehicles,
}: AdminVehicleRequestEmailProps) {
  return (
    <EmailLayout previewText={`New Vehicle Request from ${buyerName}`}>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2D1B69",
        }}
      >
        New Vehicle Request
      </h2>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "16px",
          color: "#4b5563",
          lineHeight: "1.6",
        }}
      >
        A new vehicle request has been submitted and is ready for review.
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          margin: "0 0 24px",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: "14px",
                width: "120px",
              }}
            >
              Buyer
            </td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {buyerName}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Email
            </td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "14px",
              }}
            >
              {buyerEmail}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Market ZIP
            </td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "14px",
              }}
            >
              {marketZip}
            </td>
          </tr>
          {vehicles.map((v, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                Vehicle {vehicles.length > 1 ? `#${i + 1}` : ""}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "14px",
                }}
              >
                {v.yearMin && v.yearMax
                  ? `${v.yearMin}–${v.yearMax} `
                  : v.yearMin
                    ? `${v.yearMin}+ `
                    : v.yearMax
                      ? `up to ${v.yearMax} `
                      : ""}
                {v.make}
                {v.model ? ` ${v.model}` : ""} ({v.condition})
                {v.budgetType && (
                  <>
                    <br />
                    <span style={{ color: "#6b7280" }}>
                      Budget Type: {budgetTypeLabel(v.budgetType)}
                    </span>
                  </>
                )}
                {v.maxTotalOtdBudgetCents != null && (
                  <>
                    <br />
                    <span style={{ color: "#6b7280" }}>
                      OTD Budget: {formatCentsAsDollars(v.maxTotalOtdBudgetCents)}
                    </span>
                  </>
                )}
                {v.maxMonthlyPaymentCents != null && (
                  <>
                    <br />
                    <span style={{ color: "#6b7280" }}>
                      Max Monthly: {formatCentsAsDollars(v.maxMonthlyPaymentCents)}
                    </span>
                  </>
                )}
                {v.desiredDownPaymentCents != null && (
                  <>
                    <br />
                    <span style={{ color: "#6b7280" }}>
                      Down Payment: {formatCentsAsDollars(v.desiredDownPaymentCents)}
                    </span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <a
        href={`${process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"}/admin/sourcing`}
        style={{
          display: "inline-block",
          background: "#2D1B69",
          color: "white",
          padding: "12px 24px",
          textDecoration: "none",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        View in Sourcing Queue
      </a>

      <p
        style={{
          margin: "24px 0 0",
          fontSize: "13px",
          color: "#9ca3af",
        }}
      >
        This is an automated notification from the AutoLenis platform.
      </p>
    </EmailLayout>
  )
}
