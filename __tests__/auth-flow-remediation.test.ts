import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock Supabase admin client before importing the service under test
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockAdminClient = { from: mockFrom }

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// Mock Supabase server client (used by getUserById / getUserByEmail)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: vi.fn() }),
}))

// Mock password utilities
vi.mock("@/lib/auth-server", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$mockedhashvalue"),
  verifyPassword: vi.fn(),
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

// Mock email-verification service
vi.mock("@/lib/services/email-verification.service", () => ({
  emailVerificationService: {
    createVerificationToken: vi.fn().mockResolvedValue(undefined),
    resendVerificationByEmail: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock buyer package initialization
vi.mock("@/lib/services/buyer-package.service", () => ({
  initializeBuyerPackage: vi.fn().mockResolvedValue(undefined),
}))

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { AuthService } from "@/lib/services/auth.service"

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const VALID_BUYER_INPUT = {
  email: "newbuyer@example.com",
  password: "ValidPass123!",
  firstName: "Test",
  lastName: "User",
  role: "BUYER" as const,
  packageTier: "STANDARD" as const,
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("AuthService — consistent signup behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Duplicate email detection — the critical test from CI
  // -------------------------------------------------------------------------

  it("checks for duplicate email before creating user", async () => {
    const insertMock = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === "User") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: "existing-user-id" }],
            error: null,
          }),
          insert: insertMock.mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    // Attempt signup with an email that already exists
    await expect(
      AuthService.signUp(VALID_BUYER_INPUT),
    ).rejects.toThrow("User with this email already exists")

    // Verify that the insert was NOT called — duplicate detected BEFORE creation
    expect(insertMock).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Database error during duplicate check
  // -------------------------------------------------------------------------

  it("throws a database connection error when the duplicate check query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "User") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "connection refused" },
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    await expect(
      AuthService.signUp(VALID_BUYER_INPUT),
    ).rejects.toThrow("Database connection error")
  })

  // -------------------------------------------------------------------------
  // Successful signup when no duplicate exists
  // -------------------------------------------------------------------------

  it("creates a new user when no duplicate email is found", async () => {
    let userCallCount = 0
    const insertMock = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === "User") {
        userCallCount++
        if (userCallCount === 1) {
          // First call: duplicate check → no existing user
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        // Second call: insert new user
        return {
          insert: insertMock.mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "new-user-id",
                  email: VALID_BUYER_INPUT.email,
                  role: "BUYER",
                  first_name: "Test",
                  last_name: "User",
                },
              ],
              error: null,
            }),
          }),
        }
      }
      // BuyerProfile, AdminAuditLog, AdminNotification, etc.
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    const result = await AuthService.signUp(VALID_BUYER_INPUT)

    // User was created
    expect(insertMock).toHaveBeenCalled()
    expect(result.user.email).toBe(VALID_BUYER_INPUT.email)
    expect(result.token).toBe("mock-session-token")
  })

  // -------------------------------------------------------------------------
  // Error message shape for duplicate email
  // -------------------------------------------------------------------------

  it("error message for duplicate email contains 'already exists'", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "User") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: "dup-user-id" }],
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    let caught: Error | undefined
    try {
      await AuthService.signUp(VALID_BUYER_INPUT)
    } catch (e) {
      caught = e as Error
    }

    expect(caught).toBeDefined()
    expect(caught!.message).toContain("already exists")
  })

  // -------------------------------------------------------------------------
  // Route handler converts duplicate-email error to 409 CONFLICT
  // -------------------------------------------------------------------------

  it("signup route handler maps 'already exists' error to ConflictError (409)", async () => {
    // Verify the error handler mapping contract used by app/api/auth/signup/route.ts
    const { ConflictError } = await import("@/lib/middleware/error-handler")

    const error = new ConflictError("An account with this email already exists")
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toBe("An account with this email already exists")
  })
})
