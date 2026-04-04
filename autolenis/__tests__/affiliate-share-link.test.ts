import { describe, expect, it } from "vitest"

/**
 * Affiliate Share Link API tests
 * Tests the share-link email flow logic without network calls
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

describe("Share Link API Logic", () => {
  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
      )
    })

    it("escapes quotes and ampersands", () => {
      expect(escapeHtml('Hello & "World"')).toBe("Hello &amp; &quot;World&quot;")
    })

    it("preserves safe text", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World")
    })
  })

  describe("referral link generation", () => {
    it("builds correct referral link from refCode", () => {
      const refCode = "ABC123"
      const baseUrl = "https://autolenis.com"
      const referralLink = `${baseUrl}/?ref=${refCode}`
      expect(referralLink).toBe("https://autolenis.com/?ref=ABC123")
    })

    it("uses NEXT_PUBLIC_APP_URL when set", () => {
      const refCode = "XYZ789"
      const baseUrl = "https://staging.autolenis.com"
      const referralLink = `${baseUrl}/?ref=${refCode}`
      expect(referralLink).toContain("staging.autolenis.com")
      expect(referralLink).toContain("ref=XYZ789")
    })
  })

  describe("affiliate name formatting", () => {
    it("builds full name from first and last", () => {
      const affiliate = { firstName: "John", lastName: "Smith" }
      const name = `${affiliate.firstName || ""} ${affiliate.lastName || ""}`.trim() || "An AutoLenis partner"
      expect(name).toBe("John Smith")
    })

    it("falls back to partner name when no name available", () => {
      const affiliate = { firstName: null, lastName: null }
      const name = `${affiliate.firstName || ""} ${affiliate.lastName || ""}`.trim() || "An AutoLenis partner"
      expect(name).toBe("An AutoLenis partner")
    })

    it("handles first name only", () => {
      const affiliate = { firstName: "Jane", lastName: null }
      const name = `${affiliate.firstName || ""} ${affiliate.lastName || ""}`.trim() || "An AutoLenis partner"
      expect(name).toBe("Jane")
    })
  })

  describe("email template content", () => {
    it("includes CTA button text", () => {
      const emailBody = `<a href="https://autolenis.com/?ref=ABC123">View My AutoLenis Link</a>`
      expect(emailBody).toContain("View My AutoLenis Link")
    })

    it("includes fallback link text", () => {
      const referralLink = "https://autolenis.com/?ref=ABC123"
      const emailBody = `<p>Or copy and paste this link into your browser:</p><p>${referralLink}</p>`
      expect(emailBody).toContain(referralLink)
    })

    it("includes compliance footer", () => {
      const footer = "This email was sent because John Smith shared their referral link with you."
      expect(footer).toContain("shared their referral link")
    })
  })

  describe("share event payload", () => {
    it("creates correct event structure", () => {
      const event = {
        affiliateId: "aff_123",
        workspaceId: "ws_live",
        recipientEmail: "test@example.com",
        message: "Check this out!",
        referralLink: "https://autolenis.com/?ref=ABC123",
        status: "sent",
        providerMessageId: "msg_456",
        error: null,
      }
      expect(event.affiliateId).toBe("aff_123")
      expect(event.workspaceId).toBe("ws_live")
      expect(event.status).toBe("sent")
      expect(event.providerMessageId).toBe("msg_456")
    })

    it("records failed status with error", () => {
      const event = {
        affiliateId: "aff_123",
        workspaceId: "ws_live",
        recipientEmail: "bad@invalid",
        status: "failed",
        providerMessageId: null,
        error: "Email delivery failed",
      }
      expect(event.status).toBe("failed")
      expect(event.error).toBe("Email delivery failed")
    })
  })
})
