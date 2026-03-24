import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components"

interface RefinanceSubmissionEmailProps {
  firstName: string
  email: string
  referenceId: string
}

export const RefinanceSubmissionEmail = ({ firstName, email: _email, referenceId }: RefinanceSubmissionEmailProps) => (
  <Html>
    <Head />
    <Preview>We received your refinance request</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://autolenis.com/logo.svg" width="40" height="40" alt="AutoLenis" />
        </Section>

        <Section style={box}>
          <Text style={heading}>We've Received Your Refinance Request</Text>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Thank you for submitting your car refinance request to AutoLenis. We're excited to help you find better loan
            terms!
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Reference ID</Text>
            <Text style={infoValue}>{referenceId}</Text>
            <Text style={infoSubtext}>Save this for your records</Text>
          </Section>

          <Text style={paragraph}>
            <strong>What happens next:</strong>
          </Text>
          <Text style={paragraph}>
            Our team is reviewing your application against our lending partners' criteria. We'll send you an update
            within 2-4 business hours with your pre-qualification status.
          </Text>

          <Text style={paragraph}>In the meantime, you can:</Text>
          <ul style={bulletList}>
            <li style={bulletItem}>Keep your vehicle information handy</li>
            <li style={bulletItem}>Prepare any recent loan documents</li>
            <li style={bulletItem}>Have your ID ready for the lender application</li>
          </ul>

          <Text style={paragraph}>
            If you have any questions, don't hesitate to reach out to our support team at{" "}
            <Link href="mailto:info@autolenis.com" style={link}>
              info@autolenis.com
            </Link>
            .
          </Text>

          <Hr style={hr} />
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
  margin: "0 0 24px 0",
}

const paragraph = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
  margin: "0 0 16px 0",
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
  fontSize: "18px",
  fontWeight: "bold",
  color: "#3d2066",
  margin: "0 0 4px 0",
}

const infoSubtext = {
  fontSize: "12px",
  color: "#999999",
  margin: "0",
}

const bulletList = {
  margin: "16px 0",
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
