import { describe, it, expect } from "vitest"

/**
 * Admin Settings API — validation unit tests
 *
 * Tests the whitelist-based key validation and value checks
 * used by the POST /api/admin/settings endpoint.
 */

const ALLOWED_SETTING_KEYS = new Set([
  "deposit_amount",
  "fee_tier_one_cents",
  "fee_tier_two_cents",
  "fee_threshold_cents",
  "auction_duration_hours",
  "deposit_grace_period_hours",
  "fee_financing_enabled",
  "affiliate_commission_l1",
  "affiliate_commission_l2",
  "affiliate_commission_l3",
  "affiliate_commission_l4",
  "affiliate_commission_l5",
  "affiliate_min_payout",
  "branding",
])

function validateSettingInput(key: unknown, value: unknown) {
  if (typeof key !== "string" || !ALLOWED_SETTING_KEYS.has(key)) {
    return { valid: false, code: "INVALID_KEY" }
  }
  if (value === undefined || value === null) {
    return { valid: false, code: "INVALID_VALUE" }
  }
  return { valid: true }
}

describe("Admin Settings Validation", () => {
  describe("key validation", () => {
    it("should accept valid setting keys", () => {
      for (const key of ALLOWED_SETTING_KEYS) {
        expect(validateSettingInput(key, 100).valid).toBe(true)
      }
    })

    it("should reject unknown keys", () => {
      const result = validateSettingInput("unknown_key", 123)
      expect(result.valid).toBe(false)
      expect(result.code).toBe("INVALID_KEY")
    })

    it("should reject non-string keys", () => {
      expect(validateSettingInput(123, "value").valid).toBe(false)
      expect(validateSettingInput(null, "value").valid).toBe(false)
      expect(validateSettingInput(undefined, "value").valid).toBe(false)
    })

    it("should reject empty string keys", () => {
      expect(validateSettingInput("", "value").valid).toBe(false)
    })
  })

  describe("value validation", () => {
    it("should accept numeric values", () => {
      expect(validateSettingInput("deposit_amount", 99).valid).toBe(true)
    })

    it("should accept string values", () => {
      expect(validateSettingInput("deposit_amount", "99").valid).toBe(true)
    })

    it("should accept object values (e.g., branding)", () => {
      expect(
        validateSettingInput("branding", { siteName: "AutoLenis" }).valid
      ).toBe(true)
    })

    it("should reject null values", () => {
      const result = validateSettingInput("deposit_amount", null)
      expect(result.valid).toBe(false)
      expect(result.code).toBe("INVALID_VALUE")
    })

    it("should reject undefined values", () => {
      const result = validateSettingInput("deposit_amount", undefined)
      expect(result.valid).toBe(false)
      expect(result.code).toBe("INVALID_VALUE")
    })
  })
})
