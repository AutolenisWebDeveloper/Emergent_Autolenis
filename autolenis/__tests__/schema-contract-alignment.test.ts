/**
 * Schema Contract Alignment Test
 *
 * Fails if forbidden raw/legacy field names appear in protected app/service code
 * after the canonical normalization effort. This prevents schema drift.
 *
 * Allowed exceptions:
 *   - migrations/ (SQL migration scripts)
 *   - docs/ (documentation)
 *   - __tests__/ (test files checking for these patterns)
 *   - scripts/ (utility/migration scripts)
 *   - prisma/ (schema definitions using @map)
 *   - explicit normalization compatibility layers (none currently)
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = join(__dirname, "..")

/**
 * Forbidden legacy field names that should not appear in app/service code.
 * These are the snake_case DB column names that have canonical camelCase equivalents.
 */
const FORBIDDEN_FIELD_NAMES = [
  "date_of_birth",
  "address_line1",
  "address_line_1",
  "postal_code",
  "monthly_income_cents",
  "monthly_housing_cents",
  "provider_name",
  // NOTE: prequal_status and max_otd_amount_cents are DB-only columns used
  // by Supabase queries that are not yet tracked in the Prisma schema.
  // They are intentionally excluded from this forbidden list.
]

/**
 * Per-file exemptions for specific forbidden field names.
 * Used when a file legitimately references a forbidden name in raw SQL
 * or because the field is an actual Prisma column in a different model.
 */
const PER_FILE_EXEMPTIONS: Record<string, string[]> = {
  // provider_name is a legitimate Prisma column in InsuranceQuote and InsuranceEvent models
  "lib/services/insurance.service.ts": ["provider_name"],
  // Raw SQL INSERT INTO credit_consent_events uses provider_name as a SQL column
  "lib/services/prequal.service.ts": ["provider_name"],
  // Reads provider_name from Prompt 4 canonical buyer_qualification_active view
  "app/api/buyer/prequal/route.ts": ["provider_name"],
}

/**
 * Directories/paths exempt from the legacy field check.
 */
const EXEMPT_PATTERNS = [
  /^migrations\//,
  /^docs\//,
  /^__tests__\//,
  /^scripts\//,
  /^prisma\//,
  /^\.github\//,
  /^node_modules\//,
  /^\.next\//,
  /^\.git\//,
  /^audit-export\//,
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
        // Skip inaccessible
      }
    }
  } catch {
    // Skip inaccessible
  }
  return files
}

function isExempt(relPath: string): boolean {
  return EXEMPT_PATTERNS.some((p) => p.test(relPath))
}

describe("Schema Contract Alignment", () => {
  it("should not reference forbidden legacy field names in app/ code", () => {
    const appDir = join(ROOT, "app")
    const files = getAllTsFiles(appDir)
    const violations: { file: string; fields: string[] }[] = []

    for (const file of files) {
      const relPath = relative(ROOT, file).replace(/\\/g, "/")
      if (isExempt(relPath)) continue

      const content = readFileSync(file, "utf-8")
      const found: string[] = []

      for (const field of FORBIDDEN_FIELD_NAMES) {
        // Skip if this file has a per-file exemption for this field
        const exemptions = PER_FILE_EXEMPTIONS[relPath] || []
        if (exemptions.includes(field)) continue

        // Match the field as a standalone identifier or string literal
        // (not as part of a larger word)
        const regex = new RegExp(`[\\[\\."'\\s,]${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\]\\."'\\s,:\\)]`, "g")
        if (regex.test(content)) {
          found.push(field)
        }
      }

      if (found.length > 0) {
        violations.push({ file: relPath, fields: found })
      }
    }

    if (violations.length > 0) {
      console.error(
        "\n🚨 Schema contract violations found!\n" +
          "The following files reference forbidden legacy field names:\n" +
          violations
            .map((v) => `  - ${v.file}: ${v.fields.join(", ")}`)
            .join("\n") +
          "\n\nFix: Use canonical camelCase field names from the Prisma schema.\n",
      )
    }

    expect(violations).toEqual([])
  })

  it("should not reference forbidden legacy field names in lib/services/ code", () => {
    const servicesDir = join(ROOT, "lib", "services")
    const files = getAllTsFiles(servicesDir)
    const violations: { file: string; fields: string[] }[] = []

    for (const file of files) {
      const relPath = relative(ROOT, file).replace(/\\/g, "/")
      if (isExempt(relPath)) continue

      const content = readFileSync(file, "utf-8")
      const found: string[] = []

      for (const field of FORBIDDEN_FIELD_NAMES) {
        // Skip if this file has a per-file exemption for this field
        const exemptions = PER_FILE_EXEMPTIONS[relPath] || []
        if (exemptions.includes(field)) continue

        const regex = new RegExp(`[\\[\\."'\\s,]${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\]\\."'\\s,:\\)]`, "g")
        if (regex.test(content)) {
          found.push(field)
        }
      }

      if (found.length > 0) {
        violations.push({ file: relPath, fields: found })
      }
    }

    if (violations.length > 0) {
      console.error(
        "\n🚨 Schema contract violations in services!\n" +
          violations
            .map((v) => `  - ${v.file}: ${v.fields.join(", ")}`)
            .join("\n") +
          "\n",
      )
    }

    expect(violations).toEqual([])
  })
})
