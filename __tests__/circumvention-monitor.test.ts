import { describe, it, expect } from "vitest"
import { redactMessage } from "@/lib/services/circumvention-monitor.service"

describe("redactMessage", () => {
  it("redacts US phone numbers", () => {
    expect(redactMessage("Call me at (555) 123-4567")).toContain("[REDACTED]")
    expect(redactMessage("Text 555-123-4567")).toContain("[REDACTED]")
    expect(redactMessage("Reach me at 555.123.4567")).toContain("[REDACTED]")
    expect(redactMessage("+1 555 123 4567")).toContain("[REDACTED]")
  })

  it("redacts email addresses", () => {
    const result = redactMessage("Email me at john@example.com")
    expect(result).toContain("[REDACTED]")
    expect(result).not.toContain("john@example.com")
  })

  it("redacts URLs", () => {
    const result = redactMessage("Check https://example.com/page for details")
    expect(result).toContain("[REDACTED]")
    expect(result).not.toContain("https://example.com")
  })

  it("redacts social handles", () => {
    const result = redactMessage("Find me on Twitter @johndoe123")
    expect(result).toContain("[REDACTED]")
    expect(result).not.toContain("@johndoe123")
  })

  it("redacts Google Maps links", () => {
    const result = redactMessage("Meet here: https://google.com/maps/place/123")
    expect(result).toContain("[REDACTED]")
    expect(result).not.toContain("google.com/maps")
  })

  it("redacts Apple Maps links", () => {
    const result = redactMessage("Location: https://maps.apple.com/?q=123")
    expect(result).toContain("[REDACTED]")
    expect(result).not.toContain("maps.apple.com")
  })

  it("redacts multiple patterns in one message", () => {
    const msg = "Call (555) 999-8888, email bob@test.com, or visit https://deal.com"
    const result = redactMessage(msg)
    expect(result).not.toContain("555")
    expect(result).not.toContain("bob@test.com")
    expect(result).not.toContain("https://deal.com")
  })

  it("leaves clean messages untouched", () => {
    const msg = "I am interested in the blue sedan. What is the price?"
    expect(redactMessage(msg)).toBe(msg)
  })

  it("handles empty/null input", () => {
    expect(redactMessage("")).toBe("")
    expect(redactMessage(null as unknown as string)).toBe(null)
  })

  it("does not redact short @mentions (< 3 chars)", () => {
    expect(redactMessage("Send to @ab")).toBe("Send to @ab")
  })
})
