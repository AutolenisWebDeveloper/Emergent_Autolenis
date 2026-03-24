/**
 * Production readiness regression tests
 * Validates critical fixes from the full-system audit
 */
import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

describe("Production Readiness", () => {
  describe("lib/db.ts — no placeholder credentials", () => {
    const dbContent = fs.readFileSync(path.join(ROOT, "lib/db.ts"), "utf-8")

    it("must NOT contain placeholder.supabase.co", () => {
      expect(dbContent).not.toContain("placeholder.supabase.co")
    })

    it("must NOT contain placeholder-key", () => {
      expect(dbContent).not.toContain("placeholder-key")
    })

    it("should use a proxy for lazy supabase initialization", () => {
      expect(dbContent).toContain("new Proxy")
    })

    it("should throw on missing config rather than returning fake client", () => {
      expect(dbContent).toContain("throw new Error")
    })
  })

  describe("public-footer.tsx — no admin signup link exposed", () => {
    const footerContent = fs.readFileSync(
      path.join(ROOT, "components/layout/public-footer.tsx"),
      "utf-8",
    )

    it("must NOT link to /admin/signup", () => {
      expect(footerContent).not.toContain("/admin/signup")
    })

    it("must NOT contain 'Admin Sign Up' text", () => {
      expect(footerContent).not.toContain("Admin Sign Up")
    })

    it("should NOT have admin sign-in link in footer", () => {
      expect(footerContent).not.toContain("/admin/sign-in")
    })
  })

  describe("dealer/register route — input validation", () => {
    const registerContent = fs.readFileSync(
      path.join(ROOT, "app/api/dealer/register/route.ts"),
      "utf-8",
    )

    it("must import zod for validation", () => {
      expect(registerContent).toMatch(/from\s+["']zod["']/)
    })

    it("must define a validation schema", () => {
      expect(registerContent).toContain("z.object")
    })

    it("must call safeParse on the request body", () => {
      expect(registerContent).toContain("safeParse")
    })

    it("must return 400 on validation failure", () => {
      expect(registerContent).toContain("status: 400")
    })
  })

  describe("refinance/record-redirect — no false success on failure", () => {
    const redirectContent = fs.readFileSync(
      path.join(ROOT, "app/api/refinance/record-redirect/route.ts"),
      "utf-8",
    )

    it("must NOT return success:true when DB is unconfigured", () => {
      // The DB-not-configured path uses the centralized requireDatabase() helper
      // which returns a 503 with a correlationId. Verify the route calls it.
      expect(redirectContent).toContain("requireDatabase")
      expect(redirectContent).toContain("dbUnavailable")
    })

    it("must NOT return success:true in the catch block", () => {
      // Find the outer catch block
      const catchIdx = redirectContent.lastIndexOf("catch")
      const afterCatch = redirectContent.slice(catchIdx)
      // After the last catch, there should NOT be a success: true
      expect(afterCatch).not.toContain("success: true")
    })
  })

  describe("admin stub routes — must have DB wiring or test workspace gating", () => {
    const adminDocRoute = fs.readFileSync(
      path.join(ROOT, "app/api/admin/documents/[documentId]/route.ts"),
      "utf-8",
    )
    const adminRequestsRoute = fs.readFileSync(
      path.join(ROOT, "app/api/admin/requests/route.ts"),
      "utf-8",
    )
    const adminPayoutsRoute = fs.readFileSync(
      path.join(ROOT, "app/api/admin/payouts/route.ts"),
      "utf-8",
    )

    it("admin documents route must check isTestWorkspace", () => {
      expect(adminDocRoute).toContain("isTestWorkspace")
    })

    it("admin documents route must query the database for non-test users", () => {
      expect(adminDocRoute).toContain('supabase')
      expect(adminDocRoute).toContain('.from(')
    })

    it("admin requests route must check isTestWorkspace", () => {
      expect(adminRequestsRoute).toContain("isTestWorkspace")
    })

    it("admin requests route must query the database for non-test users", () => {
      expect(adminRequestsRoute).toContain('supabase')
      expect(adminRequestsRoute).toContain('.from(')
    })

    it("admin payouts route must check isTestWorkspace", () => {
      expect(adminPayoutsRoute).toContain("isTestWorkspace")
    })

    it("admin payouts POST must validate required fields", () => {
      expect(adminPayoutsRoute).toContain("status: 400")
    })
  })

  describe("no production-accessible mock data in non-test-gated routes", () => {
    const apiDir = path.join(ROOT, "app/api")

    function findRouteFiles(dir: string): string[] {
      const results: string[] = []
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...findRouteFiles(fullPath))
        } else if (entry.name === "route.ts" || entry.name === "route.js") {
          results.push(fullPath)
        }
      }
      return results
    }

    it("routes importing mockDb or mockSelectors must also check isTestWorkspace", () => {
      const routeFiles = findRouteFiles(apiDir)
      const violations: string[] = []

      for (const file of routeFiles) {
        const content = fs.readFileSync(file, "utf-8")
        const importsMock =
          content.includes("mockDb") || content.includes("mockSelectors") || content.includes("mockActions")
        const checksTestWorkspace = content.includes("isTestWorkspace")

        // Skip test seed/create-user routes (intentionally test-only)
        const relativePath = path.relative(ROOT, file)
        if (relativePath.includes("test/seed") || relativePath.includes("test/create-user")) {
          continue
        }

        if (importsMock && !checksTestWorkspace) {
          violations.push(relativePath)
        }
      }

      expect(violations).toEqual([])
    })
  })

  // ─── Phase 2: Runtime Configuration Validation ──────────────────────────

  describe("Environment validation schema completeness", () => {
    const envSource = fs.readFileSync(path.join(ROOT, "lib/env.ts"), "utf-8")

    it("validates Supabase URL as a real URL", () => {
      expect(envSource).toContain("NEXT_PUBLIC_SUPABASE_URL")
      expect(envSource).toContain(".url(")
    })

    it("validates JWT_SECRET minimum length of 32 chars", () => {
      expect(envSource).toContain("JWT_SECRET")
      expect(envSource).toContain(".min(32")
    })

    it("validates Stripe keys start with correct prefixes", () => {
      expect(envSource).toContain('startsWith("sk_"')
      expect(envSource).toContain('startsWith("pk_"')
    })

    it("requires RESEND_API_KEY", () => {
      expect(envSource).toContain("RESEND_API_KEY")
    })

    it("requires CRON_SECRET", () => {
      expect(envSource).toContain("CRON_SECRET")
    })

    it("uses Zod for schema validation", () => {
      expect(envSource).toContain("z.object(")
    })
  })

  describe("Stripe integration patterns", () => {
    const stripeSource = fs.readFileSync(path.join(ROOT, "lib/stripe.ts"), "utf-8")

    it("uses lazy initialization (Proxy pattern)", () => {
      expect(stripeSource).toContain("Proxy")
    })

    it("has constructWebhookEvent for signature verification", () => {
      expect(stripeSource).toContain("constructWebhookEvent")
      expect(stripeSource).toContain("STRIPE_WEBHOOK_SECRET")
    })

    it("has deposit and service fee checkout session creators", () => {
      expect(stripeSource).toContain("createDepositCheckoutSession")
      expect(stripeSource).toContain("createServiceFeeCheckoutSession")
    })
  })

  describe("Resend email patterns", () => {
    const resendSource = fs.readFileSync(path.join(ROOT, "lib/resend.ts"), "utf-8")
    const triggerSource = fs.readFileSync(path.join(ROOT, "lib/email/triggers.ts"), "utf-8")

    it("uses lazy initialization for Resend client", () => {
      expect(resendSource).toContain("_resendInstance")
      expect(resendSource).toContain("ensureResend")
    })

    it("throws in production without API key", () => {
      expect(resendSource).toContain("RESEND_API_KEY is required in production")
    })

    it("has proper EMAIL_CONFIG constants", () => {
      expect(resendSource).toContain("EMAIL_CONFIG")
      expect(resendSource).toContain("from:")
      expect(resendSource).toContain("replyTo:")
      expect(resendSource).toContain("adminEmail:")
    })

    it("email triggers use idempotency keys", () => {
      expect(triggerSource).toContain("idempotency")
    })

    it("email triggers send via Resend SDK", () => {
      expect(triggerSource).toContain("emails.send")
    })
  })

  describe("Webhook idempotency patterns", () => {
    const webhookSource = fs.readFileSync(
      path.join(ROOT, "app/api/webhooks/stripe/route.ts"),
      "utf-8"
    )

    it("checks for duplicate events before processing", () => {
      expect(webhookSource).toContain("STRIPE_EVENT_")
      expect(webhookSource).toContain("existingEvent")
    })

    it("inserts idempotency marker", () => {
      expect(webhookSource).toContain("WEBHOOK_PROCESSED")
    })

    it("handles insert conflicts as duplicates", () => {
      expect(webhookSource).toContain("insertError")
      expect(webhookSource).toContain("deduplicated")
    })

    it("verifies Stripe signature before processing", () => {
      expect(webhookSource).toContain("stripe-signature")
      expect(webhookSource).toContain("constructWebhookEvent")
    })

    it("handles all 6 critical event types", () => {
      for (const event of [
        "checkout.session.completed",
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "charge.refunded",
        "charge.dispute.created",
        "payout.paid",
      ]) {
        expect(webhookSource).toContain(event)
      }
    })

    it("uses force-dynamic export", () => {
      expect(webhookSource).toContain('export const dynamic = "force-dynamic"')
    })
  })

  describe("Cron endpoint security", () => {
    it("all cron endpoints validate credentials", () => {
      const endpoints = [
        "app/api/cron/auction-close/route.ts",
        "app/api/cron/affiliate-reconciliation/route.ts",
        "app/api/cron/contract-shield-reconciliation/route.ts",
        "app/api/cron/session-cleanup/route.ts",
      ]

      for (const endpoint of endpoints) {
        const source = fs.readFileSync(path.join(ROOT, endpoint), "utf-8")
        const hasAuth =
          source.includes("CRON_SECRET") ||
          source.includes("validateCronRequest")
        expect(hasAuth, `${endpoint} must validate cron credentials`).toBe(true)
      }
    })
  })

  describe("Auth session patterns", () => {
    const authSource = fs.readFileSync(path.join(ROOT, "lib/auth.ts"), "utf-8")
    const proxySource = fs.readFileSync(path.join(ROOT, "proxy.ts"), "utf-8")

    it("uses JWT for session management", () => {
      expect(authSource).toContain("jose")
      expect(authSource).toContain("createSession")
      expect(authSource).toContain("verifySession")
    })

    it("has role-based redirect logic", () => {
      expect(authSource).toContain("getRoleBasedRedirect")
    })

    it("proxy enforces CSRF validation", () => {
      expect(proxySource).toContain("validateCsrf")
      expect(proxySource).toContain("CSRF_INVALID")
    })

    it("proxy enforces role-based route access for all roles", () => {
      expect(proxySource).toContain('pathname.startsWith("/buyer")')
      expect(proxySource).toContain('pathname.startsWith("/dealer")')
      expect(proxySource).toContain('pathname.startsWith("/admin")')
      expect(proxySource).toContain('pathname.startsWith("/affiliate/portal")')
    })
  })

  describe("Payment service patterns", () => {
    const paymentSource = fs.readFileSync(
      path.join(ROOT, "lib/services/payment.service.ts"),
      "utf-8"
    )

    it("creates payments via Stripe", () => {
      expect(paymentSource).toContain("paymentIntents.create")
    })

    it("has fee calculation logic", () => {
      expect(paymentSource).toContain("calculateBaseFee")
    })

    it("logs compliance events on payment actions", () => {
      expect(paymentSource).toContain("ComplianceEvent")
    })
  })

  describe("No-local-dealers flow completeness", () => {
    it("NoLocalDealersNotice component exists and links to requests", () => {
      const noticePath = path.join(ROOT, "components/buyer/no-local-dealers-notice.tsx")
      expect(fs.existsSync(noticePath)).toBe(true)
      const noticeSource = fs.readFileSync(noticePath, "utf-8")
      expect(noticeSource).toContain("/buyer/requests")
    })

    it("coverage-gap API route exists", () => {
      expect(fs.existsSync(path.join(ROOT, "app/api/buyer/coverage-gap/route.ts"))).toBe(true)
    })

    it("buyer requests pages exist", () => {
      expect(fs.existsSync(path.join(ROOT, "app/buyer/requests/page.tsx"))).toBe(true)
      expect(fs.existsSync(path.join(ROOT, "app/buyer/requests/new/page.tsx"))).toBe(true)
    })
  })

  describe("Critical page existence", () => {
    const criticalPages = [
      "app/auth/signin/page.tsx",
      "app/auth/signup/page.tsx",
      "app/buyer/dashboard/page.tsx",
      "app/buyer/prequal/page.tsx",
      "app/buyer/settings/page.tsx",
      "app/buyer/onboarding/page.tsx",
      "app/dealer/dashboard/page.tsx",
      "app/dealer/settings/page.tsx",
      "app/dealer/onboarding/page.tsx",
      "app/admin/dashboard/page.tsx",
      "app/admin/users/page.tsx",
      "app/admin/payments/page.tsx",
      "app/admin/settings/page.tsx",
      "app/admin/sourcing/page.tsx",
      "app/admin/sign-in/page.tsx",
      "app/affiliate/portal/dashboard/page.tsx",
      "app/affiliate/portal/settings/page.tsx",
      "app/pricing/page.tsx",
      "app/contact/page.tsx",
      "app/refinance/page.tsx",
      "app/insurance/page.tsx",
      "app/contract-shield/page.tsx",
    ]

    for (const page of criticalPages) {
      it(`${page} exists`, () => {
        expect(
          fs.existsSync(path.join(ROOT, page)),
          `Missing critical page: ${page}`
        ).toBe(true)
      })
    }
  })
})
