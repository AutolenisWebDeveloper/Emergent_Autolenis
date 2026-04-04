interface DealerApprovalEmailProps {
  businessName: string
}

export function DealerApprovalEmail({ businessName }: DealerApprovalEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ color: "#2D1B69", fontSize: "28px", margin: "0" }}>AutoLenis</h1>
        <p style={{ color: "#666", margin: "5px 0 0" }}>Dealer Network</p>
      </div>

      <div style={{ backgroundColor: "#e8f5e9", borderRadius: "12px", padding: "30px", marginBottom: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              backgroundColor: "#4caf50",
              borderRadius: "50%",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontSize: "30px" }}>✓</span>
          </div>
        </div>

        <h2 style={{ color: "#2e7d32", fontSize: "24px", textAlign: "center", marginTop: "0" }}>
          Congratulations! You're Approved
        </h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6", textAlign: "center" }}>
          <strong>{businessName}</strong> has been approved to join the AutoLenis Dealer Network!
        </p>
      </div>

      <div style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", padding: "30px", marginBottom: "20px" }}>
        <h3 style={{ color: "#2D1B69", fontSize: "18px", marginTop: "0" }}>What's Next?</h3>

        <div style={{ marginBottom: "15px" }}>
          <p style={{ color: "#333", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
            <strong>1. Complete Your Onboarding</strong>
            <br />
            Log in to your dealer portal to complete the onboarding process and set up your profile.
          </p>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <p style={{ color: "#333", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
            <strong>2. Upload Your Inventory</strong>
            <br />
            Add your vehicle inventory to start receiving auction invitations from qualified buyers.
          </p>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <p style={{ color: "#333", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
            <strong>3. Start Bidding</strong>
            <br />
            Once your inventory is set up, you'll receive invitations to bid on matching buyer requests.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: "25px" }}>
          <a
            href="https://autolenis.com/dealer/dashboard"
            style={{
              display: "inline-block",
              backgroundColor: "#7ED321",
              color: "#2D1B69",
              padding: "14px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            Go to Dealer Portal
          </a>
        </div>
      </div>

      <div style={{ backgroundColor: "#fff3e0", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <p style={{ color: "#e65100", fontSize: "14px", lineHeight: "1.6", margin: "0" }}>
          <strong>Need Help?</strong> Our dealer support team is here to help you get started. Contact us at{" "}
          <a href="mailto:info@autolenis.com" style={{ color: "#2D1B69" }}>
            info@autolenis.com
          </a>
        </p>
      </div>

      <div style={{ textAlign: "center", color: "#999", fontSize: "12px" }}>
        <p>Welcome to the AutoLenis Dealer Network!</p>
        <p>
          <a href="https://autolenis.com" style={{ color: "#2D1B69" }}>
            autolenis.com
          </a>
        </p>
      </div>
    </div>
  )
}
