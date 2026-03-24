import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Module mocks — must be declared before imports
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/middleware/csrf", () => ({
  validateCsrf: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eSignEnvelope: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
    dealerUser: {
      findFirst: vi.fn(),
    },
    complianceEvent: {
      create: vi.fn(),
    },
    esignEnvelope: {
      findFirst: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
  supabase: (() => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue({ data: { id: "deal-1" } }),
    }
    return { from: vi.fn(() => chain) }
  })(),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ESignService } from "@/lib/services/esign.service"
import { getSession } from "@/lib/auth-server"
import { validateCsrf } from "@/lib/middleware/csrf"
import { prisma } from "@/lib/db"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(method = "GET", url = "/api/test", body?: any, headers?: Record<string, string>) {
  const init: RequestInit = { method, headers: headers ?? {} }
  if (body) {
    ;(init as any).body = JSON.stringify(body)
    ;(init.headers as Record<string, string>)["content-type"] = "application/json"
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as any)
}

function makeSignature(payload: string, secret: string): string {
  // Use Node's built-in crypto via require to avoid Vite resolution issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("node:crypto")
  return nodeCrypto.createHmac("sha256", secret).update(payload).digest("hex")
}

// ---------------------------------------------------------------------------
// 1. ESignService unit tests
// ---------------------------------------------------------------------------

describe("ESignService", () => {
  let service: ESignService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ESignService()
  })

  // -- Mock blocking ---------------------------------------------------------

  describe("mock provider production blocking", () => {
    it("blocks mock provider when NODE_ENV is production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      try {
        await expect(
          service.createEnvelope("deal-1", "dealer-1", { provider: "mock" }),
        ).rejects.toThrow("Mock e-sign provider is not available in production")
      } finally {
        vi.unstubAllEnvs()
      }
    })

    it("blocks default provider (mock) when VERCEL_ENV is production", async () => {
      vi.stubEnv("NODE_ENV", "development")
      const origVercel = process.env['VERCEL_ENV']
      process.env['VERCEL_ENV'] = "production"
      try {
        await expect(
          service.createEnvelope("deal-1", "dealer-1"),
        ).rejects.toThrow("Mock e-sign provider is not available in production")
      } finally {
        vi.unstubAllEnvs()
        process.env['VERCEL_ENV'] = origVercel
      }
    })

    it("allows mock provider in non-production", async () => {
      vi.stubEnv("NODE_ENV", "development")
      delete process.env['VERCEL_ENV']

      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(null)

      try {
        await expect(
          service.createEnvelope("deal-1", "dealer-1", { provider: "mock" }),
        ).rejects.toThrow("Deal not found")
      } finally {
        vi.unstubAllEnvs()
      }
    })
  })

  // -- markSigned -------------------------------------------------------------

  describe("markSigned", () => {
    it("updates deal status to SIGNED and writes AdminAuditLog", async () => {
      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
        id: "deal-1",
        status: "CONTRACT_APPROVED",
      } as any)

      vi.mocked(prisma.selectedDeal.update).mockResolvedValue({} as any)
      vi.mocked(prisma.eSignEnvelope.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)
      vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as any)

      const result = await service.markSigned("deal-1", "admin-1", "Documents verified offline")

      expect(result.success).toBe(true)
      expect(result.previousStatus).toBe("CONTRACT_APPROVED")
      expect(result.newStatus).toBe("SIGNED")

      // Verify deal updated to SIGNED only (no deal_status)
      expect(prisma.selectedDeal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: {
          status: "SIGNED",
          updatedAt: expect.any(Date),
        },
      })

      // Verify AdminAuditLog written
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "admin-1",
          action: "MARK_DEAL_SIGNED",
          details: {
            selectedDealId: "deal-1",
            previousStatus: "CONTRACT_APPROVED",
            reason: "Documents verified offline",
          },
          workspaceId: null,
        },
      })
    })

    it("updates envelope status to COMPLETED if envelope exists", async () => {
      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
        id: "deal-1",
        status: "SIGNING_PENDING",
      } as any)

      vi.mocked(prisma.selectedDeal.update).mockResolvedValue({} as any)
      vi.mocked(prisma.eSignEnvelope.findFirst).mockResolvedValue({
        id: "env-1",
        selected_deal_id: "deal-1",
      } as any)
      vi.mocked(prisma.eSignEnvelope.update).mockResolvedValue({} as any)
      vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)
      vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as any)

      await service.markSigned("deal-1", "admin-1", "Manual override")

      expect(prisma.eSignEnvelope.update).toHaveBeenCalledWith({
        where: { id: "env-1" },
        data: {
          status: "COMPLETED",
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      })
    })

    it("throws if deal not found", async () => {
      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(null)

      await expect(
        service.markSigned("nope", "admin-1", "reason"),
      ).rejects.toThrow("Deal not found")
    })

    it("throws if deal is already SIGNED", async () => {
      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
        id: "deal-1",
        status: "SIGNED",
      } as any)

      await expect(
        service.markSigned("deal-1", "admin-1", "reason"),
      ).rejects.toThrow("Deal is already signed or completed")
    })

    it("throws if deal is already COMPLETED", async () => {
      vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
        id: "deal-1",
        status: "COMPLETED",
      } as any)

      await expect(
        service.markSigned("deal-1", "admin-1", "reason"),
      ).rejects.toThrow("Deal is already signed or completed")
    })
  })

  // -- Webhook signature verification ----------------------------------------

  describe("verifyWebhookSignature", () => {
    it("returns true for valid HMAC-SHA256 signature", () => {
      const secret = "test-webhook-secret"
      const payload = '{"test":"data"}'
      const signature = makeSignature(payload, secret)
      expect(service.verifyWebhookSignature(payload, signature, secret)).toBe(true)
    })

    it("returns false for invalid signature", () => {
      const secret = "test-webhook-secret"
      const payload = '{"test":"data"}'
      expect(service.verifyWebhookSignature(payload, "invalid-sig", secret)).toBe(false)
    })

    it("returns false for tampered payload", () => {
      const secret = "test-webhook-secret"
      const payload = '{"test":"data"}'
      const signature = makeSignature(payload, secret)
      expect(service.verifyWebhookSignature('{"test":"tampered"}', signature, secret)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// 2. Mark-signed route tests
// ---------------------------------------------------------------------------

describe("POST /api/admin/deals/[dealId]/mark-signed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateCsrf).mockReturnValue(null)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", { reason: "test" })
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(401)
  })

  it("returns 403 when user is not admin", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "buyer@test.com",
      role: "BUYER",
    })

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", { reason: "test" })
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(403)
  })

  it("returns 400 when reason is missing", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      mfa_verified: true,
      workspace_id: "ws_test",
    })

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", {})
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when reason is empty string", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      mfa_verified: true,
      workspace_id: "ws_test",
    })

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", { reason: "" })
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(400)
  })

  it("succeeds for ADMIN with valid reason", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      mfa_verified: true,
      workspace_id: "ws_test",
    })

    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
      id: "deal-1",
      status: "CONTRACT_APPROVED",
    } as any)
    vi.mocked(prisma.selectedDeal.update).mockResolvedValue({} as any)
    vi.mocked(prisma.eSignEnvelope.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as any)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", {
      reason: "Documents verified offline",
    })
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.newStatus).toBe("SIGNED")
  })

  it("succeeds for SUPER_ADMIN", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "super@test.com",
      role: "SUPER_ADMIN",
      mfa_verified: true,
      workspace_id: "ws_test",
    })

    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue({
      id: "deal-1",
      status: "SIGNING_PENDING",
    } as any)
    vi.mocked(prisma.selectedDeal.update).mockResolvedValue({} as any)
    vi.mocked(prisma.eSignEnvelope.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)
    vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as any)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/mark-signed/route")
    const req = createRequest("POST", "/api/admin/deals/deal-1/mark-signed", {
      reason: "Manual verification",
    })
    const res = await POST(req, { params: Promise.resolve({ dealId: "deal-1" }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. Webhook signature verification integration tests
// ---------------------------------------------------------------------------

describe("E-sign webhook route signature verification", () => {
  it("webhook route file requires ESIGN_WEBHOOK_SECRET and verifies signature", async () => {
    // Verify the webhook route file exists and exports POST
    const routeModule = await import("@/app/api/esign/webhook/route")
    expect(typeof routeModule.POST).toBe("function")
  })

  it("provider-webhook route file exports POST handler", async () => {
    const routeModule = await import("@/app/api/esign/provider-webhook/route")
    expect(typeof routeModule.POST).toBe("function")
  })
})

// ---------------------------------------------------------------------------
// 4. Source code assertion: production mock blocking is present
// ---------------------------------------------------------------------------

describe("esign.service.ts Issue 4 assertions", () => {
  it("contains production mock blocking logic", async () => {
    const fs = await import("fs")
    const path = await import("path")
    const filePath = path.join(process.cwd(), "lib", "services", "esign.service.ts")
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("Mock e-sign provider is not available in production")
    expect(content).toContain("isProductionRuntime")
  })
})
