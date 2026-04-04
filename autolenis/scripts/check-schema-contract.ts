#!/usr/bin/env node
/**
 * Schema Contract & Route Exposure Checker
 *
 * Fails with non-zero exit code if:
 *   1. Forbidden legacy field names appear in app/service code
 *   2. Sensitive routes are missing auth guard imports
 *   3. Public route files import privileged Supabase client
 *
 * Run: npx tsx scripts/check-schema-contract.ts
 * Or:  pnpm check:schema-contract
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs"
import { join, relative, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, "..")
let exitCode = 0

// ---------------------------------------------------------------------------
// 1. Forbidden legacy field names
// ---------------------------------------------------------------------------

const FORBIDDEN_FIELDS = [
  "date_of_birth",
  "address_line1",
  "address_line_1",
  "postal_code",
  "monthly_income_cents",
  "monthly_housing_cents",
  "provider_name",
  "raw_policy_json",
  "is_verified",
  "vehicle_vin",
]

const EXEMPT_DIRS = [
  "migrations",
  "docs",
  "__tests__",
  "scripts",
  "prisma",
  ".github",
  "node_modules",
  ".next",
  ".git",
  "audit-export",
]

// Files where provider_name is allowed (raw SQL for event tables, or
// reading from the Prompt 4 canonical buyer_qualification_active view)
const PROVIDER_NAME_EXEMPT_FILES = [
  "lib/services/insurance.service.ts", // raw SQL for insurance_events
  "lib/services/prequal.service.ts", // raw SQL for credit_consent_events
  "app/api/buyer/prequal/route.ts", // reads provider_name from buyer_qualification_active view
]

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (EXEMPT_DIRS.includes(entry)) continue
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          getAllTsFiles(fullPath, files)
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          files.push(fullPath)
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return files
}

function checkForbiddenFields(): number {
  console.log("\n🔍 Checking for forbidden legacy field names...")
  const dirs = ["app", "lib/services"]
  const violations: { file: string; fields: string[] }[] = []

  for (const dir of dirs) {
    const fullDir = join(ROOT, dir)
    if (!existsSync(fullDir)) continue
    const files = getAllTsFiles(fullDir)

    for (const file of files) {
      const relPath = relative(ROOT, file).replace(/\\/g, "/")
      const content = readFileSync(file, "utf-8")
      const found: string[] = []

      for (const field of FORBIDDEN_FIELDS) {
        // Skip provider_name in exempt files
        if (field === "provider_name" && PROVIDER_NAME_EXEMPT_FILES.some(f => relPath.endsWith(f))) {
          continue
        }

        const regex = new RegExp(`[\\[\\."'\\s,]${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\]\\."'\\s,:\\)]`, "g")
        if (regex.test(content)) {
          found.push(field)
        }
      }

      if (found.length > 0) {
        violations.push({ file: relPath, fields: found })
      }
    }
  }

  if (violations.length > 0) {
    console.error("❌ Forbidden legacy field names found:")
    for (const v of violations) {
      console.error(`   ${v.file}: ${v.fields.join(", ")}`)
    }
    return 1
  }

  console.log("✅ No forbidden legacy field names found")
  return 0
}

// ---------------------------------------------------------------------------
// 2. Sensitive route guard check
// ---------------------------------------------------------------------------

const SENSITIVE_ROUTES = [
  "app/api/health/providers/route.ts",
  "app/api/health/db/route.ts",
  "app/api/auth/diagnostics/route.ts",
  "app/api/contract/scan/route.ts",
]

function checkRouteGuards(): number {
  console.log("\n🔍 Checking sensitive routes for auth guards...")
  let violations = 0

  for (const routeRel of SENSITIVE_ROUTES) {
    const fullPath = join(ROOT, routeRel)
    if (!existsSync(fullPath)) {
      console.log(`   ⚠️  ${routeRel} does not exist (skipped)`)
      continue
    }

    const content = readFileSync(fullPath, "utf-8")
    const hasGuard = content.includes("withAuth") ||
                     content.includes("requireInternalRequest") ||
                     content.includes("requireAuth")

    if (!hasGuard) {
      console.error(`   ❌ ${routeRel} — missing auth guard`)
      violations++
    }
  }

  // Check deprecated route
  const deprecatedPath = join(ROOT, "app/api/auction/[id]/best-price/route.ts")
  if (existsSync(deprecatedPath)) {
    const content = readFileSync(deprecatedPath, "utf-8")
    const isDeprecated = content.includes("410") || content.includes("GONE")
    const isProtected = content.includes("withAuth") || content.includes("requireAuth")
    if (!isDeprecated && !isProtected) {
      console.error("   ❌ app/api/auction/[id]/best-price/route.ts — not deprecated or protected")
      violations++
    }
  }

  if (violations === 0) {
    console.log("✅ All sensitive routes have auth guards")
  }
  return violations > 0 ? 1 : 0
}

// ---------------------------------------------------------------------------
// 3. Privileged client import check
// ---------------------------------------------------------------------------

const PRIVILEGED_IMPORTS = [
  "createAdminClient",
  "getSupabasePrivilegedClient",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const PRIVILEGED_ALLOWED = [
  /^app\/api\/webhooks\//,
  /^app\/api\/cron\//,
  /^app\/api\/admin\//,
  /^app\/api\/auth\/signup/,
  /^app\/api\/auth\/signin/,
  /^app\/api\/auth\/me/,
  /^app\/api\/auth\/diagnostics/,
  /^app\/api\/auth\/health/,
  /^app\/api\/health\//,
  /^lib\//,
  /^scripts\//,
]

function checkPrivilegedImports(): number {
  console.log("\n🔍 Checking for privileged client imports in public routes...")
  const apiDir = join(ROOT, "app/api")
  if (!existsSync(apiDir)) return 0

  const files = getAllTsFiles(apiDir)
  let violations = 0

  for (const file of files) {
    const relPath = relative(ROOT, file).replace(/\\/g, "/")

    // Skip allowed patterns
    if (PRIVILEGED_ALLOWED.some(p => p.test(relPath))) continue

    const content = readFileSync(file, "utf-8")

    for (const imp of PRIVILEGED_IMPORTS) {
      if (content.includes(imp)) {
        console.error(`   ❌ ${relPath} — imports ${imp}`)
        violations++
      }
    }
  }

  if (violations === 0) {
    console.log("✅ No unauthorized privileged client imports")
  }
  return violations > 0 ? 1 : 0
}

// ---------------------------------------------------------------------------
// 4. Legacy ExternalPreApproval write guard
//    ExternalPreApproval is legacy-only. All writes must go through
//    ExternalPreApprovalSubmission (EPAS). Reads are allowed for backward
//    compatibility but any create/update/upsert/delete is forbidden.
// ---------------------------------------------------------------------------

const LEGACY_WRITE_PATTERNS = [
  /externalPreApproval\.\s*(create|update|upsert|delete|createMany|updateMany|deleteMany)/,
  /ExternalPreApproval\.\s*(create|update|upsert|delete)/,
]

function checkLegacyExternalPreApprovalWrites(): number {
  console.log("\n🔍 Checking for forbidden legacy ExternalPreApproval writes...")
  const dirs = ["app", "lib/services"]
  const violations: { file: string; line: number; snippet: string }[] = []

  for (const dir of dirs) {
    const fullDir = join(ROOT, dir)
    if (!existsSync(fullDir)) continue
    const files = getAllTsFiles(fullDir)

    for (const file of files) {
      const relPath = relative(ROOT, file).replace(/\\/g, "/")
      const content = readFileSync(file, "utf-8")
      const lines = content.split("\n")

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        for (const pattern of LEGACY_WRITE_PATTERNS) {
          // Skip if it's ExternalPreApprovalSubmission (the canonical table)
          if (line.includes("externalPreApprovalSubmission") || line.includes("ExternalPreApprovalSubmission")) {
            continue
          }
          if (pattern.test(line)) {
            violations.push({ file: relPath, line: i + 1, snippet: line.trim().substring(0, 120) })
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("❌ Forbidden legacy ExternalPreApproval write operations found:")
    for (const v of violations) {
      console.error(`   ${v.file}:${v.line} — ${v.snippet}`)
    }
    return 1
  }

  console.log("✅ No legacy ExternalPreApproval write operations found")
  return 0
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("═══════════════════════════════════════════════════")
  console.log("  AutoLenis Schema Contract & Route Exposure Check")
  console.log("═══════════════════════════════════════════════════")

  exitCode |= checkForbiddenFields()
  exitCode |= checkRouteGuards()
  exitCode |= checkPrivilegedImports()
  exitCode |= checkLegacyExternalPreApprovalWrites()

  console.log("")
  if (exitCode !== 0) {
    console.error("💥 Schema contract check FAILED")
  } else {
    console.log("🎉 All checks passed!")
  }

  process.exit(exitCode)
}

// ---------------------------------------------------------------------------
// 4. LIVE / heuristic provider confusion gate
// ---------------------------------------------------------------------------

/**
 * Fails if LIVE workspace code can reach a heuristic/internal provider
 * without going through the provider registry's LIVE guard.
 *
 * Detects: direct InternalPreQualProvider.prequalify() calls in
 * LIVE-facing route files (app/api/buyer/prequal/).
 */
function checkLiveHeuristicConfusion(): number {
  console.log("\n🔍 Checking for LIVE/heuristic provider confusion...")

  const routeDir = join(ROOT, "app/api/buyer/prequal")
  if (!existsSync(routeDir)) return 0

  const files = getAllTsFiles(routeDir)
  let violations = 0

  for (const file of files) {
    const relPath = relative(ROOT, file).replace(/\\/g, "/")
    const content = readFileSync(file, "utf-8")

    // Flag direct calls to InternalPreQualProvider (static or instance)
    if (
      content.includes("InternalPreQualProvider.prequalify") ||
      content.includes("internalProvider.prequalify") ||
      content.includes("new InternalPreQualProvider")
    ) {
      console.error(
        `   ❌ ${relPath} — calls InternalPreQualProvider directly. Use providerRegistry.resolve() instead.`,
      )
      violations++
    }
  }

  if (violations === 0) {
    console.log("✅ No LIVE/heuristic provider confusion found")
  }
  return violations > 0 ? 1 : 0
}

// ---------------------------------------------------------------------------
// 5. Consent artifact requirement gate
// ---------------------------------------------------------------------------

/**
 * Fails if provider-backed prequal code can execute without a consent artifact.
 *
 * Checks that the prequal service references ConsentArtifact or
 * consentArtifactService in the start flow.
 */
function checkConsentArtifactRequirement(): number {
  console.log("\n🔍 Checking consent artifact requirement...")

  const servicePath = join(ROOT, "lib/services/prequal.service.ts")
  if (!existsSync(servicePath)) {
    console.error("   ❌ lib/services/prequal.service.ts not found")
    return 1
  }

  const content = readFileSync(servicePath, "utf-8")

  const hasConsentArtifactImport =
    content.includes("consentArtifactService") ||
    content.includes("ConsentArtifactService")

  if (!hasConsentArtifactImport) {
    console.error(
      "   ❌ prequal.service.ts does not reference consent artifact service. " +
        "Provider-backed prequal must capture a consent artifact before execution.",
    )
    return 1
  }

  console.log("✅ Consent artifact requirement enforced")
  return 0
}

// ---------------------------------------------------------------------------
// 6. Forwarding authorization requirement gate
// ---------------------------------------------------------------------------

/**
 * Fails if forwarding-related code exists without referencing
 * ForwardingAuthorization enforcement.
 *
 * Checks that the forwarding authorization service exists and is
 * properly structured.
 */
function checkForwardingAuthorizationRequirement(): number {
  console.log("\n🔍 Checking forwarding authorization requirement...")

  const servicePath = join(
    ROOT,
    "lib/services/prequal/forwarding-authorization.service.ts",
  )
  if (!existsSync(servicePath)) {
    console.error(
      "   ❌ forwarding-authorization.service.ts not found. " +
        "Forwarding prequal results requires an authorization artifact.",
    )
    return 1
  }

  const content = readFileSync(servicePath, "utf-8")

  const hasEnforcement =
    content.includes("assertForwardingAuthorized") ||
    content.includes("checkAuthorization")

  if (!hasEnforcement) {
    console.error(
      "   ❌ forwarding-authorization.service.ts missing enforcement methods. " +
        "Must include assertForwardingAuthorized() or checkAuthorization().",
    )
    return 1
  }

  console.log("✅ Forwarding authorization requirement enforced")
  return 0
}

main()
