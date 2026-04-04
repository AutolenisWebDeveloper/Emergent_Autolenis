import { describe, it, expect, vi } from "vitest"

// Mock server-only (admin-auth.ts imports it)
vi.mock("server-only", () => ({}))

// Mock dependencies that admin-auth.ts needs
vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null }) }) }) }) },
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null }) }) }), insert: () => ({ data: null }), update: () => ({ eq: () => ({ data: null, error: null }) }) }),
  }),
}))

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  generateTotpSecret,
  generateTotpUri,
  generateQrCodeDataUrl,
  checkRateLimit,
  recordLoginAttempt,
  checkMfaRateLimit,
  recordMfaAttempt,
  generateSessionId,
} from "@/lib/admin-auth"

describe("MFA Recovery Codes", () => {
  it("generateRecoveryCodes produces 10 unique 8-char hex codes", () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(10)
    for (const code of codes) {
      expect(code).toMatch(/^[0-9a-f]{8}$/)
    }
    // All codes should be unique
    const unique = new Set(codes)
    expect(unique.size).toBe(10)
  })

  it("hashRecoveryCode produces consistent SHA-256 hex", async () => {
    const hash1 = await hashRecoveryCode("abc12345")
    const hash2 = await hashRecoveryCode("abc12345")
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[0-9a-f]{64}$/)
  })

  it("hashRecoveryCode is case-insensitive and strips whitespace", async () => {
    const hash1 = await hashRecoveryCode("ABC12345")
    const hash2 = await hashRecoveryCode("abc12345")
    const hash3 = await hashRecoveryCode(" abc 12345 ")
    expect(hash1).toBe(hash2)
    expect(hash1).toBe(hash3)
  })
})

describe("TOTP functions", () => {
  it("generateTotpSecret produces a 32-char base32 string", () => {
    const secret = generateTotpSecret()
    expect(secret).toHaveLength(32)
    expect(secret).toMatch(/^[A-Z2-7]+$/)
  })

  it("generateTotpUri includes secret, issuer, and email", () => {
    const uri = generateTotpUri("ABCDEFGH", "admin@test.com")
    expect(uri).toContain("otpauth://totp/")
    expect(uri).toContain("secret=ABCDEFGH")
    expect(uri).toContain("issuer=AutoLenis")
    expect(uri).toContain("admin%40test.com")
  })

  it("generateQrCodeDataUrl returns a data URL, not an external API", async () => {
    const url = await generateQrCodeDataUrl("otpauth://totp/test")
    // Should be a data URL or fallback to the URI — never an external API
    expect(url).not.toContain("api.qrserver.com")
    // The qrcode lib returns data:image/png;base64,...
    expect(url.startsWith("data:image/png") || url.startsWith("otpauth://")).toBe(true)
  })
})

describe("Admin rate limiting", () => {
  it("checkRateLimit allows first attempt", async () => {
    const result = await checkRateLimit("test-rl-unique-" + Date.now())
    expect(result.allowed).toBe(true)
    expect(result.attemptsRemaining).toBe(5)
  })

  it("recordLoginAttempt + checkRateLimit blocks after max attempts", async () => {
    const id = "test-lockout-" + Date.now()
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt(id, false)
    }
    const result = await checkRateLimit(id)
    expect(result.allowed).toBe(false)
    expect(result.lockedUntil).toBeDefined()
  })

  it("recordLoginAttempt success clears the record", async () => {
    const id = "test-clear-" + Date.now()
    await recordLoginAttempt(id, false)
    await recordLoginAttempt(id, false)
    await recordLoginAttempt(id, true)
    const result = await checkRateLimit(id)
    expect(result.allowed).toBe(true)
  })

  it("checkMfaRateLimit allows first attempt", async () => {
    const result = await checkMfaRateLimit("test-mfa-" + Date.now())
    expect(result.allowed).toBe(true)
    expect(result.attemptsRemaining).toBe(3)
  })

  it("MFA rate limit blocks after max attempts", async () => {
    const id = "test-mfa-block-" + Date.now()
    for (let i = 0; i < 3; i++) {
      await recordMfaAttempt(id, false)
    }
    const result = await checkMfaRateLimit(id)
    expect(result.allowed).toBe(false)
    expect(result.attemptsRemaining).toBe(0)
  })

  it("generateSessionId returns a valid UUID", () => {
    const id = generateSessionId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
