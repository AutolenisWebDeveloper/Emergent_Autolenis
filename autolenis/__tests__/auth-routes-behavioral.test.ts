import { describe, it, expect, vi, beforeEach } from "vitest"

// ========================================================================
// Environment setup — must precede all imports
// ========================================================================
process.env["NEXT_PUBLIC_SUPABASE_URL"] = "http://localhost:54321"
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key"
process.env["NEXT_PUBLIC_APP_URL"] = "http://localhost:3000"
process.env["JWT_SECRET"] = "test-jwt-secret-for-route-behavioral-tests"

// ========================================================================
// Mock service layer and infrastructure for route handler tests
// ========================================================================

// Mock AuthService
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
vi.mock("@/lib/services/auth.service", () => ({
  AuthService: {
    signUp: (...args: unknown[]) => mockSignUp(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
}))

// Mock emailVerificationService
const mockCreateVerificationToken = vi.fn().mockResolvedValue("mock-token")
const mockResendVerificationByEmail = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/services/email-verification.service", () => ({
  emailVerificationService: {
    createVerificationToken: (...args: unknown[]) => mockCreateVerificationToken(...args),
    resendVerificationByEmail: (...args: unknown[]) => mockResendVerificationByEmail(...args),
  },
}))

// Mock email triggers
const mockOnUserCreated = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/email/triggers", () => ({
  onUserCreated: (...args: unknown[]) => mockOnUserCreated(...args),
}))

// Mock auth-server
const mockSetSessionCookie = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/auth-server", () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  getSession: vi.fn(),
  getSessionUser: vi.fn(),
}))

// Mock auth
const mockGetRoleBasedRedirect = vi.fn().mockReturnValue("/buyer/onboarding")
vi.mock("@/lib/auth", () => ({
  createSession: vi.fn().mockResolvedValue("mock-token"),
  verifySession: vi.fn(),
  getRoleBasedRedirect: (...args: unknown[]) => mockGetRoleBasedRedirect(...args),
}))

// Mock rate-limit (returns null = not rate limited)
vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
  rateLimits: {
    auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    signin: { maxRequests: 10, windowMs: 60 * 1000 },
    resendVerification: { maxRequests: 3, windowMs: 2 * 60 * 1000 },
  },
}))

// Mock error-handler (pass through real implementation for ConflictError, etc.)
vi.mock("@/lib/middleware/error-handler", async () => {
  const { NextResponse } = await import("next/server")

  class AppError extends Error {
    statusCode: number
    code?: string
    constructor(message: string, statusCode = 500, code?: string) {
      super(message)
      this.name = "AppError"
      this.statusCode = statusCode
      this.code = code
    }
  }

  class ValidationError extends AppError {
    fields?: Record<string, string>
    constructor(message: string, fields?: Record<string, string>) {
      super(message, 400, "VALIDATION_ERROR")
      this.name = "ValidationError"
      this.fields = fields
    }
  }

  class ConflictError extends AppError {
    constructor(message = "Resource already exists") {
      super(message, 409, "CONFLICT")
      this.name = "ConflictError"
    }
  }

  function handleError(error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: (error as AppError).message, code: (error as AppError).code },
        { status: (error as AppError).statusCode },
      )
    }
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 },
    )
  }

  return { handleError, AppError, ValidationError, ConflictError }
})

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Mock Supabase admin (for modules that import it at load time)
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

// Mock validators (pass through real schemas)
vi.mock("@/lib/validators/auth", async () => {
  const { z } = await import("zod")

  const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["BUYER", "DEALER", "AFFILIATE"]),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().nullish(),
    refCode: z.string().nullish(),
    referralCode: z.string().nullish(),
    businessName: z.string().nullish(),
    marketingSmsConsent: z.boolean().nullish(),
    marketingEmailConsent: z.boolean().nullish(),
    contactConsent: z.boolean().nullish(),
    consentTextVersion: z.string().nullish(),
    consentTimestamp: z.string().nullish(),
    formSource: z.string().nullish(),
    packageTier: z.enum(["STANDARD", "PREMIUM"]).nullish(),
  }).refine(
    (data) => data.role !== "BUYER" || (data.packageTier === "STANDARD" || data.packageTier === "PREMIUM"),
    { message: "Package tier is required for buyer registration", path: ["packageTier"] },
  )

  const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })

  return { signUpSchema, signInSchema }
})

// ========================================================================
// Import route handlers AFTER all mocks
// ========================================================================
import { POST as signupPOST } from "@/app/api/auth/signup/route"
import { POST as signinPOST } from "@/app/api/auth/signin/route"
import { POST as resendPOST } from "@/app/api/auth/resend-verification/route"

// ========================================================================
// Helpers
// ========================================================================

function makePostRequest(url: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
  })
}

async function parseResponse(response: Response) {
  const json = await response.json()
  return { status: response.status, body: json }
}

// ========================================================================
// SECTION A: Signup Route Handler Tests — POST /api/auth/signup
// ========================================================================

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 18. Success
  describe("Success flow", () => {
    const validBody = {
      email: "newbuyer@example.com",
      password: "SecurePass1!",
      role: "BUYER",
      firstName: "Jane",
      lastName: "Doe",
      packageTier: "STANDARD",
    }

    it("returns 200 with success: true, user data, and redirect", async () => {
      mockSignUp.mockResolvedValue({
        user: {
          id: "new-user-id",
          email: "newbuyer@example.com",
          role: "BUYER",
          firstName: "Jane",
          lastName: "Doe",
          packageTier: "STANDARD",
        },
        token: "mock-session-token",
        referral: undefined,
      })
      mockGetRoleBasedRedirect.mockReturnValue("/buyer/onboarding")

      const request = makePostRequest("http://localhost:3000/api/auth/signup", validBody)
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.id).toBe("new-user-id")
      expect(body.data.user.email).toBe("newbuyer@example.com")
      expect(body.data.user.role).toBe("BUYER")
      expect(body.data.redirect).toBe("/buyer/onboarding")
    })

    it("calls setSessionCookie with the token", async () => {
      mockSignUp.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "BUYER", firstName: "A", lastName: "B" },
        token: "the-token",
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signup", validBody)
      await signupPOST(request)

      expect(mockSetSessionCookie).toHaveBeenCalledWith("the-token")
    })

    it("fires onUserCreated trigger asynchronously", async () => {
      mockSignUp.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "BUYER", firstName: "Jane", lastName: "Doe", packageTier: "STANDARD" },
        token: "tok",
        referral: undefined,
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signup", validBody)
      await signupPOST(request)

      // onUserCreated is called with user details
      expect(mockOnUserCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          email: "a@b.com",
          role: "BUYER",
        }),
      )
    })

    it("fires createVerificationToken asynchronously after signup", async () => {
      mockSignUp.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "BUYER", firstName: "A", lastName: "B" },
        token: "tok",
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signup", validBody)
      await signupPOST(request)

      // createVerificationToken is called with userId and email
      expect(mockCreateVerificationToken).toHaveBeenCalledWith("u1", "a@b.com")
    })

    it("calls getRoleBasedRedirect with role and isNewUser=true", async () => {
      mockSignUp.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "DEALER", firstName: "A", lastName: "B" },
        token: "tok",
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        ...validBody,
        role: "DEALER",
        businessName: "Test Motors",
      })
      await signupPOST(request)

      expect(mockGetRoleBasedRedirect).toHaveBeenCalledWith("DEALER", true)
    })
  })

  // 19. Duplicate Email → 409
  describe("Duplicate email", () => {
    it("returns 409 when AuthService.signUp throws 'already exists'", async () => {
      mockSignUp.mockRejectedValue(new Error("User with this email already exists"))

      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "existing@example.com",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(409)
      expect(body.success).toBe(false)
      expect(body.code).toBe("CONFLICT")
    })

    it("does not set session cookie on duplicate email", async () => {
      mockSignUp.mockRejectedValue(new Error("User with this email already exists"))

      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "existing@example.com",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      await signupPOST(request)

      expect(mockSetSessionCookie).not.toHaveBeenCalled()
    })
  })

  // 20. Validation Error → 400
  describe("Validation errors", () => {
    it("returns 400 for missing required fields", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        // missing password, role, firstName, lastName
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("returns 400 for invalid email format", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "not-an-email",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("returns 400 for password too short", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "short",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("returns 400 for invalid role", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "SecurePass1!",
        role: "ADMIN", // not allowed via signup
        firstName: "Jane",
        lastName: "Doe",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("returns 400 for BUYER without packageTier", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        // packageTier missing
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("returns 400 for malformed JSON body", async () => {
      const request = new Request("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toBe("Invalid request format")
    })

    it("does not call AuthService.signUp for invalid inputs", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "bad",
      })
      await signupPOST(request)

      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  // Package tier validation error from AuthService
  describe("AuthService package tier validation", () => {
    it("returns 400 when AuthService throws 'Package tier is required'", async () => {
      mockSignUp.mockRejectedValue(new Error("Package tier is required for buyer registration"))

      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "SecurePass1!",
        role: "DEALER",
        firstName: "Jane",
        lastName: "Doe",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.code).toBe("VALIDATION_ERROR")
    })
  })

  // Unhandled service error
  describe("Unhandled service errors", () => {
    it("returns 422 SERVICE_ERROR for unexpected errors", async () => {
      mockSignUp.mockRejectedValue(new Error("Unexpected DB timeout"))

      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(422)
      expect(body.code).toBe("SERVICE_ERROR")
      // Should NOT expose internal error details
      expect(body.error).not.toContain("DB timeout")
    })
  })
})

// ========================================================================
// SECTION B: Signin Route Handler Tests — POST /api/auth/signin
// ========================================================================

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 21. Success
  describe("Success flow", () => {
    it("returns 200 with success: true, user data, and redirect", async () => {
      mockSignIn.mockResolvedValue({
        user: {
          id: "user-1",
          email: "user@example.com",
          role: "BUYER",
          firstName: "Jane",
          lastName: "Doe",
          is_affiliate: false,
          dealer: null,
          buyer: { id: "bp-1" },
          affiliate: null,
        },
        token: "mock-token",
      })
      mockGetRoleBasedRedirect.mockReturnValue("/buyer/dashboard")

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "user@example.com",
        password: "CorrectPass1!",
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.user.id).toBe("user-1")
      expect(body.data.user.email).toBe("user@example.com")
      expect(body.data.redirect).toBe("/buyer/dashboard")
    })

    it("sets session cookie on success", async () => {
      mockSignIn.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "BUYER", firstName: "A", lastName: "B" },
        token: "session-tok",
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "a@b.com",
        password: "Pass1!",
      })
      await signinPOST(request)

      expect(mockSetSessionCookie).toHaveBeenCalledWith("session-tok")
    })

    it("calls getRoleBasedRedirect with user role (no isNewUser)", async () => {
      mockSignIn.mockResolvedValue({
        user: { id: "u1", email: "a@b.com", role: "DEALER", firstName: "A", lastName: "B" },
        token: "tok",
      })

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "a@b.com",
        password: "Pass1!",
      })
      await signinPOST(request)

      expect(mockGetRoleBasedRedirect).toHaveBeenCalledWith("DEALER")
    })
  })

  // 22. Unverified User → 403
  describe("Unverified user", () => {
    it("returns 403 with EMAIL_NOT_VERIFIED error", async () => {
      const err = Object.assign(new Error("Please verify your email address before signing in."), {
        code: "EMAIL_NOT_VERIFIED",
        verificationEmailSent: true,
      })
      mockSignIn.mockRejectedValue(err)

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "unverified@example.com",
        password: "Pass1!",
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(403)
      expect(body.success).toBe(false)
      expect(body.error).toBe("EMAIL_NOT_VERIFIED")
      expect(body.requiresEmailVerification).toBe(true)
      expect(body.verificationEmailSent).toBe(true)
    })

    it("does not set session cookie for unverified user", async () => {
      const err = Object.assign(new Error("Verify email"), {
        code: "EMAIL_NOT_VERIFIED",
        verificationEmailSent: true,
      })
      mockSignIn.mockRejectedValue(err)

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "unverified@example.com",
        password: "Pass1!",
      })
      await signinPOST(request)

      expect(mockSetSessionCookie).not.toHaveBeenCalled()
    })
  })

  // 23. Invalid Credentials → 401
  describe("Invalid credentials", () => {
    it("returns 401 for wrong password", async () => {
      mockSignIn.mockRejectedValue(new Error("Invalid email or password"))

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "user@example.com",
        password: "WrongPass1!",
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error).toBe("Invalid email or password")
    })

    it("returns 401 for unknown user", async () => {
      mockSignIn.mockRejectedValue(new Error("Invalid email or password"))

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "ghost@example.com",
        password: "AnyPass1!",
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(401)
      expect(body.success).toBe(false)
    })
  })

  // Validation errors
  describe("Signin validation errors", () => {
    it("returns 400 for malformed JSON body", async () => {
      const request = new Request("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(400)
      expect(body.success).toBe(false)
    })

    it("does not call AuthService.signIn for malformed body", async () => {
      const request = new Request("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      })
      await signinPOST(request)

      expect(mockSignIn).not.toHaveBeenCalled()
    })
  })

  // Unhandled server error
  describe("Unhandled server errors", () => {
    it("returns 500 with generic message and correlationId", async () => {
      mockSignIn.mockRejectedValue(new Error("Unexpected DB crash"))

      const request = makePostRequest("http://localhost:3000/api/auth/signin", {
        email: "user@example.com",
        password: "Pass1!",
      })
      const response = await signinPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe("Sign-in failed. Please try again.")
      // Should include a correlationId for debugging
      expect(body.correlationId).toBeDefined()
    })
  })

  // Missing env vars
  describe("Missing environment variables", () => {
    it("returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
      const savedKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]
      delete process.env["SUPABASE_SERVICE_ROLE_KEY"]

      try {
        const request = makePostRequest("http://localhost:3000/api/auth/signin", {
          email: "user@example.com",
          password: "Pass1!",
        })
        const response = await signinPOST(request)
        const { status, body } = await parseResponse(response)

        expect(status).toBe(503)
        expect(body.success).toBe(false)
        expect(body.error).toContain("Server configuration error")
      } finally {
        process.env["SUPABASE_SERVICE_ROLE_KEY"] = savedKey
      }
    })
  })
})

// ========================================================================
// SECTION C: Resend Verification Route Handler Tests — POST /api/auth/resend-verification
// ========================================================================

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 24. Always returns 200 with generic message
  describe("Always returns 200 generic response", () => {
    it("returns 200 with generic message on valid email", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {
        email: "user@example.com",
      })
      const response = await resendPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.message).toBe("If that email exists, we sent a new verification link.")
    })

    it("calls resendVerificationByEmail with normalized (lowercased) email", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {
        email: "User@Example.COM",
      })
      await resendPOST(request)

      expect(mockResendVerificationByEmail).toHaveBeenCalledWith("user@example.com")
    })

    it("returns 200 even for invalid email format (prevents enumeration)", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {
        email: "not-an-email",
      })
      const response = await resendPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.ok).toBe(true)
    })

    it("returns 200 even for malformed body (prevents enumeration)", async () => {
      const request = new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      })
      const response = await resendPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.ok).toBe(true)
    })

    it("returns 200 even when resendVerificationByEmail throws", async () => {
      mockResendVerificationByEmail.mockRejectedValueOnce(new Error("Service crash"))

      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {
        email: "user@example.com",
      })
      const response = await resendPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(200)
      expect(body.ok).toBe(true)
    })

    it("does not call resendVerificationByEmail for invalid email format", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {
        email: "not-an-email",
      })
      await resendPOST(request)

      expect(mockResendVerificationByEmail).not.toHaveBeenCalled()
    })

    it("does not call resendVerificationByEmail for missing email field", async () => {
      const request = makePostRequest("http://localhost:3000/api/auth/resend-verification", {})
      await resendPOST(request)

      expect(mockResendVerificationByEmail).not.toHaveBeenCalled()
    })
  })
})

// ========================================================================
// SECTION D: Cross-cutting route handler concerns
// ========================================================================

describe("Signup route — env var checks", () => {
  it("returns 503 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    const saved = process.env["NEXT_PUBLIC_SUPABASE_URL"]
    delete process.env["NEXT_PUBLIC_SUPABASE_URL"]

    try {
      const request = makePostRequest("http://localhost:3000/api/auth/signup", {
        email: "test@example.com",
        password: "SecurePass1!",
        role: "BUYER",
        firstName: "Jane",
        lastName: "Doe",
        packageTier: "STANDARD",
      })
      const response = await signupPOST(request)
      const { status, body } = await parseResponse(response)

      expect(status).toBe(503)
      expect(body.success).toBe(false)
      expect(body.error).toContain("Server configuration error")
    } finally {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = saved
    }
  })
})

describe("Signup route — referral data forwarding", () => {
  it("passes referral code info to onUserCreated when present", async () => {
    mockSignUp.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", role: "BUYER", firstName: "A", lastName: "B", packageTier: "STANDARD" },
      token: "tok",
      referral: {
        affiliateId: "aff-1",
        affiliateEmail: "aff@example.com",
        affiliateFirstName: "Partner",
        referralCode: "ALREF123",
      },
    })

    const request = makePostRequest("http://localhost:3000/api/auth/signup", {
      email: "a@b.com",
      password: "SecurePass1!",
      role: "BUYER",
      firstName: "A",
      lastName: "B",
      packageTier: "STANDARD",
      refCode: "ALREF123",
    })
    await signupPOST(request)

    expect(mockOnUserCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        referral: { code: "ALREF123" },
      }),
    )
  })
})
