import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

// ---------------------------------------------------------------------------
// Model Accessor Alignment Tests
//
// Ensures:
//   1. No stale Prisma model accessor names remain in service/route code
//   2. RLS scripts reference only tables that exist in the Prisma schema
//   3. New models (MessageThread, Message, AuctionOfferDecision,
//      InventoryImportJob) are present in the Prisma schema
//   4. Service code uses correct model accessor casing
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..")

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

function getAllTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".next") continue
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(full)
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// 1. Stale Prisma accessor guard
// ---------------------------------------------------------------------------

describe("Model Accessor Alignment — No Stale Accessors", () => {
  const STALE_ACCESSORS: Array<{ pattern: RegExp; correct: string; description: string }> = [
    {
      pattern: /prisma\.contractFixItem\b/,
      correct: "prisma.fixListItem",
      description: "contractFixItem → fixListItem (FixListItem model)",
    },
    {
      pattern: /prisma\.adminSettings\b/,
      correct: "prisma.adminSetting",
      description: "adminSettings → adminSetting (AdminSetting model, singular)",
    },
  ]

  const SERVICE_DIR = join(ROOT, "lib", "services")
  const API_DIR = join(ROOT, "app", "api")

  const tsFiles = [...getAllTsFiles(SERVICE_DIR), ...getAllTsFiles(API_DIR)]

  for (const accessor of STALE_ACCESSORS) {
    it(`no code uses stale accessor: ${accessor.description}`, () => {
      const violations: string[] = []
      for (const filePath of tsFiles) {
        const content = readFileSync(filePath, "utf-8")
        if (accessor.pattern.test(content)) {
          violations.push(relative(ROOT, filePath))
        }
      }
      expect(violations, `Stale accessor found. Use ${accessor.correct} instead`).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Prisma schema contains required models
// ---------------------------------------------------------------------------

describe("Model Accessor Alignment — Required Models Exist", () => {
  const schema = readFile("prisma/schema.prisma")

  const REQUIRED_MODELS = [
    "MessageThread",
    "Message",
    "AuctionOfferDecision",
    "InventoryImportJob",
    "FixListItem",
    "AdminSetting",
  ]

  for (const model of REQUIRED_MODELS) {
    it(`Prisma schema defines model ${model}`, () => {
      const regex = new RegExp(`^model\\s+${model}\\s*\\{`, "m")
      expect(schema).toMatch(regex)
    })
  }
})

// ---------------------------------------------------------------------------
// 3. RLS script references only valid tables
// ---------------------------------------------------------------------------

describe("Model Accessor Alignment — RLS Table References", () => {
  const rlsScript = readFile("scripts/02-add-rls-policies.sql")

  // Stale table names that were renamed or never existed:
  //   "Offer"          — renamed to "AuctionOffer" in schema
  //   "Contract"       — renamed to "ContractDocument" in schema
  //   "Deal"           — renamed to "SelectedDeal" in schema
  //   "AffiliateClick" — renamed to "Click" in schema
  const STALE_TABLES = ['"Offer"', '"Contract"', '"Deal"', '"AffiliateClick"']

  for (const table of STALE_TABLES) {
    it(`RLS script does not reference stale table ${table}`, () => {
      // Match ALTER TABLE or ON <table> but not inside comments
      const lines = rlsScript.split("\n")
      const violations: string[] = []
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (line.startsWith("--")) continue
        if (line.includes(table)) {
          violations.push(`Line ${i + 1}: ${line}`)
        }
      }
      expect(violations, `Stale table ${table} referenced in RLS script`).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// 4. AdminSetting field name consistency
// ---------------------------------------------------------------------------

describe("Model Accessor Alignment — AdminSetting field names", () => {
  const schema = readFile("prisma/schema.prisma")

  it("AdminSetting has 'value' field (not 'valueJson')", () => {
    const modelBlock = schema.match(/model AdminSetting \{[\s\S]*?\n\}/)?.[0]
    expect(modelBlock).toBeDefined()
    expect(modelBlock).toContain("value")
    expect(modelBlock).not.toMatch(/valueJson/)
  })

  it("best-price.service.ts uses setting.value, not setting.valueJson", () => {
    const service = readFile("lib/services/best-price.service.ts")
    expect(service).not.toMatch(/setting\?\.valueJson/)
    expect(service).toMatch(/setting\?\.value/)
  })
})

// ---------------------------------------------------------------------------
// 5. SQL migration for new tables exists
// ---------------------------------------------------------------------------

describe("Model Accessor Alignment — SQL Migration Exists", () => {
  it("106-add-messaging-decision-import-tables.sql exists and defines all 4 tables", () => {
    const sql = readFile("scripts/106-add-messaging-decision-import-tables.sql")
    expect(sql).toContain('"MessageThread"')
    expect(sql).toContain('"Message"')
    expect(sql).toContain('"AuctionOfferDecision"')
    expect(sql).toContain('"InventoryImportJob"')
  })
})
