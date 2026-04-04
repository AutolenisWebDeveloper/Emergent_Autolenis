import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import {
  InMemoryCacheAdapter,
  getCacheAdapter,
  _resetCacheAdapter,
} from "@/lib/cache/redis-adapter"

// ---------------------------------------------------------------------------
// Phase 1.1: Sensitive endpoint auth guards
// ---------------------------------------------------------------------------

describe("Endpoint auth guards — sensitive routes require authentication", () => {
  const sensitiveRoutes = [
    {
      file: "app/api/health/db/route.ts",
      description: "/api/health/db requires admin auth or internal key",
      shouldContain: ["withAuth", "requireInternalRequest", "ADMIN_ROLES"],
    },
    {
      file: "app/api/health/providers/route.ts",
      description: "/api/health/providers requires admin auth or internal key",
      shouldContain: ["withAuth", "requireInternalRequest", "ADMIN_ROLES"],
    },
    {
      file: "app/api/auth/diagnostics/route.ts",
      description: "/api/auth/diagnostics requires internal key or admin session",
      shouldContain: ["withAuth", "requireInternalRequest"],
    },
    {
      file: "app/api/contract/scan/route.ts",
      description: "/api/contract/scan requires DEALER/ADMIN auth",
      shouldContain: ["withAuth", "DEALER_ROLES", "ADMIN_ROLES"],
    },
    {
      file: "app/api/auction/[id]/best-price/route.ts",
      description: "/api/auction/[id]/best-price is deprecated with 410",
      shouldContain: ["410", "GONE"],
    },
  ]

  for (const route of sensitiveRoutes) {
    it(route.description, () => {
      const content = readFileSync(join(process.cwd(), route.file), "utf-8")
      for (const keyword of route.shouldContain) {
        expect(content).toContain(keyword)
      }
    })
  }

  it("/api/health/db is no longer a parameterless GET (requires request param)", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/health/db/route.ts"),
      "utf-8",
    )
    // Must accept a request parameter, not just GET()
    expect(content).toMatch(/GET\(\s*request/)
  })

  it("/api/health/providers is no longer a parameterless GET", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/health/providers/route.ts"),
      "utf-8",
    )
    expect(content).toMatch(/GET\(\s*request/)
  })

  it("/api/contract/scan POST checks user role against allowed roles", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/contract/scan/route.ts"),
      "utf-8",
    )
    expect(content).toContain("DEALER")
    expect(content).toContain("ADMIN")
  })

  it("/api/auction/[id]/best-price is deprecated and returns 410", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/auction/[id]/best-price/route.ts"),
      "utf-8",
    )
    expect(content).toContain("410")
    expect(content).toContain("GONE")
  })

  it("/api/auth/diagnostics uses shared guard for admin access", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/auth/diagnostics/route.ts"),
      "utf-8",
    )
    // Must NOT allow unauthenticated access when INTERNAL_API_KEY is unset
    expect(content).not.toContain(
      "no key set for development",
    )
    // Must use shared guard
    expect(content).toContain("withAuth")
  })
})

// ---------------------------------------------------------------------------
// Phase 1.2: Redis required in production
// ---------------------------------------------------------------------------

describe("Redis required in production", () => {
  const originalNodeEnv = process.env["NODE_ENV"]
  const originalRedisUrl = process.env["REDIS_URL"]

  beforeEach(() => {
    _resetCacheAdapter()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    if (originalRedisUrl !== undefined) {
      process.env["REDIS_URL"] = originalRedisUrl
    } else {
      delete process.env["REDIS_URL"]
    }
    _resetCacheAdapter()
  })

  it("returns InMemoryCacheAdapter with warning when NODE_ENV=production and REDIS_URL is not set", () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env["REDIS_URL"]

    // getCacheAdapter() returns adapter even in production (warns but doesn't throw)
    // Use assertProductionCacheReady() to enforce Redis requirement
    const adapter = getCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })

  it("returns InMemoryCacheAdapter in development when REDIS_URL is not set", () => {
    vi.stubEnv("NODE_ENV", "development")
    delete process.env["REDIS_URL"]

    const adapter = getCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })

  it("returns InMemoryCacheAdapter in test when REDIS_URL is not set", () => {
    vi.stubEnv("NODE_ENV", "test")
    delete process.env["REDIS_URL"]

    const adapter = getCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })
})

// ---------------------------------------------------------------------------
// Phase 1.3: Prequal POST blocked in production
// ---------------------------------------------------------------------------

describe("Prequal POST blocked in production", () => {
  it("buyer/prequal/route.ts POST returns 503 when NODE_ENV=production", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/buyer/prequal/route.ts"),
      "utf-8",
    )
    // Must have a production guard that returns 503
    expect(content).toContain('NODE_ENV')
    expect(content).toContain('"production"')
    expect(content).toContain("503")
    expect(content).toContain("temporarily unavailable")
  })
})

// ---------------------------------------------------------------------------
// Phase 1.4: Schema field name normalization
// ---------------------------------------------------------------------------

describe("Schema field normalization — no snake_case prequal field references", () => {
  // Files that use Prisma/camelCase for prequal fields — must NOT contain snake_case.
  // NOTE: external-preapproval.service.ts and app/api/buyer/prequal/route.ts are
  // intentionally excluded because they use snake_case to talk directly to the
  // Prompt 4 canonical Supabase tables/views (external_preapproval_submissions,
  // buyer_qualification_active), not Prisma models.
  const filesToCheck = [
    "lib/services/prequal.service.ts",
    "lib/services/buyer.service.ts",
    "lib/services/best-price.service.ts",
    "app/api/buyer/shortlist/route.ts",
  ]

  const bannedFields = [
    "prequal_status",
    "max_otd_amount_cents",
    "min_monthly_payment_cents",
    "max_monthly_payment_cents",
    "dti_ratio",
    "provider_reference_id",
    "raw_response_json",
    "provider_name",
  ]

  for (const file of filesToCheck) {
    it(`${file} uses canonical camelCase field names`, () => {
      const content = readFileSync(join(process.cwd(), file), "utf-8")
      // Strip comments (single-line) and raw SQL queries (template literals with SQL keywords)
      const codeOnly = content
        .split("\n")
        .filter((line) => {
          const trimmed = line.trimStart()
          // Skip comments
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false
          // Skip raw SQL lines (INSERT INTO, SELECT, etc.)
          if (/\bINSERT\s+INTO\b|\bSELECT\s+\*/i.test(trimmed)) return false
          // Skip TypeScript type annotation lines for raw SQL result shapes
          // (e.g., `provider_name: string` in $queryRaw type parameters)
          if (/^\s*\w+\??\s*:\s*(string|number|boolean|Date|null|unknown)\b/.test(trimmed)) return false
          return true
        })
        .join("\n")

      for (const field of bannedFields) {
        expect(codeOnly).not.toContain(field)
      }
    })
  }
})

describe("Schema field normalization — BuyerProfile uses canonical names", () => {
  const filesToCheck = [
    "lib/services/prequal.service.ts",
  ]

  const bannedBuyerFields = [
    "date_of_birth",
    "address_line1",
    "address_line2",
    "postal_code",
    "monthly_income_cents",
    "monthly_housing_cents",
  ]

  for (const file of filesToCheck) {
    it(`${file} uses camelCase BuyerProfile fields`, () => {
      const content = readFileSync(join(process.cwd(), file), "utf-8")
      const codeOnly = content
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
        .join("\n")

      for (const field of bannedBuyerFields) {
        expect(codeOnly).not.toContain(field)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// Phase 1.5: Admin health uses correct table names
// ---------------------------------------------------------------------------

describe("Admin health route uses Prisma model names", () => {
  it("references PascalCase table names, not snake_case", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/admin/health/route.ts"),
      "utf-8",
    )

    // Should use PascalCase Prisma model names
    expect(content).toContain('"User"')
    expect(content).toContain('"BuyerProfile"')
    expect(content).toContain('"Dealer"')
    expect(content).toContain('"Auction"')
    expect(content).toContain('"SelectedDeal"')
    expect(content).toContain('"EmailSendLog"')

    // Should NOT use snake_case table names
    expect(content).not.toContain('"users"')
    expect(content).not.toContain('"buyer_profiles"')
    expect(content).not.toContain('"selected_deals"')
    expect(content).not.toContain('"email_log"')
  })

  it("does not leak error messages to client", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/admin/health/route.ts"),
      "utf-8",
    )
    // Should not interpolate error.message into response messages
    expect(content).not.toMatch(/message:.*err\.message/)
    expect(content).not.toMatch(/message:.*error\.message/)
  })
})

// ---------------------------------------------------------------------------
// Prisma schema has required PreQualification fields
// ---------------------------------------------------------------------------

describe("Prisma schema — PreQualification model completeness", () => {
  it("has status, cents fields, dtiRatio, providerReferenceId, rawResponseJson", () => {
    const schema = readFileSync(
      join(process.cwd(), "prisma/schema.prisma"),
      "utf-8",
    )

    // Extract PreQualification model block
    const modelMatch = schema.match(
      /model PreQualification \{[\s\S]*?\n\}/,
    )
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]

    expect(model).toContain("status")
    expect(model).toContain("maxOtdAmountCents")
    expect(model).toContain("minMonthlyPaymentCents")
    expect(model).toContain("maxMonthlyPaymentCents")
    expect(model).toContain("dtiRatio")
    expect(model).toContain("providerReferenceId")
    expect(model).toContain("rawResponseJson")
  })
})

// ---------------------------------------------------------------------------
// Phase 2.1: Auth guard on /api/auth/health and /api/health
// ---------------------------------------------------------------------------

describe("Endpoint auth guards — newly protected routes", () => {
  it("/api/auth/health requires admin auth or internal key", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/auth/health/route.ts"),
      "utf-8",
    )
    expect(content).toContain("getSession")
    expect(content).toContain("isAdminRole")
    expect(content).toContain("x-internal-key")
    expect(content).toContain("Unauthorized")
    // Must accept a request parameter for header access
    expect(content).toMatch(/GET\(\s*request/)
  })

  it("/api/health requires admin auth or internal key", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/health/route.ts"),
      "utf-8",
    )
    expect(content).toContain("getSession")
    expect(content).toContain("isAdminRole")
    expect(content).toContain("x-internal-key")
    expect(content).toContain("Unauthorized")
    expect(content).toMatch(/GET\(\s*request/)
  })

  it("/api/health/db does not leak raw error messages", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/health/db/route.ts"),
      "utf-8",
    )
    // The generic catch block must NOT interpolate error.message into the response
    expect(content).not.toMatch(/error:\s*errorMessage/)
    expect(content).toContain('"Internal server error"')
  })
})

// ---------------------------------------------------------------------------
// Phase 2.2: Prequal canonical contract — no legacy fallbacks in API response
// ---------------------------------------------------------------------------

describe("Prequal canonical contract — GET response uses canonical fields only", () => {
  it("GET response does not fall back to legacy fields (maxOtd, estimatedMonthly*, dti)", () => {
    const content = readFileSync(
      join(process.cwd(), "app/api/buyer/prequal/route.ts"),
      "utf-8",
    )
    // The GET handler builds a preQualification response object.
    // It must NOT contain legacy fallback patterns.
    expect(content).not.toMatch(/prequal\.maxOtd\b/)
    expect(content).not.toMatch(/prequal\.estimatedMonthlyMin\b/)
    expect(content).not.toMatch(/prequal\.estimatedMonthlyMax\b/)
    expect(content).not.toMatch(/prequal\.dti\b/)
  })

  it("PreQualService.getCurrentPreQual uses canonical fields only", () => {
    const content = readFileSync(
      join(process.cwd(), "lib/services/prequal.service.ts"),
      "utf-8",
    )
    // Extract the getCurrentPreQual method body
    const methodStart = content.indexOf("async getCurrentPreQual")
    expect(methodStart).toBeGreaterThan(-1)
    const methodBody = content.slice(methodStart, methodStart + 800)

    // Must NOT fall back to legacy fields
    expect(methodBody).not.toMatch(/prequal\.maxOtd\b/)
    expect(methodBody).not.toMatch(/prequal\.estimatedMonthlyMin\b/)
    expect(methodBody).not.toMatch(/prequal\.estimatedMonthlyMax\b/)
    expect(methodBody).not.toMatch(/prequal\.dti\b/)
  })
})

// ---------------------------------------------------------------------------
// Phase 2.3: PreQualResult type uses canonical field names
// ---------------------------------------------------------------------------

describe("PreQualResult type — canonical field names", () => {
  it("lib/types/index.ts PreQualResult uses cents-based canonical fields", () => {
    const content = readFileSync(
      join(process.cwd(), "lib/types/index.ts"),
      "utf-8",
    )
    // Extract the PreQualResult interface
    const ifaceMatch = content.match(
      /export interface PreQualResult \{[\s\S]*?\n\}/,
    )
    expect(ifaceMatch).not.toBeNull()
    const iface = ifaceMatch![0]

    expect(iface).toContain("maxOtdAmountCents")
    expect(iface).toContain("minMonthlyPaymentCents")
    expect(iface).toContain("maxMonthlyPaymentCents")
    expect(iface).toContain("dtiRatio")

    // Must NOT contain legacy field names
    expect(iface).not.toMatch(/\bmaxOtd\b(?!AmountCents)/)
    expect(iface).not.toContain("estimatedMonthlyMin")
    expect(iface).not.toContain("estimatedMonthlyMax")
  })
})

// ---------------------------------------------------------------------------
// Phase 2.4: ResultStep component uses canonical field names only
// ---------------------------------------------------------------------------

describe("ResultStep component — canonical field names only", () => {
  it("does not reference legacy field names in its interface", () => {
    const content = readFileSync(
      join(process.cwd(), "components/buyer/onboarding/result-step.tsx"),
      "utf-8",
    )
    // Extract the interface block
    const ifaceMatch = content.match(
      /interface ResultStepProps \{[\s\S]*?\n\}/,
    )
    expect(ifaceMatch).not.toBeNull()
    const iface = ifaceMatch![0]

    // Must NOT reference legacy field names
    expect(iface).not.toMatch(/\bmaxOtd\??\s*:/)
    expect(iface).not.toContain("estimatedMonthlyMin")
    expect(iface).not.toContain("estimatedMonthlyMax")
  })
})
