import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fs from "fs"
import * as path from "path"

// Mock the createAdminClient to prevent DB calls in tests
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("DB not available in test")
  },
}))

import { SEOService } from "@/lib/services/seo.service"
import { getSiteUrl } from "@/lib/seo/site-url"
import { publicPages } from "@/lib/seo/registry"

const seoServiceSource = fs.readFileSync(
  path.join(process.cwd(), "lib/services/seo.service.ts"),
  "utf-8",
)

describe("SEO Deploy Safety", () => {
  let service: SEOService

  beforeEach(() => {
    service = new SEOService()
  })

  describe("getSiteUrl", () => {
    it("returns a non-empty URL", () => {
      const url = getSiteUrl()
      expect(url).toBeTruthy()
      expect(url.startsWith("http")).toBe(true)
    })

    it("has no trailing slash", () => {
      const url = getSiteUrl()
      expect(url.endsWith("/")).toBe(false)
    })
  })

  describe("publicPages registry", () => {
    it("has at least the homepage", () => {
      const home = publicPages.find((p) => p.path === "/")
      expect(home).toBeDefined()
      expect(home!.priority).toBe("1.0")
    })

    it("includes core marketing pages", () => {
      const requiredPaths = ["/", "/about", "/pricing", "/contact", "/how-it-works", "/faq"]
      for (const path of requiredPaths) {
        expect(publicPages.find((p) => p.path === path)).toBeDefined()
      }
    })
  })

  describe("generateSitemap (no DB)", () => {
    it("returns a non-empty array even without DB", async () => {
      const urls = await service.generateSitemap()
      expect(Array.isArray(urls)).toBe(true)
      expect(urls.length).toBeGreaterThan(0)
    })

    it("every entry has loc, lastmod, changefreq, priority", async () => {
      const urls = await service.generateSitemap()
      for (const url of urls) {
        expect(url.loc).toBeTruthy()
        expect(url.lastmod).toBeTruthy()
        expect(url.changefreq).toBeTruthy()
        expect(url.priority).toBeTruthy()
      }
    })

    it("includes the homepage URL", async () => {
      const urls = await service.generateSitemap()
      const baseUrl = getSiteUrl()
      expect(urls.some((u) => u.loc === baseUrl)).toBe(true)
    })
  })

  describe("generateRobotsTxt (no DB)", () => {
    it("returns valid robots.txt content", () => {
      const txt = service.generateRobotsTxt()
      expect(txt).toContain("User-agent: *")
      expect(txt).toContain("Allow: /")
      expect(txt).toContain("Disallow: /admin/")
      expect(txt).toContain("Sitemap:")
      expect(txt).toContain("/sitemap.xml")
    })
  })

  describe("canonical snake_case table names", () => {
    it("uses seo_pages (not SeoPages)", () => {
      expect(seoServiceSource).toContain('.from("seo_pages")')
      expect(seoServiceSource).not.toContain('.from("SeoPages")')
    })

    it("uses seo_schema (not SeoSchema)", () => {
      expect(seoServiceSource).toContain('.from("seo_schema")')
      expect(seoServiceSource).not.toContain('.from("SeoSchema")')
    })

    it("uses seo_health (not SeoHealth)", () => {
      expect(seoServiceSource).toContain('.from("seo_health")')
      expect(seoServiceSource).not.toContain('.from("SeoHealth")')
    })

    it("uses seo_keywords (not SeoKeywords)", () => {
      expect(seoServiceSource).toContain('.from("seo_keywords")')
      expect(seoServiceSource).not.toContain('.from("SeoKeywords")')
    })
  })

  describe("snake_case column mapping", () => {
    it("maps page_key column (not pageKey) in queries", () => {
      expect(seoServiceSource).toContain('.eq("page_key"')
      expect(seoServiceSource).not.toContain('.eq("pageKey"')
    })

    it("maps canonical_url column in selects", () => {
      expect(seoServiceSource).toContain("canonical_url")
    })

    it("maps og_title, og_description, og_image_url columns in selects", () => {
      expect(seoServiceSource).toContain("og_title")
      expect(seoServiceSource).toContain("og_description")
      expect(seoServiceSource).toContain("og_image_url")
    })

    it("maps robots_rule column in selects", () => {
      expect(seoServiceSource).toContain("robots_rule")
    })

    it("maps schema_type and schema_json columns", () => {
      expect(seoServiceSource).toContain("schema_type")
      expect(seoServiceSource).toContain("schema_json")
    })

    it("maps issues_json and last_scan_at columns", () => {
      expect(seoServiceSource).toContain("issues_json")
      expect(seoServiceSource).toContain("last_scan_at")
    })

    it("maps primary_keyword, secondary_keywords, target_density, actual_density columns", () => {
      expect(seoServiceSource).toContain("primary_keyword")
      expect(seoServiceSource).toContain("secondary_keywords")
      expect(seoServiceSource).toContain("target_density")
      expect(seoServiceSource).toContain("actual_density")
    })

    it("includes mapPageRow function with default handling", () => {
      expect(seoServiceSource).toContain("mapPageRow")
      expect(seoServiceSource).toContain('row.robots_rule ?? "index, follow"')
      expect(seoServiceSource).toContain("row.indexable ?? true")
    })

    it("includes toPageDbRow function for camelCase-to-snake_case writes", () => {
      expect(seoServiceSource).toContain("toPageDbRow")
      expect(seoServiceSource).toContain("row.canonical_url = data.canonicalUrl")
      expect(seoServiceSource).toContain("row.og_title = data.ogTitle")
    })
  })
})
