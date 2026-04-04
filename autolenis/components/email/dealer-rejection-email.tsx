interface DealerRejectionEmailProps {
  businessName: string
  reason: string
}

export function DealerRejectionEmail({ businessName, reason }: DealerRejectionEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ color: "#2D1B69", fontSize: "28px", margin: "0" }}>AutoLenis</h1>
        <p style={{ color: "#666", margin: "5px 0 0" }}>Dealer Network</p>
      </div>

      <div style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", padding: "30px", marginBottom: "20px" }}>
        <h2 style={{ color: "#2D1B69", fontSize: "24px", marginTop: "0" }}>Application Update</h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
          Thank you for your interest in joining the AutoLenis Dealer Network. After careful review, we were unable to
          approve the application for <strong>{businessName}</strong> at this time.
        </p>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
            border: "1px solid #e0e0e0",
          }}
        >
          <p style={{ color: "#333", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
            <strong>Reason:</strong>
            <br />
            {reason}
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: "#e3f2fd", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ color: "#1565c0", fontSize: "16px", marginTop: "0" }}>What Can You Do?</h3>
        <ul style={{ color: "#666", fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px", margin: "0" }}>
          <li>Review the reason provided and address any issues</li>
          <li>Gather any additional documentation that may be needed</li>
          <li>Contact our support team for clarification</li>
          <li>Reapply once the issues have been resolved</li>
        </ul>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <a
          href="https://autolenis.com/dealer-application"
          style={{
            display: "inline-block",
            backgroundColor: "#2D1B69",
            color: "#ffffff",
            padding: "12px 28px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Reapply Later
        </a>
      </div>

      <div style={{ textAlign: "center", color: "#999", fontSize: "12px" }}>
        <p>
          Questions? Contact us at{" "}
          <a href="mailto:info@autolenis.com" style={{ color: "#2D1B69" }}>
            info@autolenis.com
          </a>
        </p>
        <p>
          <a href="https://autolenis.com" style={{ color: "#2D1B69" }}>
            autolenis.com
          </a>
        </p>
      </div>
    </div>
  )
}
