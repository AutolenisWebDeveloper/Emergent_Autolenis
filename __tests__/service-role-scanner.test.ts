/**
 * Service-Role Scanner Test
 *
 * Ensures that createAdminClient() (Supabase service-role client) is NEVER used
 * in normal user-facing portal API routes. Service role is only allowed in:
 *   - /api/webhooks/**
 *   - /api/cron/**
 *   - lib/ (shared utilities like admin-auth, auth.service, workspace-bootstrap)
 *   - scripts/ (migration scripts)
 *
 * This test will fail CI if service-role usage creeps into portal APIs.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = join(__dirname, "..")

/**
 * Paths that are ALLOWED to use createAdminClient / SUPABASE_SERVICE_ROLE_KEY.
 * Everything else under app/api/ is forbidden.
 */
const ALLOWED_PATTERNS = [
  // Webhook & cron endpoints (server-to-server, signature-verified)
  /^app\/api\/webhooks\//,
  /^app\/api\/cron\//,
  // Admin auth uses service role for user lookup (admin-only, audited)
  /^app\/api\/admin\/auth\//,
  // Admin search and admin management (SUPER_ADMIN gated)
  /^app\/api\/admin\/search/,
  /^app\/api\/admin\/external-preapprovals/,
  // Auth service routes that need service role for user creation
  /^app\/api\/auth\/signup/,
  /^app\/api\/auth\/signin/,
  // Shared lib files (not API routes)
  /^lib\//,
  // Scripts
  /^scripts\//,
]

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          if (entry === "node_modules" || entry === ".next" || entry === ".git") continue
          getAllTsFiles(fullPath, files)
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          files.push(fullPath)
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files
}

function isAllowed(relPath: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(relPath))
}

describe("Service-Role Scanner", () => {
  it("should not use createAdminClient in non-allowed app/api paths", () => {
    const apiDir = join(ROOT, "app", "api")
    const files = getAllTsFiles(apiDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = relative(ROOT, file).replace(/\\/g, "/")
      if (isAllowed(relPath)) continue

      const content = readFileSync(file, "utf-8")
      if (content.includes("createAdminClient")) {
        violations.push(relPath)
      }
    }

    if (violations.length > 0) {
      console.error(
        "\n🚨 Service-role violations found!\n" +
          "The following files use createAdminClient() but are NOT in the allowed list:\n" +
          violations.map((v) => `  - ${v}`).join("\n") +
          "\n\nFix: Replace createAdminClient() with createClient() from @/lib/supabase/server " +
          "or add the path to ALLOWED_PATTERNS if this is a legitimate break-glass endpoint.\n",
      )
    }

    expect(violations).toEqual([])
  })

  it("should not directly reference SUPABASE_SERVICE_ROLE_KEY in portal API files", () => {
    const portalDirs = [
      join(ROOT, "app", "api", "buyer"),
      join(ROOT, "app", "api", "dealer"),
      join(ROOT, "app", "api", "affiliate"),
    ]

    const violations: string[] = []

    for (const dir of portalDirs) {
      try {
        const files = getAllTsFiles(dir)
        for (const file of files) {
          const content = readFileSync(file, "utf-8")
          if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
            violations.push(relative(ROOT, file).replace(/\\/g, "/"))
          }
        }
      } catch {
        // Directory may not exist
      }
    }

    expect(violations).toEqual([])
  })

  it("should not import from @/lib/db (service-role proxy) in new portal API files", () => {
    // lib/db.ts exports a Supabase client with service-role key, bypassing RLS.
    // New portal API routes must use @/lib/supabase/server instead.
    // This test tracks existing violations to prevent new ones from being added.
    const portalDirs = [
      join(ROOT, "app", "api", "buyer"),
      join(ROOT, "app", "api", "dealer"),
      join(ROOT, "app", "api", "affiliate"),
    ]

    const violations: string[] = []

    for (const dir of portalDirs) {
      try {
        const files = getAllTsFiles(dir)
        for (const file of files) {
          const content = readFileSync(file, "utf-8")
          if (content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'")) {
            violations.push(relative(ROOT, file).replace(/\\/g, "/"))
          }
        }
      } catch {
        // Directory may not exist
      }
    }

    // Known legacy violations (tracked baseline — do NOT add new entries)
    const KNOWN_LEGACY_VIOLATIONS = new Set([
      "app/api/buyer/prequal/route.ts",
      "app/api/buyer/prequal/external/route.ts",
      "app/api/buyer/prequal/draft/route.ts",
      "app/api/buyer/profile/route.ts",
      "app/api/buyer/trade-in/route.ts",
      "app/api/buyer/auctions/route.ts",
      "app/api/buyer/auction/route.ts",
      "app/api/buyer/shortlist/route.ts",
      "app/api/buyer/deals/[dealId]/insurance/doc-requests/route.ts",
      "app/api/dealer/requests/route.ts",
      "app/api/dealer/opportunities/route.ts",
      "app/api/dealer/opportunities/[caseId]/offers/route.ts",
      "app/api/dealer/payments/route.ts",
      "app/api/dealer/payments/checkout/route.ts",
      "app/api/dealer/inventory/route.ts",
      "app/api/dealer/inventory/[id]/route.ts",
      "app/api/dealer/inventory/bulk-upload/route.ts",
      "app/api/dealer/inventory/url-import/route.ts",
      "app/api/dealer/inventory/import-history/route.ts",
      "app/api/dealer/messages/route.ts",
      "app/api/dealer/messages/[threadId]/route.ts",
      "app/api/dealer/documents/route.ts",
      "app/api/dealer/documents/upload/route.ts",
      "app/api/dealer/auctions/route.ts",
      "app/api/dealer/auctions/[auctionId]/route.ts",
      "app/api/dealer/deals/route.ts",
      "app/api/dealer/deals/[dealId]/insurance/request-docs/route.ts",
      "app/api/dealer/contracts/route.ts",
      "app/api/dealer/dashboard/route.ts",
      "app/api/affiliate/settings/route.ts",
      "app/api/affiliate/documents/route.ts",
      "app/api/affiliate/commissions/route.ts",
      "app/api/affiliate/analytics/route.ts",
      "app/api/affiliate/share-link/route.ts",
      "app/api/affiliate/dashboard/route.ts",
    ])

    const newViolations = violations.filter((v) => !KNOWN_LEGACY_VIOLATIONS.has(v))

    if (newViolations.length > 0) {
      console.error(
        "\n🚨 New @/lib/db imports detected in portal API routes!\n" +
          "lib/db.ts uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Use @/lib/supabase/server instead.\n" +
          newViolations.map((v) => `  - ${v}`).join("\n") + "\n",
      )
    }

    expect(newViolations).toEqual([])
  })
})
