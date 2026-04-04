/**
 * Tests for the Canon Knowledge Pack — validates structure,
 * completeness, and governance metadata.
 */

import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const CANON_DIR = join(process.cwd(), "canon")

// ---------------------------------------------------------------------------
// Canon Pack completeness
// ---------------------------------------------------------------------------

const EXPECTED_DOCS = [
  "01_product_overview.md",
  "02_roles_and_permissions.md",
  "03_end_to_end_flow.md",
  "04_contract_shield.md",
  "05_insurance.md",
  "06_payments_and_fees.md",
  "07_dealer_workflows.md",
  "08_affiliate_program.md",
  "09_refinance.md",
  "10_compliance_and_disclosures.md",
  "11_glossary.md",
]

describe("Canon Knowledge Pack — file existence", () => {
  for (const doc of EXPECTED_DOCS) {
    it(`${doc} exists`, () => {
      expect(existsSync(join(CANON_DIR, doc))).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// Frontmatter validation
// ---------------------------------------------------------------------------

describe("Canon Knowledge Pack — frontmatter", () => {
  for (const doc of EXPECTED_DOCS) {
    it(`${doc} has YAML frontmatter with required fields`, () => {
      const content = readFileSync(join(CANON_DIR, doc), "utf-8")
      // Must start with ---
      expect(content.startsWith("---")).toBe(true)

      // Must have closing ---
      const closingIndex = content.indexOf("---", 3)
      expect(closingIndex).toBeGreaterThan(3)

      const frontmatter = content.slice(3, closingIndex)
      // Required fields
      expect(frontmatter).toContain("id:")
      expect(frontmatter).toContain("version:")
      expect(frontmatter).toContain("updatedAt:")
      expect(frontmatter).toContain("tags:")
      expect(frontmatter).toContain("roleVisibility:")
    })
  }
})

// ---------------------------------------------------------------------------
// Content quality checks
// ---------------------------------------------------------------------------

describe("Canon Knowledge Pack — content quality", () => {
  it("product overview mentions AutoLenis", () => {
    const content = readFileSync(join(CANON_DIR, "01_product_overview.md"), "utf-8")
    expect(content).toContain("AutoLenis")
  })

  it("product overview mentions concierge intermediary", () => {
    const content = readFileSync(join(CANON_DIR, "01_product_overview.md"), "utf-8")
    expect(content).toContain("concierge")
  })

  it("roles document covers all four roles", () => {
    const content = readFileSync(join(CANON_DIR, "02_roles_and_permissions.md"), "utf-8")
    expect(content).toContain("Buyer")
    expect(content).toContain("Dealer")
    expect(content).toContain("Admin")
    expect(content).toContain("Affiliate")
  })

  it("payments document includes fee amounts", () => {
    const content = readFileSync(join(CANON_DIR, "06_payments_and_fees.md"), "utf-8")
    expect(content).toContain("499")
    expect(content).toContain("400")
    expect(content).toContain("99")
  })

  it("contract shield document exists and is non-empty", () => {
    const content = readFileSync(join(CANON_DIR, "04_contract_shield.md"), "utf-8")
    expect(content.length).toBeGreaterThan(100)
  })

  it("glossary defines key terms", () => {
    const content = readFileSync(join(CANON_DIR, "11_glossary.md"), "utf-8")
    expect(content).toContain("OTD")
    expect(content).toContain("Pre-Qualification")
  })

  it("affiliate program mentions commissions", () => {
    const content = readFileSync(join(CANON_DIR, "08_affiliate_program.md"), "utf-8")
    expect(content).toContain("commission")
  })

  it("compliance document includes disclosure requirements", () => {
    const content = readFileSync(join(CANON_DIR, "10_compliance_and_disclosures.md"), "utf-8")
    expect(content).toContain("disclosure")
  })
})

// ---------------------------------------------------------------------------
// Governance files
// ---------------------------------------------------------------------------

describe("Canon Knowledge Pack — governance", () => {
  it("canon_manifest.json exists", () => {
    expect(existsSync(join(CANON_DIR, "canon_manifest.json"))).toBe(true)
  })

  it("canon_manifest.json is valid JSON with required fields", () => {
    const raw = readFileSync(join(CANON_DIR, "canon_manifest.json"), "utf-8")
    const manifest = JSON.parse(raw)
    expect(manifest).toHaveProperty("version")
    expect(manifest).toHaveProperty("updatedAt")
    expect(manifest).toHaveProperty("docs")
    expect(Array.isArray(manifest.docs)).toBe(true)
    expect(manifest.docs.length).toBe(EXPECTED_DOCS.length)
  })

  it("canon_manifest.json lists all expected docs", () => {
    const raw = readFileSync(join(CANON_DIR, "canon_manifest.json"), "utf-8")
    const manifest = JSON.parse(raw)
    const docPaths = manifest.docs.map((d: any) => d.path)
    for (const doc of EXPECTED_DOCS) {
      expect(docPaths).toContain(doc)
    }
  })

  it("canon_manifest.json includes staleness rules", () => {
    const raw = readFileSync(join(CANON_DIR, "canon_manifest.json"), "utf-8")
    const manifest = JSON.parse(raw)
    expect(manifest).toHaveProperty("stalenessRules")
  })

  it("knowledge_changelog.md exists", () => {
    expect(existsSync(join(CANON_DIR, "knowledge_changelog.md"))).toBe(true)
  })

  it("knowledge_changelog.md includes v1.0.0 entry", () => {
    const content = readFileSync(join(CANON_DIR, "knowledge_changelog.md"), "utf-8")
    expect(content).toContain("1.0.0")
  })
})
