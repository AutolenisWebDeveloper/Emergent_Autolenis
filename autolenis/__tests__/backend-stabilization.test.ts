import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// ---------------------------------------------------------------------------
// Backend Stabilization Regression Tests
//
// Validates:
//   1. No stale table references (AffiliateClick, bare Offer, bare Deal)
//   2. SEO service uses canonical snake_case table/column names
//   3. InventoryImportLog uses canonical snake_case naming
//   4. SQL migration scripts exist for all SQL-created backend objects
//   5. buyer_qualification_active view SQL exists
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..")

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

function fileExists(relPath: string): boolean {
  return existsSync(join(ROOT, relPath))
}

// ── 1) Stale table reference guards ─────────────────────────────────────────

describe("Stale table references — canonical table names", () => {
  describe("AffiliateClick → Click", () => {
    const FILES = [
      "lib/services/admin.service.ts",
      "lib/services/admin/queries.ts",
    ]
    for (const file of FILES) {
      it(`${file} must not reference AffiliateClick`, () => {
        const content = readFile(file)
        expect(content).not.toContain('.from("AffiliateClick")')
      })

      it(`${file} must use Click table`, () => {
        const content = readFile(file)
        expect(content).toContain('.from("Click")')
      })
    }
  })

  describe("Offer → AuctionParticipant (for dealer performance queries)", () => {
    const FILES = [
      "lib/services/admin.service.ts",
      "lib/services/admin/analytics.ts",
    ]
    for (const file of FILES) {
      it(`${file} must not reference bare .from("Offer")`, () => {
        const content = readFile(file)
        expect(content).not.toContain('.from("Offer")')
      })

      it(`${file} must use AuctionParticipant for dealer participation counts`, () => {
        const content = readFile(file)
        expect(content).toContain('.from("AuctionParticipant")')
      })
    }
  })

  describe("Deal → SelectedDeal", () => {
    it('admin search route must not reference .from("Deal")', () => {
      const content = readFile("app/api/admin/search/route.ts")
      expect(content).not.toContain('.from("Deal")')
    })

    it("admin search route must use SelectedDeal", () => {
      const content = readFile("app/api/admin/search/route.ts")
      expect(content).toContain('.from("SelectedDeal")')
    })
  })
})

// ── 2) SEO service canonical alignment ──────────────────────────────────────

describe("SEO service — snake_case table alignment", () => {
  const seoContent = readFile("lib/services/seo.service.ts")

  it("must not reference PascalCase SEO tables", () => {
    expect(seoContent).not.toContain('.from("SeoPages")')
    expect(seoContent).not.toContain('.from("SeoSchema")')
    expect(seoContent).not.toContain('.from("SeoHealth")')
    expect(seoContent).not.toContain('.from("SeoKeywords")')
  })

  it("must use snake_case SEO table names matching canonical SQL", () => {
    expect(seoContent).toContain('.from("seo_pages")')
    expect(seoContent).toContain('.from("seo_schema")')
    expect(seoContent).toContain('.from("seo_health")')
    expect(seoContent).toContain('.from("seo_keywords")')
  })

  it("must use snake_case column names in queries", () => {
    expect(seoContent).toContain("page_key")
    expect(seoContent).toContain("canonical_url")
    expect(seoContent).toContain("og_title")
    expect(seoContent).toContain("robots_rule")
    expect(seoContent).toContain("schema_type")
    expect(seoContent).toContain("schema_json")
    expect(seoContent).toContain("issues_json")
    expect(seoContent).toContain("last_scan_at")
    expect(seoContent).toContain("primary_keyword")
    expect(seoContent).toContain("secondary_keywords")
    expect(seoContent).toContain("target_density")
    expect(seoContent).toContain("actual_density")
  })

  it("must have row mapping functions for snake_case → camelCase", () => {
    expect(seoContent).toContain("mapPageRow")
    expect(seoContent).toContain("mapSchemaRow")
    expect(seoContent).toContain("mapHealthRow")
    expect(seoContent).toContain("mapKeywordsRow")
  })
})

// ── 3) Inventory Import Log — snake_case alignment ──────────────────────────

describe("Inventory Import Log — snake_case table alignment", () => {
  it("bulk-upload route must use snake_case table name", () => {
    const content = readFile("app/api/dealer/inventory/bulk-upload/route.ts")
    expect(content).not.toContain('.from("InventoryImportLog")')
    expect(content).toContain('.from("inventory_import_log")')
  })

  it("import-history route must use snake_case table name", () => {
    const content = readFile("app/api/dealer/inventory/import-history/route.ts")
    expect(content).not.toContain('.from("InventoryImportLog")')
    expect(content).toContain('.from("inventory_import_log")')
  })

  it("bulk-upload route must use snake_case column names", () => {
    const content = readFile("app/api/dealer/inventory/bulk-upload/route.ts")
    expect(content).toContain("dealer_id:")
    expect(content).toContain("user_id:")
    expect(content).toContain("file_name:")
    expect(content).toContain("file_size:")
    expect(content).toContain("total_rows:")
    expect(content).toContain("success_rows:")
    expect(content).toContain("failed_rows:")
  })

  it("import-history route must use snake_case column names", () => {
    const content = readFile("app/api/dealer/inventory/import-history/route.ts")
    expect(content).toContain('"dealer_id"')
    expect(content).toContain('"created_at"')
  })
})

// ── 4) SQL migration scripts existence ──────────────────────────────────────

describe("SQL migration scripts — backend artifacts", () => {
  it("103-create-inventory-import-log.sql exists", () => {
    expect(fileExists("scripts/103-create-inventory-import-log.sql")).toBe(true)
  })

  it("103 script creates inventory_import_log table", () => {
    const sql = readFile("scripts/103-create-inventory-import-log.sql")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS inventory_import_log")
    expect(sql).toContain("dealer_id")
    expect(sql).toContain("file_name")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
  })

  it("104-create-buyer-qualification-view.sql exists", () => {
    expect(fileExists("scripts/104-create-buyer-qualification-view.sql")).toBe(true)
  })

  it("104 script creates buyer_qualification_active view", () => {
    const sql = readFile("scripts/104-create-buyer-qualification-view.sql")
    expect(sql).toContain("CREATE OR REPLACE VIEW buyer_qualification_active")
    expect(sql).toContain("PreQualification")
    expect(sql).toContain("external_preapproval_submissions")
  })

  it("105-create-external-preapproval-submissions.sql exists", () => {
    expect(fileExists("scripts/105-create-external-preapproval-submissions.sql")).toBe(true)
  })

  it("105 script creates all canonical EPAS backend objects", () => {
    const sql = readFile("scripts/105-create-external-preapproval-submissions.sql")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS external_preapproval_submissions")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS external_preapproval_status_history")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS external_preapproval_documents")
    expect(sql).toContain("external_preapproval_set_status")
    expect(sql).toContain("external_preapproval_approve")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
  })

  it("70-create-seo-tables.sql uses snake_case table names", () => {
    const sql = readFile("scripts/70-create-seo-tables.sql")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS seo_pages")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS seo_schema")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS seo_health")
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS seo_keywords")
  })
})
