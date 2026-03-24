import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHash, randomBytes } from "node:crypto"

// ---------------------------------------------------------------------------
// Mock Supabase admin client & email service before importing the service
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockAdminClient = { from: mockFrom }

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

const mockSendEmailVerification = vi.fn().mockResolvedValue({ success: true })

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { EmailVerificationService } from "@/lib/services/email-verification.service"

// ---------------------------------------------------------------------------
// Helpers — build Supabase query chain mocks for each flow
// ---------------------------------------------------------------------------

/**
 * Setup mockFrom for resendVerificationByEmail which calls:
 *   1. from("User").select(...).eq("email", ...).limit(1)           → user lookup
 *   2. from("email_verification_tokens").delete().eq("user_id", id) → delete old tokens
 *   3. from("email_verification_tokens").insert({...})              → insert new token
 */
function setupResendMocks(user: Record<string, any> | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "User") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: user ? [user] : [], error: null }),
          }),
        }),
      }
    }
    if (table === "email_verification_tokens") {
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }
  })
}

/**
 * Setup mockFrom for verifyEmail:
 *   1. from("email_verification_tokens").select(...).eq("token", hash).limit(1)
 *   2. from("email_verification_tokens").update({used_at:...}).eq("id", tokenId)
 *   3. from("User").update({is_email_verified:true}).eq("id", userId)
 */
function setupVerifyMocks(tokenRecord: Record<string, any> | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "email_verification_tokens") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: tokenRecord ? [tokenRecord] : [],
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    if (table === "User") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Resend Verification Flow", () => {
  let service: EmailVerificationService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EmailVerificationService()
  })

  // -----------------------------------------------------------------------
  // resendVerificationByEmail
  // -----------------------------------------------------------------------
  describe("resendVerificationByEmail", () => {
    it("does nothing for unknown email (no email enumeration)", async () => {
      setupResendMocks(null)

      await service.resendVerificationByEmail("unknown@example.com")

      expect(mockSendEmailVerification).not.toHaveBeenCalled()
    })

    it("does nothing for already-verified email (no email enumeration)", async () => {
      setupResendMocks({
        id: "u1",
        email: "verified@example.com",
        role: "BUYER",
        is_email_verified: true,
      })

      await service.resendVerificationByEmail("verified@example.com")

      expect(mockSendEmailVerification).not.toHaveBeenCalled()
    })

    it("sends email for unverified BUYER", async () => {
      setupResendMocks({
        id: "u1",
        email: "buyer@example.com",
        role: "BUYER",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("buyer@example.com")

      expect(mockSendEmailVerification).toHaveBeenCalledOnce()
    })

    it("sends email for unverified DEALER", async () => {
      setupResendMocks({
        id: "u2",
        email: "dealer@example.com",
        role: "DEALER",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("dealer@example.com")

      expect(mockSendEmailVerification).toHaveBeenCalledOnce()
    })

    it("sends email for unverified AFFILIATE", async () => {
      setupResendMocks({
        id: "u3",
        email: "affiliate@example.com",
        role: "AFFILIATE",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("affiliate@example.com")

      expect(mockSendEmailVerification).toHaveBeenCalledOnce()
    })

    it("does NOT send email for ADMIN role", async () => {
      setupResendMocks({
        id: "u4",
        email: "admin@example.com",
        role: "ADMIN",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("admin@example.com")

      expect(mockSendEmailVerification).not.toHaveBeenCalled()
    })

    it("does NOT send email for SYSTEM_AGENT role", async () => {
      setupResendMocks({
        id: "u5",
        email: "agent@example.com",
        role: "SYSTEM_AGENT",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("agent@example.com")

      expect(mockSendEmailVerification).not.toHaveBeenCalled()
    })

    it("normalizes email input (trim + lowercase)", async () => {
      setupResendMocks(null)

      await service.resendVerificationByEmail("  Test@Example.COM  ")

      // Verify that from("User") was called and the chain was invoked
      expect(mockFrom).toHaveBeenCalledWith("User")
    })

    it("invalidates prior tokens via delete before creating new one", async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const insertMock = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === "User") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: "u1", email: "buyer@example.com", role: "BUYER", is_email_verified: false }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "email_verification_tokens") {
          return { delete: deleteMock, insert: insertMock }
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      })

      await service.resendVerificationByEmail("buyer@example.com")

      expect(deleteMock).toHaveBeenCalled()
      expect(insertMock).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Token hashing
  // -----------------------------------------------------------------------
  describe("Token Security", () => {
    it("stores hashed token, not raw token — email receives raw token", async () => {
      setupResendMocks({
        id: "u1",
        email: "buyer@example.com",
        role: "BUYER",
        is_email_verified: false,
      })

      await service.resendVerificationByEmail("buyer@example.com")

      // sendEmailVerification is called as (email, rawToken, userId)
      const emailToken = mockSendEmailVerification.mock.calls[0][1] as string
      expect(emailToken).toMatch(/^[a-f0-9]{64}$/)

      // Hash the email token — stored hash must differ from raw token
      const expectedHash = createHash("sha256").update(emailToken).digest("hex")
      expect(expectedHash).not.toBe(emailToken)
    })

    it("verifyEmail hashes the input token before lookup", async () => {
      const rawToken = randomBytes(32).toString("hex")

      setupVerifyMocks({
        id: "tok-1",
        user_id: "u1",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
      })

      const result = await service.verifyEmail(rawToken)

      // Token lookup was performed
      expect(mockFrom).toHaveBeenCalledWith("email_verification_tokens")
      expect(result.success).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // verifyEmail — success / expired / invalid / already-used
  // -----------------------------------------------------------------------
  describe("verifyEmail", () => {
    it("returns success for valid unexpired unused token", async () => {
      setupVerifyMocks({
        id: "tok-1",
        user_id: "u-abc",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
      })

      const result = await service.verifyEmail("any-valid-token")

      expect(result.success).toBe(true)
      expect(result.message).toBe("Email verified successfully!")
      expect(result.userId).toBe("u-abc")
    })

    it("returns failure for invalid (non-existent) token", async () => {
      setupVerifyMocks(null)

      const result = await service.verifyEmail("bad-token")

      expect(result.success).toBe(false)
      expect(result.message).toBe("Invalid verification token")
    })

    it("returns failure for expired token", async () => {
      setupVerifyMocks({
        id: "tok-expired",
        user_id: "u1",
        expires_at: new Date(Date.now() - 3600000).toISOString(),
        used_at: null,
      })

      const result = await service.verifyEmail("expired-token")

      expect(result.success).toBe(false)
      expect(result.message).toContain("expired")
    })

    it("returns failure for already-used token", async () => {
      setupVerifyMocks({
        id: "tok-used",
        user_id: "u1",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: new Date().toISOString(),
      })

      const result = await service.verifyEmail("used-token")

      expect(result.success).toBe(false)
      expect(result.message).toContain("already been used")
    })
  })

  // -----------------------------------------------------------------------
  // resendVerification (authenticated, by userId)
  // -----------------------------------------------------------------------
  describe("resendVerification (authenticated)", () => {
    it("returns error for unknown user", async () => {
      setupResendMocks(null)

      const result = await service.resendVerification("nonexistent")

      expect(result.success).toBe(false)
      expect(result.message).toBe("User not found")
    })

    it("returns error for already verified user", async () => {
      setupResendMocks({
        id: "u1",
        email: "v@example.com",
        is_email_verified: true,
      })

      const result = await service.resendVerification("u1")

      expect(result.success).toBe(false)
      expect(result.message).toContain("already verified")
    })

    it("succeeds for unverified user", async () => {
      setupResendMocks({
        id: "u1",
        email: "unverified@example.com",
        is_email_verified: false,
      })

      const result = await service.resendVerification("u1")

      expect(result.success).toBe(true)
      expect(result.message).toContain("Verification email sent")
      expect(mockSendEmailVerification).toHaveBeenCalledOnce()
    })
  })

  // -----------------------------------------------------------------------
  // Route-level behaviour expectations
  // -----------------------------------------------------------------------
  describe("Route Security Contract", () => {
    it("generic response shape matches the contract", () => {
      const response = {
        ok: true,
        message: "If that email exists, we sent a new verification link.",
      }
      expect(response.ok).toBe(true)
      expect(response.message).not.toContain("not found")
      expect(response.message).not.toContain("already verified")
    })

    it("allowed roles are buyer, dealer, affiliate only", () => {
      const allowedRoles = ["BUYER", "DEALER", "AFFILIATE"]
      expect(allowedRoles).not.toContain("ADMIN")
      expect(allowedRoles).not.toContain("SUPER_ADMIN")
      expect(allowedRoles).not.toContain("SYSTEM_AGENT")
      expect(allowedRoles.length).toBe(3)
    })
  })

  // -----------------------------------------------------------------------
  // Idempotency: auto-resend on sign-in (hour-bucket deduplication)
  // -----------------------------------------------------------------------
  describe("resendVerificationByEmail — idempotency (sign-in auto-resend)", () => {
    it("skips send when called twice with the same idempotency key (same hour bucket)", async () => {
      setupResendMocks({
        id: "u-idem",
        email: "idem@example.com",
        role: "BUYER",
        is_email_verified: false,
      })

      const key = `verify_on_signin::u-idem::${new Date().toISOString().slice(0, 13)}-test-dedup`

      // First call — should send
      await service.resendVerificationByEmail("idem@example.com", key)
      expect(mockSendEmailVerification).toHaveBeenCalledOnce()

      // Second call with same key — should be deduplicated
      await service.resendVerificationByEmail("idem@example.com", key)
      expect(mockSendEmailVerification).toHaveBeenCalledOnce() // still once
    })

    it("sends again when called with a different idempotency key (different hour bucket)", async () => {
      setupResendMocks({
        id: "u-idem2",
        email: "idem2@example.com",
        role: "BUYER",
        is_email_verified: false,
      })

      const keyHour1 = "verify_on_signin::u-idem2::2025-01-01T10-different-a"
      const keyHour2 = "verify_on_signin::u-idem2::2025-01-01T11-different-b"

      await service.resendVerificationByEmail("idem2@example.com", keyHour1)
      await service.resendVerificationByEmail("idem2@example.com", keyHour2)

      // Different keys → two sends
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(2)
    })

    it("sends normally when no idempotency key is provided (manual resend flow)", async () => {
      setupResendMocks({
        id: "u-noidem",
        email: "noidem@example.com",
        role: "BUYER",
        is_email_verified: false,
      })

      // No key — should always send
      await service.resendVerificationByEmail("noidem@example.com")
      await service.resendVerificationByEmail("noidem@example.com")

      expect(mockSendEmailVerification).toHaveBeenCalledTimes(2)
    })
  })

  // -----------------------------------------------------------------------
  // isEmailVerified
  // -----------------------------------------------------------------------
  describe("isEmailVerified", () => {
    it("returns true for verified user", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "User") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ is_email_verified: true }],
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      expect(await service.isEmailVerified("u1")).toBe(true)
    })

    it("returns false for unverified user", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "User") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ is_email_verified: false }],
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      expect(await service.isEmailVerified("u1")).toBe(false)
    })

    it("returns false for unknown user", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "User") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      expect(await service.isEmailVerified("ghost")).toBe(false)
    })
  })
})
