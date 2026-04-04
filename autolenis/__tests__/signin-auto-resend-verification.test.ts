import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock Supabase admin client before importing the service under test
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockAdminClient = { from: mockFrom }

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// Mock password utilities
const mockVerifyPassword = vi.fn()
vi.mock("@/lib/auth-server", () => ({
  verifyPassword: (...args: any[]) => mockVerifyPassword(...args),
  hashPassword: vi.fn(),
  setSessionCookie: vi.fn(),
  getSession: vi.fn(),
  getSessionUser: vi.fn(),
}))

// Mock session creation
vi.mock("@/lib/auth", () => ({
  createSession: vi.fn().mockResolvedValue("mock-session-token"),
  verifySession: vi.fn(),
  getRoleBasedRedirect: vi.fn().mockReturnValue("/buyer/dashboard"),
}))

// Mock workspace bootstrap
vi.mock("@/lib/workspace-bootstrap", () => ({
  ensureDefaultWorkspacesExist: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Mock email-verification service — track calls
const mockResendVerificationByEmail = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/services/email-verification.service", () => ({
  emailVerificationService: {
    resendVerificationByEmail: (...args: any[]) =>
      mockResendVerificationByEmail(...args),
  },
}))

import { AuthService } from "@/lib/services/auth.service"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the nested Supabase query chain mock that signIn uses */
function setupUserQuery(users: any[] | null, error: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: users, error }),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

const UNVERIFIED_USER = {
  id: "user-unverified-1",
  email: "unverified@example.com",
  passwordHash: "$2a$10$hashedpassword",
  role: "BUYER",
  first_name: "Alice",
  last_name: "Smith",
  is_affiliate: false,
  is_email_verified: false,
  workspaceId: null,
  session_version: 0,
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Auto-Resend Verification Email on Sign-In", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Case 1: Correct credentials + unverified email → 403 + resend called once
  // -------------------------------------------------------------------------
  describe("Case 1: Correct credentials, unverified email", () => {
    it("throws an error with code EMAIL_NOT_VERIFIED", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(true)

      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" })
    })

    it("includes verificationEmailSent: true in the thrown error", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(true)

      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toMatchObject({ verificationEmailSent: true })
    })

    it("calls resendVerificationByEmail exactly once with email and idempotency key", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(true)

      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toThrow()

      // Allow the fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 0))

      expect(mockResendVerificationByEmail).toHaveBeenCalledOnce()
      const [calledEmail, calledKey] = mockResendVerificationByEmail.mock.calls[0]
      expect(calledEmail).toBe("unverified@example.com")
      expect(calledKey).toMatch(/^verify_on_signin::user-unverified-1::\d{4}-\d{2}-\d{2}T\d{2}$/)
    })

    it("does NOT issue a session token (no createSession call)", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(true)

      const { createSession } = await import("@/lib/auth")

      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toThrow()

      expect(createSession).not.toHaveBeenCalled()
    })

    it("two sign-in attempts pass the same hour-bucket idempotency key both times", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(true)

      // First attempt
      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toThrow()
      await new Promise((r) => setTimeout(r, 0))

      setupUserQuery([UNVERIFIED_USER])
      // Second attempt in same hour
      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "CorrectPass1!" }),
      ).rejects.toThrow()
      await new Promise((r) => setTimeout(r, 0))

      // Both calls use the same hour-bucket key
      expect(mockResendVerificationByEmail).toHaveBeenCalledTimes(2)
      const key1 = mockResendVerificationByEmail.mock.calls[0][1]
      const key2 = mockResendVerificationByEmail.mock.calls[1][1]
      expect(key1).toBe(key2) // same key → EmailVerificationService deduplicates
    })
  })

  // -------------------------------------------------------------------------
  // Case 2: Invalid password → 401-style error, resend NOT called
  // -------------------------------------------------------------------------
  describe("Case 2: Invalid password", () => {
    it("throws 'Invalid email or password' and does NOT call resend", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(false)

      await expect(
        AuthService.signIn({ email: "unverified@example.com", password: "WrongPass1!" }),
      ).rejects.toThrow("Invalid email or password")

      await new Promise((r) => setTimeout(r, 0))
      expect(mockResendVerificationByEmail).not.toHaveBeenCalled()
    })

    it("thrown error does NOT have EMAIL_NOT_VERIFIED code (prevents enumeration)", async () => {
      setupUserQuery([UNVERIFIED_USER])
      mockVerifyPassword.mockResolvedValue(false)

      let caught: any
      try {
        await AuthService.signIn({ email: "unverified@example.com", password: "WrongPass1!" })
      } catch (e) {
        caught = e
      }

      expect(caught?.code).not.toBe("EMAIL_NOT_VERIFIED")
      expect(caught?.verificationEmailSent).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Case 3: Unknown user → generic error, resend NOT called (no enumeration)
  // -------------------------------------------------------------------------
  describe("Case 3: Unknown user", () => {
    it("throws 'Invalid email or password' for unknown email", async () => {
      setupUserQuery([])

      await expect(
        AuthService.signIn({ email: "ghost@example.com", password: "AnyPass1!" }),
      ).rejects.toThrow("Invalid email or password")

      expect(mockResendVerificationByEmail).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// Rate limit preset tests
// ---------------------------------------------------------------------------

describe("verificationOnSignin rate limit preset", () => {
  it("has maxRequests=2 and windowMs=30 minutes", async () => {
    const { rateLimits } = await import("@/lib/middleware/rate-limit")
    expect(rateLimits.verificationOnSignin).toBeDefined()
    expect(rateLimits.verificationOnSignin.maxRequests).toBe(2)
    expect(rateLimits.verificationOnSignin.windowMs).toBe(30 * 60 * 1000)
  })
})

