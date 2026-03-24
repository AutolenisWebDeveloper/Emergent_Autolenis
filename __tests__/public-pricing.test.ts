import { describe, it, expect } from "vitest"
import { PUBLIC_PRICING } from "@/lib/config/public-pricing"

describe("Public Pricing Config", () => {
  it("Standard displays 'Free Plan' with no dollar amount", () => {
    expect(PUBLIC_PRICING.STANDARD.displayPrice).toBe("Free Plan")
    expect(PUBLIC_PRICING.STANDARD.displayPrice).not.toContain("$0")
  })

  it("Standard subtitle is correct", () => {
    expect(PUBLIC_PRICING.STANDARD.subtitle).toBe("Get started at no cost")
  })

  it("Standard deposit credit message is correct", () => {
    expect(PUBLIC_PRICING.STANDARD.depositCreditMessage).toBe(
      "$99 deposit credited toward your vehicle purchase at closing",
    )
  })

  it("Premium displays '$499 concierge fee'", () => {
    expect(PUBLIC_PRICING.PREMIUM.displayPrice).toBe("$499 concierge fee")
  })

  it("Premium subtitle is correct", () => {
    expect(PUBLIC_PRICING.PREMIUM.subtitle).toBe("Full concierge experience")
  })

  it("Premium deposit credit message is correct", () => {
    expect(PUBLIC_PRICING.PREMIUM.depositCreditMessage).toBe(
      "$99 deposit credited toward fee — $400 remaining",
    )
  })

  it("Premium remaining after deposit is $400", () => {
    expect(PUBLIC_PRICING.PREMIUM.remainingAfterDeposit).toBe(400)
  })

  it("Deposit amount is $99", () => {
    expect(PUBLIC_PRICING.DEPOSIT).toBe(99)
  })
})
