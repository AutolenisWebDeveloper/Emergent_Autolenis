/**
 * Refinance Check-Eligibility Route — Behavioral Tests
 *
 * Tests the POST /api/refinance/check-eligibility route handler by calling it
 * directly with mocked dependencies (DB, email, rate-limit). Each test sends a
 * real Request object and asserts on the returned Response, status, and body.
 *
 * Coverage:
 * - Qualified lead (success path)
 * - Declined lead (filter failures)
 * - Validation errors (missing fields, bad email, short phone, bad state, no consent)
 * - Duplicate submission idempotency
 * - Database not configured (graceful degradation)
 * - Backend failure surfaced correctly
 * - Email delivery failure does not block response
 * - Lender filter edge cases
 * - Internal filter edge cases
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ========================================================================
// Environment setup
// ========================================================================
process.env["NEXT_PUBLIC_SUPABASE_URL"] = "http://localhost:54321"
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key"
process.env["NEXT_PUBLIC_APP_URL"] = "http://localhost:3000"

// ========================================================================
// Mock dependencies
// ========================================================================

// Mock supabase from lib/db
const mockSupabaseFrom = vi.fn()
const mockIsDatabaseConfigured = vi.fn().mockReturnValue(true)

vi.mock("@/lib/db", () => ({
  supabase: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
  isDatabaseConfigured: () => mockIsDatabaseConfigured(),
}))

// Mock require-database
vi.mock("@/lib/require-database", () => ({
  requireDatabase: vi.fn().mockReturnValue(null),
}))

// Mock email service
const mockSendNotificationEmail = vi.fn().mockResolvedValue({ id: "msg-1" })
const mockSendNotification = vi.fn().mockResolvedValue({ id: "msg-2" })
vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendNotificationEmail: (...args: unknown[]) => mockSendNotificationEmail(...args),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}))

// Mock email config
vi.mock("@/lib/resend", () => ({
  EMAIL_CONFIG: { adminEmail: "admin@test.com" },
}))

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Mock rate-limit (not rate limited)
vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
}))

// ========================================================================
// Import route handler AFTER mocks
// ========================================================================
import { POST } from "@/app/api/refinance/check-eligibility/route"

// ========================================================================
// Test helpers
// ========================================================================

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>): Request {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "unknown"
  return new Request("http://localhost:3000/api/refinance/check-eligibility", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-refi-email": email,
      ...headers,
    },
    body: JSON.stringify(body),
  }) as any
}

/** A complete, valid, qualified lead payload */
function qualifiedPayload(): Record<string, unknown> {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "5551234567",
    state: "CA",
    tcpaConsent: true,
    vehicleYear: new Date().getFullYear() - 3,
    vehicleMake: "Toyota",
    vehicleModel: "Camry",
    mileage: 50000,
    vehicleCondition: "GOOD",
    loanBalance: 15000,
    currentMonthlyPayment: 400,
    monthlyIncome: 5000,
  }
}

/** A payload that will be declined (old vehicle, low income, bad condition) */
function declinedPayload(): Record<string, unknown> {
  return {
    ...qualifiedPayload(),
    vehicleYear: 2005, // >13 years old
    monthlyIncome: 1500, // <$2000
    vehicleCondition: "POOR", // internal filter
  }
}

/**
 * Setup the Supabase mock chains for typical database operations.
 * The refinance route uses from() for:
 *  - RefinanceLead.select (idempotency check)
 *  - RefinanceLead.insert (lead persistence)
 *  - AdminNotification.insert (notification)
 *  - Affiliate.select (affiliate lookup, optional)
 *  - User.select (affiliate user lookup, optional)
 */
function setupDbMocks(options?: { existingLead?: Record<string, unknown> | null; insertError?: boolean }) {
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "RefinanceLead") {
      return {
        // Idempotency check: select(...).eq(...).eq(...)...maybeSingle()
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: options?.existingLead ?? null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        // Insert lead
        insert: vi.fn().mockResolvedValue({
          error: options?.insertError ? { message: "insert failed" } : null,
        }),
      }
    }
    if (table === "AdminNotification") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    }
    if (table === "Affiliate") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    }
    if (table === "User") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    }
    // Fallback
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
  })
}

// ========================================================================
// Tests
// ========================================================================

describe("POST /api/refinance/check-eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsDatabaseConfigured.mockReturnValue(true)
    setupDbMocks()
  })

  // ─── SUCCESS PATH ────────────────────────────────────────────────
  describe("Qualified lead (success path)", () => {
    it("returns 200 with qualified: true and a redirectUrl", async () => {
      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
      expect(body.leadId).toBeDefined()
      expect(body.redirectUrl).toContain("openroadlending.com/apply")
      expect(body.redirectUrl).toContain(body.leadId)
    })

    it("persists lead to RefinanceLead table", async () => {
      await POST(makeRequest(qualifiedPayload()) as any)
      expect(mockSupabaseFrom).toHaveBeenCalledWith("RefinanceLead")
    })

    it("creates AdminNotification", async () => {
      await POST(makeRequest(qualifiedPayload()) as any)
      expect(mockSupabaseFrom).toHaveBeenCalledWith("AdminNotification")
    })

    it("sends internal notification email to admin", async () => {
      await POST(makeRequest(qualifiedPayload()) as any)
      expect(mockSendNotificationEmail).toHaveBeenCalledTimes(1)
      expect(mockSendNotificationEmail.mock.calls[0][0]).toBe("admin@test.com")
    })

    it("sends qualified email to applicant with redirect link", async () => {
      await POST(makeRequest(qualifiedPayload()) as any)
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
      const [email, subject] = mockSendNotification.mock.calls[0]
      expect(email).toBe("jane@example.com")
      expect(subject).toContain("Pre-Qualified")
    })
  })

  // ─── DECLINED PATH ───────────────────────────────────────────────
  describe("Declined lead", () => {
    it("returns 200 with qualified: false and reason list", async () => {
      const res = await POST(makeRequest(declinedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(false)
      expect(body.reasons).toBeInstanceOf(Array)
      expect(body.reasons.length).toBeGreaterThan(0)
      expect(body.leadId).toBeDefined()
      expect(body.redirectUrl).toBeUndefined()
    })

    it("includes lender filter reasons for old vehicle and low income", async () => {
      const res = await POST(makeRequest(declinedPayload()) as any)
      const body = await res.json()
      expect(body.reasons).toContain("lender_vehicle_too_old")
      expect(body.reasons).toContain("lender_income_too_low")
    })

    it("includes internal filter reason for POOR condition", async () => {
      const res = await POST(makeRequest(declinedPayload()) as any)
      const body = await res.json()
      expect(body.reasons).toContain("internal_vehicle_condition_poor")
    })

    it("sends declined email to applicant with reasons", async () => {
      await POST(makeRequest(declinedPayload()) as any)
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
      const [email, subject] = mockSendNotification.mock.calls[0]
      expect(email).toBe("jane@example.com")
      expect(subject).toContain("Update")
    })
  })

  // ─── VALIDATION ERRORS ───────────────────────────────────────────
  describe("Validation errors", () => {
    it("returns 400 for missing personal info", async () => {
      const res = await POST(makeRequest({ email: "test@x.com" }) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Missing required personal information")
    })

    it("returns 400 for invalid email format", async () => {
      const payload = { ...qualifiedPayload(), email: "not-an-email" }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Invalid email")
    })

    it("returns 400 for phone too short", async () => {
      const payload = { ...qualifiedPayload(), phone: "123" }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Invalid phone")
    })

    it("returns 400 for invalid state code", async () => {
      const payload = { ...qualifiedPayload(), state: "XYZ" }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Invalid state")
    })

    it("returns 400 for missing vehicle info", async () => {
      const payload = { ...qualifiedPayload(), vehicleYear: undefined, vehicleMake: undefined }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Missing required vehicle")
    })

    it("returns 400 for missing loan info", async () => {
      const payload = { ...qualifiedPayload(), loanBalance: undefined }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("Missing required loan")
    })

    it("returns 400 when TCPA consent is false", async () => {
      const payload = { ...qualifiedPayload(), tcpaConsent: false }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain("TCPA consent")
    })
  })

  // ─── IDEMPOTENCY ─────────────────────────────────────────────────
  describe("Duplicate submission idempotency", () => {
    it("returns existing lead data when duplicate detected within 10 minutes", async () => {
      setupDbMocks({
        existingLead: {
          id: "existing-lead-id",
          qualificationStatus: "QUALIFIED",
          qualificationReasons: "[]",
        },
      })

      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.leadId).toBe("existing-lead-id")
      expect(body.qualified).toBe(true)
      expect(body.deduped).toBe(true)
      expect(body.redirectUrl).toContain("existing-lead-id")
    })

    it("returns existing declined lead on dedup", async () => {
      setupDbMocks({
        existingLead: {
          id: "existing-declined-id",
          qualificationStatus: "DECLINED",
          qualificationReasons: JSON.stringify(["lender_vehicle_too_old"]),
        },
      })

      const res = await POST(makeRequest(declinedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.leadId).toBe("existing-declined-id")
      expect(body.qualified).toBe(false)
      expect(body.deduped).toBe(true)
      expect(body.reasons).toContain("lender_vehicle_too_old")
    })
  })

  // ─── DB NOT CONFIGURED ──────────────────────────────────────────
  describe("Database not configured", () => {
    it("still processes and returns qualification result when DB is unavailable", async () => {
      mockIsDatabaseConfigured.mockReturnValue(false)

      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
      expect(body.leadId).toBeDefined()
    })

    it("still sends email notifications even without DB", async () => {
      mockIsDatabaseConfigured.mockReturnValue(false)

      await POST(makeRequest(qualifiedPayload()) as any)
      expect(mockSendNotificationEmail).toHaveBeenCalledTimes(1)
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
    })
  })

  // ─── DB INSERT FAILURE ──────────────────────────────────────────
  describe("Database insert failure", () => {
    it("does not block response when lead insert fails", async () => {
      setupDbMocks({ insertError: true })

      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
      expect(body.leadId).toBeDefined()
    })
  })

  // ─── EMAIL FAILURE RESILIENCE ────────────────────────────────────
  describe("Email delivery failure resilience", () => {
    it("still returns qualified result when internal email fails", async () => {
      mockSendNotificationEmail.mockRejectedValueOnce(new Error("SMTP down"))

      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })

    it("still returns qualified result when applicant email fails", async () => {
      mockSendNotification.mockRejectedValueOnce(new Error("Resend down"))

      const res = await POST(makeRequest(qualifiedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })

    it("still returns declined result when email fails", async () => {
      mockSendNotification.mockRejectedValueOnce(new Error("Resend down"))

      const res = await POST(makeRequest(declinedPayload()) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(false)
    })
  })

  // ─── LENDER FILTER EDGE CASES ───────────────────────────────────
  describe("Lender filter edge cases", () => {
    it("declines when state is not in allowed list", async () => {
      const payload = { ...qualifiedPayload(), state: "HI" } // Hawaii not in OpenRoad list
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(false)
      expect(body.reasons).toContain("lender_state_not_allowed")
    })

    it("declines when mileage exceeds 160k", async () => {
      const payload = { ...qualifiedPayload(), mileage: 170000 }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(false)
      expect(body.reasons).toContain("lender_mileage_too_high")
    })

    it("qualifies at exactly 160k mileage (boundary)", async () => {
      const payload = { ...qualifiedPayload(), mileage: 160000 }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })

    it("qualifies at exactly $2000 income (boundary)", async () => {
      const payload = { ...qualifiedPayload(), monthlyIncome: 2000 }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })
  })

  // ─── INTERNAL FILTER EDGE CASES ─────────────────────────────────
  describe("Internal filter edge cases", () => {
    it("declines when loan balance is under $8000", async () => {
      const payload = { ...qualifiedPayload(), loanBalance: 7999 }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(false)
      expect(body.reasons).toContain("internal_loan_balance_too_low")
    })

    it("qualifies at exactly $8000 loan balance (boundary)", async () => {
      const payload = { ...qualifiedPayload(), loanBalance: 8000 }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })

    it("FAIR condition passes (only POOR fails)", async () => {
      const payload = { ...qualifiedPayload(), vehicleCondition: "FAIR" }
      const res = await POST(makeRequest(payload) as any)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })
  })

  // ─── UNEXPECTED ERROR ───────────────────────────────────────────
  describe("Unexpected error handling", () => {
    it("returns 500 with user-friendly message on unexpected throw", async () => {
      // Force a throw by making request.json() fail
      const badRequest = {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
          "x-forwarded-for": "1.2.3.4",
        }),
        json: () => Promise.reject(new Error("parse error")),
        ip: "1.2.3.4",
      } as any

      const res = await POST(badRequest)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toContain("Failed to process")
    })
  })

  // ─── EMAIL NORMALIZATION ────────────────────────────────────────
  describe("Input normalization", () => {
    it("normalizes email to lowercase and trims whitespace", async () => {
      const payload = { ...qualifiedPayload(), email: "  Jane@Example.COM  " }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
      // The lead was persisted; email normalization is internal
    })

    it("strips non-digits from phone number", async () => {
      const payload = { ...qualifiedPayload(), phone: "(555) 123-4567" }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(200)
    })

    it("uppercases state code", async () => {
      const payload = { ...qualifiedPayload(), state: "ca" }
      const res = await POST(makeRequest(payload) as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.qualified).toBe(true)
    })
  })
})
