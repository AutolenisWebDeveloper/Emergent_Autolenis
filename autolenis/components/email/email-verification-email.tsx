interface EmailVerificationEmailProps {
  verificationUrl: string
  firstName?: string
}

export function EmailVerificationEmail({ verificationUrl, firstName = "there" }: EmailVerificationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ color: "#2D1B69", fontSize: "28px", margin: "0" }}>AutoLenis</h1>
      </div>

      <div style={{ backgroundColor: "#f8f9fa", borderRadius: "12px", padding: "30px", marginBottom: "20px" }}>
        <h2 style={{ color: "#2D1B69", fontSize: "24px", marginTop: "0" }}>Verify Your Email</h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>Hi {firstName},</p>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
          Thank you for signing up with AutoLenis! Please verify your email address by clicking the button below:
        </p>

        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <a
            href={verificationUrl}
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
            Verify Email Address
          </a>
        </div>

        <p style={{ color: "#999", fontSize: "14px", lineHeight: "1.6" }}>
          This link will expire in 24 hours. If you didn't create an account with AutoLenis, you can safely ignore this
          email.
        </p>
      </div>

      <div style={{ textAlign: "center", color: "#999", fontSize: "12px" }}>
        <p>AutoLenis — Car Buying. Reengineered.</p>
        <p>
          <a href="https://autolenis.com" style={{ color: "#2D1B69" }}>
            autolenis.com
          </a>
        </p>
      </div>
    </div>
  )
}
