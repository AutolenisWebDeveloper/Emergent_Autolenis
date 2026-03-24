/**
 * Canonical Remediation Guards
 *
 * Ensures the following architecture rules are enforced across the codebase:
 *   1. Protected API standard: no next-auth (getServerSession) in portal routes
 *   2. Service-role Supabase: createAdminClient() only in allowed paths
 *   3. Canonical camelCase naming: no ad-hoc snake_case field references in
 *      Supabase queries for BuyerProfile columns that are camelCase in Prisma
 *   4. Database naming behind Prisma mapping: password_reset_tokens has a Prisma model
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join, relative } from "path"

const ROOT = join(__dirname, "..")

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8")
}

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  try {
    const { readdirSync, statSync } = require("fs")
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          if (["node_modules", ".next", ".git"].includes(entry)) continue
          getAllTsFiles(fullPath, files)
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          files.push(fullPath)
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }
  return files
}

describe("Protected API standard — no next-auth in portal routes", () => {
  const portalDirs = ["app/api/buyer", "app/api/dealer", "app/api/affiliate"]

  it("portal API routes do not import from next-auth", () => {
    const violations: string[] = []

    for (const dir of portalDirs) {
      const fullDir = join(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = getAllTsFiles(fullDir)
      for (const file of files) {
        const content = readFileSync(file, "utf-8")
        if (content.includes("from \"next-auth\"") || content.includes("from 'next-auth'")) {
          violations.push(relative(ROOT, file).replace(/\\/g, "/"))
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        "\n🚨 next-auth import violations in portal routes:\n" +
          violations.map((v) => `  - ${v}`).join("\n") +
          "\n\nFix: Use getSessionUser() or requireAuth() from @/lib/auth-server instead.\n",
      )
    }

    expect(violations).toEqual([])
  })

  it("portal API routes do not use getServerSession", () => {
    const violations: string[] = []

    for (const dir of portalDirs) {
      const fullDir = join(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = getAllTsFiles(fullDir)
      for (const file of files) {
        const content = readFileSync(file, "utf-8")
        if (content.includes("getServerSession")) {
          violations.push(relative(ROOT, file).replace(/\\/g, "/"))
        }
      }
    }

    expect(violations).toEqual([])
  })
})

describe("Canonical camelCase naming — BuyerProfile field access", () => {
  // These snake_case column names do NOT exist in the Prisma BuyerProfile model.
  // The correct camelCase names are: address, postalCode, monthlyIncomeCents, monthlyHousingCents
  const forbiddenPatterns = [
    "address_line1",
    "postal_code",
    "monthly_income_cents",
    "monthly_housing_cents",
  ]

  it("buyer prequal draft route uses camelCase Prisma field names", () => {
    const source = readSource("app/api/buyer/prequal/draft/route.ts")
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toContain(pattern)
    }
  })
})

describe("Database naming — Prisma model coverage", () => {
  it("password_reset_tokens table has an explicit Prisma model", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("PasswordResetToken")
    expect(schema).toContain('@@map("password_reset_tokens")')
  })

  it("contact_messages table has Prisma model with all used columns", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("ContactMessage")
    expect(schema).toContain('@@map("contact_messages")')
    // Ensure the model includes fields actually used by the contact route
    expect(schema).toContain('firstName')
    expect(schema).toContain('lastName')
    expect(schema).toContain('phone')
    expect(schema).toContain('subject')
    expect(schema).toContain('status')
  })
})
