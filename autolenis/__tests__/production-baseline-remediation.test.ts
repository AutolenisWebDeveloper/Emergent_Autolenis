import { describe, it, expect, beforeAll } from "vitest"
import fs from "fs"
import path from "path"
import { rateLimits } from "@/lib/middleware/rate-limit"

/**
 * Production-safe baseline remediation tests
 *
 * Validates that the security hardening patches are applied correctly:
 * 1. Affiliate click endpoint rate limiting
 * 2. Commission trigger timing-safe auth + Zod validation
 * 3. E-Sign webhook mandatory signature verification
 * 4. Health/DB endpoint error message redaction
 */

const AFFILIATE_CLICK_PATH = path.join(process.cwd(), "app/api/affiliate/click/route.ts")
const COMMISSION_TRIGGER_PATH = path.join(process.cwd(), "app/api/webhooks/stripe/commission-trigger/route.ts")
const ESIGN_WEBHOOK_PATH = path.join(process.cwd(), "app/api/esign/provider-webhook/route.ts")
const HEALTH_DB_PATH = path.join(process.cwd(), "app/api/health/db/route.ts")

describe("Production Baseline Remediation", () => {
  let affiliateClickSource: string
  let commissionTriggerSource: string
  let esignWebhookSource: string
  let healthDbSource: string

  beforeAll(() => {
    affiliateClickSource = fs.readFileSync(AFFILIATE_CLICK_PATH, "utf-8")
    commissionTriggerSource = fs.readFileSync(COMMISSION_TRIGGER_PATH, "utf-8")
    esignWebhookSource = fs.readFileSync(ESIGN_WEBHOOK_PATH, "utf-8")
    healthDbSource = fs.readFileSync(HEALTH_DB_PATH, "utf-8")
  })

  // ─── Affiliate click rate limiting ─────────────────────────
  describe("Affiliate click rate limiting", () => {
    it("imports rateLimit middleware", () => {
      expect(affiliateClickSource).toContain('from "@/lib/middleware/rate-limit"')
    })

    it("applies rate limit to POST handler before processing", () => {
      const postIdx = affiliateClickSource.indexOf("async function POST")
      const rateLimitIdx = affiliateClickSource.indexOf("rateLimit(req", postIdx)
      const bodyParseIdx = affiliateClickSource.indexOf("req.json()", postIdx)
      expect(rateLimitIdx).toBeGreaterThan(postIdx)
      expect(rateLimitIdx).toBeLessThan(bodyParseIdx)
    })

    it("applies rate limit to GET handler before processing", () => {
      const getIdx = affiliateClickSource.indexOf("async function GET")
      const rateLimitIdx = affiliateClickSource.indexOf("rateLimit(req", getIdx)
      const searchParamsIdx = affiliateClickSource.indexOf("searchParams", getIdx)
      expect(rateLimitIdx).toBeGreaterThan(getIdx)
      expect(rateLimitIdx).toBeLessThan(searchParamsIdx)
    })

    it("returns 429 response early when rate limited", () => {
      expect(affiliateClickSource).toContain("if (limited) return limited")
    })

    it("rateLimits.affiliateClick preset has reasonable limits", () => {
      expect(rateLimits.affiliateClick).toBeDefined()
      expect(rateLimits.affiliateClick.maxRequests).toBe(60)
      expect(rateLimits.affiliateClick.windowMs).toBe(60 * 60 * 1000) // 1 hour
    })
  })

  // ─── Commission trigger hardening ──────────────────────────
  describe("Commission trigger hardening", () => {
    it("uses crypto.timingSafeEqual for API key comparison", () => {
      expect(commissionTriggerSource).toContain("timingSafeEqual")
      expect(commissionTriggerSource).toContain('import crypto from "crypto"')
    })

    it("rejects requests when no server-side key is configured", () => {
      expect(commissionTriggerSource).toContain("!expectedKey")
      expect(commissionTriggerSource).toContain("No API key configured")
    })

    it("validates request body with Zod", () => {
      expect(commissionTriggerSource).toContain("z.object")
      expect(commissionTriggerSource).toContain("bodySchema.safeParse")
    })

    it("validates serviceFeePaymentId is a non-empty string", () => {
      expect(commissionTriggerSource).toContain('z.string().min(1')
    })

    it("validates action is either CREATE or REFUND", () => {
      expect(commissionTriggerSource).toContain('z.enum(["CREATE", "REFUND"])')
    })

    it("does not use simple string equality for key comparison", () => {
      // Should NOT have authHeader !== expectedKey (replaced with timingSafeEqual)
      expect(commissionTriggerSource).not.toMatch(/authHeader\s*!==\s*expectedKey/)
    })

    it("logs failed authentication attempts", () => {
      expect(commissionTriggerSource).toContain("Unauthorized access attempt")
    })
  })

  // ─── E-Sign webhook signature enforcement ──────────────────
  describe("E-Sign webhook signature enforcement", () => {
    it("always requires ESIGN_WEBHOOK_SECRET (no conditional bypass)", () => {
      // Must NOT have the old pattern that allows bypass in non-production
      expect(esignWebhookSource).not.toContain('process.env[\'NODE_ENV\'] === "production"')
    })

    it("returns 503 when ESIGN_WEBHOOK_SECRET is not configured", () => {
      expect(esignWebhookSource).toContain("!WEBHOOK_SECRET")
      expect(esignWebhookSource).toContain("Service not configured")
      expect(esignWebhookSource).toContain("503")
    })

    it("normalizeStatus returns null for unknown statuses instead of defaulting to COMPLETED", () => {
      expect(esignWebhookSource).toContain("return null")
      expect(esignWebhookSource).not.toContain('return "COMPLETED" // Default')
    })

    it("rejects unrecognised status values with 422", () => {
      expect(esignWebhookSource).toContain("Unrecognised event status")
      expect(esignWebhookSource).toContain("422")
    })

    it("uses structured logger instead of console.error", () => {
      expect(esignWebhookSource).toContain("logger.error")
      expect(esignWebhookSource).not.toContain("console.error")
    })

    it("does not use any type annotation on error catch", () => {
      // Should use untyped catch (not `error: any`)
      expect(esignWebhookSource).not.toContain("error: any")
      expect(esignWebhookSource).toMatch(/catch\s*\(\s*error\s*\)/)
    })
  })

  // ─── Health/DB error message redaction ─────────────────────
  describe("Health/DB error message redaction", () => {
    it("does not expose raw error.message to clients", () => {
      // Should NOT have `error: error.message` or `error: errorMessage`
      expect(healthDbSource).not.toContain("error: error.message")
      expect(healthDbSource).not.toContain("error: errorMessage")
    })

    it("returns generic error messages for Supabase query failures", () => {
      expect(healthDbSource).toContain('"Database query failed"')
    })

    it("returns generic error messages for unexpected errors", () => {
      expect(healthDbSource).toContain('"Internal server error"')
    })

    it("returns descriptive but safe error for missing canary table", () => {
      expect(healthDbSource).toContain('"Canary table not found"')
    })

    it("logs actual error details server-side", () => {
      expect(healthDbSource).toContain("console.error")
      expect(healthDbSource).toContain("[Health/DB]")
    })
  })
})
