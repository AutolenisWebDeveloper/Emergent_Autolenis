import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components"

interface RefinanceQualifiedEmailProps {
  firstName: string
  lenderApplicationUrl: string
  referenceId: string
}

export const RefinanceQualifiedEmail = ({
  firstName,
  lenderApplicationUrl,
  referenceId,
}: RefinanceQualifiedEmailProps) => (
  <Html>
    <Head />
    <Preview>You're pre-qualified! Continue to complete your application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://autolenis.com/logo.svg" width="40" height="40" alt="AutoLenis" />
        </Section>

        <Section style={box}>
          <Section style={successBanner}>
            <Text style={successText}>✓ You're Pre-Qualified!</Text>
          </Section>

          <Text style={heading}>Great News, {firstName}!</Text>
          <Text style={paragraph}>
            Your refinance application has been pre-approved, and you're ready to proceed with our lending partner to
            complete your application.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightLabel}>Your Reference ID:</Text>
            <Text style={highlightValue}>{referenceId}</Text>
          </Section>

          <Text style={paragraph}>
            <strong>Next Steps:</strong>
          </Text>
          <Text style={paragraph}>
            Click the button below to complete your lender application. You'll need to provide additional documentation
            and sign the application form. This typically takes 10-15 minutes.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={lenderApplicationUrl}>
              Continue to Application
            </Button>
          </Section>

          <Text style={paragraph}>If you don't see the button above, copy and paste this link into your browser:</Text>
          <Text style={linkText}>{lenderApplicationUrl}</Text>

          <Hr style={hr} />

          <Text style={paragraph}>
            <strong>What to expect:</strong>
          </Text>
          <ul style={bulletList}>
            <li style={bulletItem}>Complete the lender's application form (10-15 min)</li>
            <li style={bulletItem}>Upload required documents (pay stubs, ID, proof of insurance)</li>
            <li style={bulletItem}>Review and sign loan documents</li>
            <li style={bulletItem}>Receive final approval and loan terms</li>
          </ul>

          <Text style={paragraph}>
            Once you've completed the lender application, you'll receive a separate communication with your loan terms
            and next steps.
          </Text>

          <Text style={paragraph}>
            Questions? Contact us at{" "}
            <Link href="mailto:info@autolenis.com" style={link}>
              info@autolenis.com
            </Link>{" "}
            - we're here to help!
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

const successBanner = {
  backgroundColor: "#e8f5e9",
  padding: "16px",
  textAlign: "center" as const,
  borderRadius: "4px",
  marginBottom: "24px",
}

const successText = {
  color: "#2e7d32",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
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

const highlightBox = {
  backgroundColor: "#f3e5f5",
  borderLeft: "4px solid #3d2066",
  padding: "16px",
  margin: "24px 0",
}

const highlightLabel = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#3d2066",
  margin: "0 0 8px 0",
}

const highlightValue = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#3d2066",
  margin: "0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#3d2066",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 32px",
  margin: "0 auto",
}

const linkText = {
  color: "#3d2066",
  fontSize: "12px",
  wordBreak: "break-all" as const,
  backgroundColor: "#f9f9f9",
  padding: "12px",
  borderRadius: "4px",
  margin: "16px 0",
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
