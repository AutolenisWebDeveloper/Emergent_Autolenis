import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Mock setup — must come before importing the module under test
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}))

const mockPrisma = vi.hoisted(() => ({
  adminSession: {
    upsert: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  isDatabaseConfigured: () => true,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/cache/redis-adapter", () => ({
  getCacheAdapter: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    increment: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
  assertProductionCacheReady: vi.fn(),
  ProductionCacheUnavailableError: class extends Error {},
  RedisCacheAdapter: class {},
}))

const mockCookieStore = {
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/utils/cookies", () => ({
  getAdminSessionCookieOptions: () => ({ httpOnly: true, secure: true }),
  getClearCookieOptions: () => ({ httpOnly: true, secure: true, maxAge: 0 }),
}))

// ---------------------------------------------------------------------------
// Import under test — use beforeAll to import after mocks are registered
// ---------------------------------------------------------------------------

let setAdminSession: typeof import("@/lib/admin-auth")["setAdminSession"]
let getAdminSession: typeof import("@/lib/admin-auth")["getAdminSession"]
let updateAdminSession: typeof import("@/lib/admin-auth")["updateAdminSession"]
let clearAdminSession: typeof import("@/lib/admin-auth")["clearAdminSession"]
let cleanupExpiredAdminSessions: typeof import("@/lib/admin-auth")["cleanupExpiredAdminSessions"]
let generateSessionId: typeof import("@/lib/admin-auth")["generateSessionId"]

beforeAll(async () => {
  const mod = await import("@/lib/admin-auth")
  setAdminSession = mod.setAdminSession
  getAdminSession = mod.getAdminSession
  updateAdminSession = mod.updateAdminSession
  clearAdminSession = mod.clearAdminSession
  cleanupExpiredAdminSessions = mod.cleanupExpiredAdminSessions
  generateSessionId = mod.generateSessionId
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Durable Admin Sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sessionData = {
    userId: "user-1",
    email: "admin@example.com",
    role: "ADMIN",
    mfaVerified: true,
    mfaEnrolled: true,
    requiresPasswordReset: false,
    factorId: "factor-abc",
  }

  // -------------------------------------------------------------------------
  // setAdminSession
  // -------------------------------------------------------------------------

  describe("setAdminSession", () => {
    it("persists session to database via prisma.adminSession.upsert", async () => {
      await setAdminSession("sess-1", sessionData, "localhost")

      expect(mockPrisma.adminSession.upsert).toHaveBeenCalledTimes(1)
      const call = mockPrisma.adminSession.upsert.mock.calls[0][0]
      expect(call.where).toEqual({ id: "sess-1" })
      expect(call.create.userId).toBe("user-1")
      expect(call.create.email).toBe("admin@example.com")
      expect(call.create.role).toBe("ADMIN")
      expect(call.create.mfaVerified).toBe(true)
      expect(call.create.mfaEnrolled).toBe(true)
      expect(call.create.requiresPasswordReset).toBe(false)
      expect(call.create.factorId).toBe("factor-abc")
      expect(call.create.expiresAt).toBeInstanceOf(Date)
    })

    it("sets the admin_session cookie", async () => {
      await setAdminSession("sess-2", sessionData, "localhost")

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "admin_session",
        "sess-2",
        expect.objectContaining({ httpOnly: true }),
      )
    })

    it("stores expiresAt roughly 24h in the future", async () => {
      const before = Date.now()
      await setAdminSession("sess-3", sessionData, "localhost")
      const after = Date.now()

      const call = mockPrisma.adminSession.upsert.mock.calls[0][0]
      const expiresMs = call.create.expiresAt.getTime()
      const TTL_24H = 24 * 60 * 60 * 1000

      expect(expiresMs).toBeGreaterThanOrEqual(before + TTL_24H)
      expect(expiresMs).toBeLessThanOrEqual(after + TTL_24H)
    })

    it("handles missing factorId gracefully (null in DB)", async () => {
      const dataNoFactor = { ...sessionData, factorId: undefined }
      await setAdminSession("sess-4", dataNoFactor, "localhost")

      const call = mockPrisma.adminSession.upsert.mock.calls[0][0]
      expect(call.create.factorId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getAdminSession
  // -------------------------------------------------------------------------

  describe("getAdminSession", () => {
    it("returns null when no admin_session cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined)
      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("returns null when session is not found in database", async () => {
      mockCookieStore.get.mockReturnValue({ value: "missing-sess" })
      mockPrisma.adminSession.findUnique.mockResolvedValue(null)

      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("returns session data for valid, non-expired sessions", async () => {
      mockCookieStore.get.mockReturnValue({ value: "valid-sess" })
      mockPrisma.adminSession.findUnique.mockResolvedValue({
        id: "valid-sess",
        userId: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        mfaVerified: true,
        mfaEnrolled: true,
        requiresPasswordReset: false,
        factorId: "factor-abc",
        expiresAt: new Date(Date.now() + 60_000), // expires in 1 min
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getAdminSession()
      expect(result).toEqual({
        userId: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        mfaVerified: true,
        mfaEnrolled: true,
        requiresPasswordReset: false,
        factorId: "factor-abc",
      })
    })

    it("rejects expired sessions and returns null", async () => {
      mockCookieStore.get.mockReturnValue({ value: "expired-sess" })
      mockPrisma.adminSession.findUnique.mockResolvedValue({
        id: "expired-sess",
        userId: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        mfaVerified: false,
        mfaEnrolled: false,
        requiresPasswordReset: false,
        factorId: null,
        expiresAt: new Date(Date.now() - 1000), // already expired
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getAdminSession()
      expect(result).toBeNull()
    })

    it("preserves MFA verification state from database", async () => {
      mockCookieStore.get.mockReturnValue({ value: "mfa-sess" })
      mockPrisma.adminSession.findUnique.mockResolvedValue({
        id: "mfa-sess",
        userId: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        mfaVerified: true,
        mfaEnrolled: true,
        requiresPasswordReset: false,
        factorId: "factor-xyz",
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getAdminSession()
      expect(result?.mfaVerified).toBe(true)
      expect(result?.mfaEnrolled).toBe(true)
      expect(result?.factorId).toBe("factor-xyz")
    })

    it("returns factorId as undefined when null in DB", async () => {
      mockCookieStore.get.mockReturnValue({ value: "no-factor-sess" })
      mockPrisma.adminSession.findUnique.mockResolvedValue({
        id: "no-factor-sess",
        userId: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        mfaVerified: false,
        mfaEnrolled: false,
        requiresPasswordReset: false,
        factorId: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getAdminSession()
      expect(result?.factorId).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // updateAdminSession
  // -------------------------------------------------------------------------

  describe("updateAdminSession", () => {
    it("updates session fields via prisma.adminSession.update", async () => {
      mockCookieStore.get.mockReturnValue({ value: "upd-sess" })

      await updateAdminSession({ mfaVerified: true })

      expect(mockPrisma.adminSession.update).toHaveBeenCalledWith({
        where: { id: "upd-sess" },
        data: { mfaVerified: true },
      })
    })

    it("does nothing when no admin_session cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      await updateAdminSession({ mfaVerified: true })

      expect(mockPrisma.adminSession.update).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // clearAdminSession
  // -------------------------------------------------------------------------

  describe("clearAdminSession", () => {
    it("deletes session from database", async () => {
      mockCookieStore.get.mockReturnValue({ value: "del-sess" })

      await clearAdminSession("localhost")

      expect(mockPrisma.adminSession.delete).toHaveBeenCalledWith({
        where: { id: "del-sess" },
      })
    })

    it("clears cookies even when no session cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      await clearAdminSession("localhost")

      expect(mockPrisma.adminSession.delete).not.toHaveBeenCalled()
      expect(mockCookieStore.set).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // cleanupExpiredAdminSessions
  // -------------------------------------------------------------------------

  describe("cleanupExpiredAdminSessions", () => {
    it("deletes expired sessions and returns count", async () => {
      mockPrisma.adminSession.deleteMany.mockResolvedValue({ count: 5 })

      const count = await cleanupExpiredAdminSessions()

      expect(count).toBe(5)
      expect(mockPrisma.adminSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      })
    })

    it("returns 0 when no expired sessions exist", async () => {
      mockPrisma.adminSession.deleteMany.mockResolvedValue({ count: 0 })

      const count = await cleanupExpiredAdminSessions()

      expect(count).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // generateSessionId
  // -------------------------------------------------------------------------

  describe("generateSessionId", () => {
    it("returns a valid UUID", () => {
      const id = generateSessionId()
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })
  })

  // -------------------------------------------------------------------------
  // Source-level checks
  // -------------------------------------------------------------------------

  describe("Source-level validation", () => {
    const source = fs.readFileSync(
      path.resolve("lib/admin-auth.ts"),
      "utf-8",
    )

    it("does NOT use in-memory Map for admin sessions", () => {
      expect(source).not.toContain("new Map<string,")
      expect(source).not.toContain("adminSessions = new Map")
    })

    it("imports prisma from @/lib/db", () => {
      expect(source).toContain("prisma")
      expect(source).toContain("@/lib/db")
    })

    it("exports cleanupExpiredAdminSessions", () => {
      expect(source).toContain("export async function cleanupExpiredAdminSessions")
    })

    it("AdminSession model exists in Prisma schema", () => {
      const schema = fs.readFileSync(
        path.resolve("prisma/schema.prisma"),
        "utf-8",
      )
      expect(schema).toContain("model AdminSession")
      expect(schema).toContain("expiresAt")
      expect(schema).toContain("mfaVerified")
    })
  })
})
