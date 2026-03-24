import { describe, it, expect } from "vitest"
import { IdentityFirewallService } from "@/lib/services/identity-firewall.service"

const service = new IdentityFirewallService()

describe("Identity Firewall Service", () => {
  describe("Phone number detection", () => {
    it("should detect US phone numbers with dashes", () => {
      const result = service.scan("Call me at 555-123-4567")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.redactedText).toContain("[REDACTED]")
      expect(result.redactedText).not.toContain("555-123-4567")
      expect(result.detections.some((d) => d.type === "phone")).toBe(true)
    })

    it("should detect phone numbers with parentheses", () => {
      const result = service.scan("My number is (555) 123-4567")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.redactedText).not.toContain("(555) 123-4567")
    })

    it("should detect phone numbers with dots", () => {
      const result = service.scan("Reach me at 555.123.4567")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.redactedText).not.toContain("555.123.4567")
    })

    it("should detect phone numbers with +1 prefix", () => {
      const result = service.scan("Contact: +1-555-123-4567")
      expect(result.containsSensitiveData).toBe(true)
    })
  })

  describe("Email detection", () => {
    it("should detect standard email addresses", () => {
      const result = service.scan("Email me at buyer@gmail.com")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.redactedText).not.toContain("buyer@gmail.com")
      expect(result.detections.some((d) => d.type === "email")).toBe(true)
    })

    it("should detect complex email addresses", () => {
      const result = service.scan("My email: john.doe+test@company.co.uk")
      expect(result.containsSensitiveData).toBe(true)
    })
  })

  describe("URL detection", () => {
    it("should detect HTTP URLs", () => {
      const result = service.scan("Visit http://mysite.com for details")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.redactedText).not.toContain("http://mysite.com")
    })

    it("should detect HTTPS URLs", () => {
      const result = service.scan("Check https://www.dealership.com/inventory")
      expect(result.containsSensitiveData).toBe(true)
    })
  })

  describe("Social media handle detection", () => {
    it("should detect @handles", () => {
      const result = service.scan("Find me on @johndoe_dealer")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.detections.some((d) => d.type === "social_handle")).toBe(true)
    })

    it("should detect platform-specific patterns", () => {
      const result = service.scan("My instagram: dealer_auto123")
      expect(result.containsSensitiveData).toBe(true)
    })
  })

  describe("Address detection", () => {
    it("should detect street addresses", () => {
      const result = service.scan("Come to 1234 Main Street")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.detections.some((d) => d.type === "address")).toBe(true)
    })

    it("should detect various street types", () => {
      const r1 = service.scan("Located at 500 Oak Ave")
      expect(r1.containsSensitiveData).toBe(true)

      const r2 = service.scan("Visit us at 200 Pine Blvd")
      expect(r2.containsSensitiveData).toBe(true)
    })
  })

  describe("Safe messages", () => {
    it("should not flag normal conversation", () => {
      const result = service.scan("I'm interested in the 2024 Toyota Camry. What's the best price?")
      expect(result.containsSensitiveData).toBe(false)
      expect(result.redactedText).toBe("I'm interested in the 2024 Toyota Camry. What's the best price?")
    })

    it("should not flag pricing discussions", () => {
      const result = service.scan("The vehicle is listed at $35,000. Can you do $32,500?")
      expect(result.containsSensitiveData).toBe(false)
    })

    it("should not flag empty messages", () => {
      const result = service.scan("")
      expect(result.containsSensitiveData).toBe(false)
      expect(result.detections).toHaveLength(0)
    })
  })

  describe("Multiple detections", () => {
    it("should detect multiple types in one message", () => {
      const result = service.scan("Call me at 555-123-4567 or email buyer@test.com")
      expect(result.containsSensitiveData).toBe(true)
      expect(result.detections.length).toBeGreaterThanOrEqual(2)
      expect(result.redactedText).not.toContain("555-123-4567")
      expect(result.redactedText).not.toContain("buyer@test.com")
    })
  })
})
