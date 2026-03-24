import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components"

interface RefinanceDeclinedEmailProps {
  firstName: string
  reasons: string[]
  referenceId: string
}

const reasonMessages: Record<string, string> = {
  lender_vehicle_too_old: "Your vehicle is older than our lending partner's requirements",
  lender_mileage_too_high: "Your vehicle mileage exceeds our lending partner's limits",
  lender_income_too_low: "Your reported income doesn't meet our lending partner's minimum",
  lender_state_not_allowed: "Lending is not available in your state at this time",
  internal_loan_balance_too_low: "Your loan balance is below our minimum refinance amount",
  internal_vehicle_condition_poor: "Your vehicle condition doesn't meet our quality standards",
}

export const RefinanceDeclinedEmail = ({ firstName, reasons, referenceId }: RefinanceDeclinedEmailProps) => (
  <Html>
    <Head />
    <Preview>Update on your refinance application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://autolenis.com/logo.svg" width="40" height="40" alt="AutoLenis" />
        </Section>

        <Section style={box}>
          <Text style={heading}>Application Update</Text>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Thank you for submitting your refinance application. After reviewing your information, we're unable to move
            forward with your application at this time through our current lending partners.
          </Text>

          <Section style={reasonBox}>
            <Text style={reasonLabel}>Reasons for this decision:</Text>
            <ul style={bulletList}>
              {reasons.map((reason) => (
                <li key={reason} style={bulletItem}>
                  {reasonMessages[reason] || reason}
                </li>
              ))}
            </ul>
          </Section>

          <Text style={paragraph}>
            <strong>What you can do:</strong>
          </Text>
          <ul style={bulletList}>
            <li style={bulletItem}>Reach out in 6-12 months if your circumstances have changed</li>
            <li style={bulletItem}>Contact our support team to discuss alternative options</li>
            <li style={bulletItem}>Explore other refinancing options through local credit unions or banks</li>
          </ul>

          <Text style={paragraph}>
            We appreciate you considering AutoLenis, and we'd love to help in the future if your situation changes.
            Please feel free to reach out anytime at{" "}
            <Link href="mailto:info@autolenis.com" style={link}>
              info@autolenis.com
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Section style={infoBox}>
            <Text style={infoLabel}>Reference ID</Text>
            <Text style={infoValue}>{referenceId}</Text>
          </Section>

          <Text style={footer}>© 2025 AutoLenis. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: "#f4f4f4",
  fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
}

const logoSection = {
  padding: "32px 20px",
  textAlign: "center" as const,
}

const box = {
  padding: "0 48px",
}

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#3d2066",
  margin: "0 0 16px 0",
}

const paragraph = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
  margin: "0 0 16px 0",
}

const reasonBox = {
  backgroundColor: "#fff3e0",
  borderLeft: "4px solid #f57c00",
  padding: "16px",
  margin: "24px 0",
}

const reasonLabel = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#f57c00",
  margin: "0 0 12px 0",
}

const infoBox = {
  backgroundColor: "#f9f9f9",
  borderLeft: "4px solid #3d2066",
  padding: "16px",
  margin: "24px 0",
}

const infoLabel = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#666666",
  textTransform: "uppercase" as const,
  margin: "0 0 8px 0",
}

const infoValue = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#3d2066",
  margin: "0",
}

const bulletList = {
  margin: "12px 0",
  paddingLeft: "24px",
}

const bulletItem = {
  margin: "8px 0",
  color: "#525252",
  fontSize: "16px",
}

const link = {
  color: "#3d2066",
  textDecoration: "underline",
}

const hr = {
  borderColor: "#e5e5e5",
  margin: "32px 0",
}

const footer = {
  color: "#999999",
  fontSize: "12px",
  textAlign: "center" as const,
}
