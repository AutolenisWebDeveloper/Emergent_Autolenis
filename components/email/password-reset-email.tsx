import { EmailLayout } from "./email-layout"

interface PasswordResetEmailProps {
  firstName: string
  resetLink: string
}

export function PasswordResetEmail({ firstName, resetLink }: PasswordResetEmailProps) {
  return (
    <EmailLayout previewText="Reset your AutoLenis password">
      <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#2D1B69", marginBottom: "16px" }}>
        Reset Your Password
      </h1>

      <p style={{ fontSize: "16px", color: "#4B5563", marginBottom: "16px" }}>Hi {firstName},</p>

      <p style={{ fontSize: "16px", color: "#4B5563", marginBottom: "24px" }}>
        We received a request to reset your AutoLenis account password. Click the button below to create a new password:
      </p>

      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <a
          href={resetLink}
          style={{
            display: "inline-block",
            backgroundColor: "#7ED321",
            color: "#2D1B69",
            fontSize: "16px",
            fontWeight: "bold",
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Reset Password
        </a>
      </div>

      <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "16px" }}>
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>

      <div
        style={{
          backgroundColor: "#F3F4F6",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>
          Having trouble with the button? Copy and paste this URL into your browser:
        </p>
        <p style={{ fontSize: "12px", color: "#2D1B69", wordBreak: "break-all" }}>{resetLink}</p>
      </div>

      <p style={{ fontSize: "14px", color: "#6B7280" }}>
        If you didn't make this request, please contact our support team at{" "}
        <a href="mailto:info@autolenis.com" style={{ color: "#2D1B69" }}>
          info@autolenis.com
        </a>
      </p>
    </EmailLayout>
  )
}
