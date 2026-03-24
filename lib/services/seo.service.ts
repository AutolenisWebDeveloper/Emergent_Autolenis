import { createAdminClient } from "@/lib/supabase/admin"
import { getSiteUrl } from "@/lib/seo/site-url"
import { publicPages } from "@/lib/seo/registry"

export interface SEOPageData {
  id: string
  pageKey: string
  title: string | null
  description: string | null
  keywords: string | null
  canonicalUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImageUrl: string | null
  robotsRule: string
  indexable: boolean
  updatedAt: Date
}

export interface SEOSchema {
  id: string
  pageKey: string
  schemaType: string
  schemaJson: Record<string, any>
}

export interface SEOHealth {
  pageKey: string
  score: number
  issues: Array<{ type: string; message: string; severity: string }>
  lastScanAt: Date
}

export interface SEOKeywords {
  pageKey: string
  primaryKeyword: string | null
  secondaryKeywords: string[]
  targetDensity: number
  actualDensity: number
}

// ---------------------------------------------------------------------------
// Column mapping helpers: canonical DB uses snake_case, TypeScript uses camelCase
// ---------------------------------------------------------------------------

function mapPageRow(row: Record<string, any>): SEOPageData {
  return {
    id: row.id,
    pageKey: row.page_key,
    title: row.title,
    description: row.description,
    keywords: row.keywords,
    canonicalUrl: row.canonical_url,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    ogImageUrl: row.og_image_url,
    robotsRule: row.robots_rule ?? "index, follow",
    indexable: row.indexable ?? true,
    updatedAt: row.updated_at,
  }
}

function toPageDbRow(data: Partial<SEOPageData>): Record<string, any> {
  const row: Record<string, any> = {}
  if (data.title !== undefined) row.title = data.title
  if (data.description !== undefined) row.description = data.description
  if (data.keywords !== undefined) row.keywords = data.keywords
  if (data.canonicalUrl !== undefined) row.canonical_url = data.canonicalUrl
  if (data.ogTitle !== undefined) row.og_title = data.ogTitle
  if (data.ogDescription !== undefined) row.og_description = data.ogDescription
  if (data.ogImageUrl !== undefined) row.og_image_url = data.ogImageUrl
  if (data.robotsRule !== undefined) row.robots_rule = data.robotsRule
  if (data.indexable !== undefined) row.indexable = data.indexable
  return row
}

function mapSchemaRow(row: Record<string, any>): SEOSchema {
  return {
    id: row.id,
    pageKey: row.page_key,
    schemaType: row.schema_type,
    schemaJson: row.schema_json,
  }
}

function mapHealthRow(row: Record<string, any>): SEOHealth {
  return {
    pageKey: row.page_key,
    score: row.score,
    issues: row.issues_json as any,
    lastScanAt: new Date(row.last_scan_at),
  }
}

function mapKeywordsRow(row: Record<string, any>): SEOKeywords {
  return {
    pageKey: row.page_key,
    primaryKeyword: row.primary_keyword,
    secondaryKeywords: (row.secondary_keywords as string[]) || [],
    targetDensity: Number(row.target_density),
    actualDensity: Number(row.actual_density),
  }
}

export class SEOService {
  /**
   * Returns a Supabase admin client, or null when env vars are missing
   * (e.g. during Vercel build without DB access).
   */
  private getSupabase() {
    try {
      return createAdminClient()
    } catch {
      return null
    }
  }

  // Get SEO metadata for a page
  async getPageSEO(pageKey: string): Promise<SEOPageData | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null
    const { data, error } = await supabase
      .from("seo_pages")
      .select(
        "id, page_key, title, description, keywords, canonical_url, og_title, og_description, og_image_url, robots_rule, indexable, updated_at",
      )
      .eq("page_key", pageKey)
      .maybeSingle()

    if (error) {
      console.error("[SEO] Error fetching page SEO:", error)
      return null
    }
    return data ? mapPageRow(data) : null
  }

  // Update SEO metadata for a page
  async updatePageSEO(pageKey: string, data: Partial<SEOPageData>): Promise<SEOPageData | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null

    const { data: existing } = await supabase
      .from("seo_pages")
      .select("id")
      .eq("page_key", pageKey)
      .maybeSingle()

    const dbRow = toPageDbRow(data)

    if (existing) {
      const { data: updated, error } = await supabase
        .from("seo_pages")
        .update({ ...dbRow, updated_at: new Date().toISOString() })
        .eq("page_key", pageKey)
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error updating page SEO:", error)
        return null
      }
      return mapPageRow(updated)
    } else {
      const { data: created, error } = await supabase
        .from("seo_pages")
        .insert({ page_key: pageKey, ...dbRow })
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error creating page SEO:", error)
        return null
      }
      return mapPageRow(created)
    }
  }

  // Get all SEO pages
  async getAllPages(): Promise<SEOPageData[]> {
    const supabase = this.getSupabase()
    if (!supabase) return []
    const { data, error } = await supabase
      .from("seo_pages")
      .select(
        "id, page_key, title, description, keywords, canonical_url, og_title, og_description, og_image_url, robots_rule, indexable, updated_at",
      )
      .order("page_key", { ascending: true })

    if (error) {
      console.error("[SEO] Error fetching all pages:", error)
      return []
    }
    return (data || []).map(mapPageRow)
  }

  // Get schema for a page
  async getPageSchema(pageKey: string): Promise<SEOSchema[]> {
    const supabase = this.getSupabase()
    if (!supabase) return []
    const { data, error } = await supabase
      .from("seo_schema")
      .select("id, page_key, schema_type, schema_json")
      .eq("page_key", pageKey)

    if (error) {
      console.error("[SEO] Error fetching page schema:", error)
      return []
    }
    return (data || []).map(mapSchemaRow)
  }

  // Update schema for a page
  async updatePageSchema(
    pageKey: string,
    schemaType: string,
    schemaJson: Record<string, any>,
  ): Promise<SEOSchema | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null

    const { data: existing } = await supabase
      .from("seo_schema")
      .select("id")
      .eq("page_key", pageKey)
      .eq("schema_type", schemaType)
      .maybeSingle()

    if (existing) {
      const { data: updated, error } = await supabase
        .from("seo_schema")
        .update({ schema_json: schemaJson, updated_at: new Date().toISOString() })
        .eq("page_key", pageKey)
        .eq("schema_type", schemaType)
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error updating page schema:", error)
        return null
      }
      return mapSchemaRow(updated)
    } else {
      const { data: created, error } = await supabase
        .from("seo_schema")
        .insert({ page_key: pageKey, schema_type: schemaType, schema_json: schemaJson })
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error creating page schema:", error)
        return null
      }
      return mapSchemaRow(created)
    }
  }

  // Delete schema
  async deletePageSchema(id: string): Promise<void> {
    const supabase = this.getSupabase()
    if (!supabase) return
    const { error } = await supabase.from("seo_schema").delete().eq("id", id)

    if (error) {
      console.error("[SEO] Error deleting page schema:", error)
    }
  }

  // Get SEO health score
  async getPageHealth(pageKey: string): Promise<SEOHealth | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null
    const { data, error } = await supabase
      .from("seo_health")
      .select("page_key, score, issues_json, last_scan_at")
      .eq("page_key", pageKey)
      .maybeSingle()

    if (error) {
      console.error("[SEO] Error fetching page health:", error)
      return null
    }

    return data ? mapHealthRow(data) : null
  }

  // Calculate and update SEO health score
  async calculateHealthScore(pageKey: string, _pageContent?: string): Promise<SEOHealth | null> {
    const seoData = await this.getPageSEO(pageKey)
    const keywords = await this.getPageKeywords(pageKey)

    const issues: Array<{ type: string; message: string; severity: string }> = []
    let score = 100

    // Check title
    if (!seoData?.title) {
      issues.push({ type: "title", message: "Missing title tag", severity: "critical" })
      score -= 15
    } else if (seoData.title.length < 30 || seoData.title.length > 60) {
      issues.push({ type: "title", message: "Title length should be 30-60 characters", severity: "warning" })
      score -= 5
    }

    // Check description
    if (!seoData?.description) {
      issues.push({ type: "description", message: "Missing meta description", severity: "critical" })
      score -= 15
    } else if (seoData.description.length < 120 || seoData.description.length > 160) {
      issues.push({
        type: "description",
        message: "Description length should be 120-160 characters",
        severity: "warning",
      })
      score -= 5
    }

    // Check keywords
    if (!keywords?.primaryKeyword) {
      issues.push({ type: "keywords", message: "No primary keyword defined", severity: "warning" })
      score -= 10
    }

    // Check OG tags
    if (!seoData?.ogTitle) {
      issues.push({ type: "og", message: "Missing Open Graph title", severity: "warning" })
      score -= 5
    }
    if (!seoData?.ogDescription) {
      issues.push({ type: "og", message: "Missing Open Graph description", severity: "warning" })
      score -= 5
    }
    if (!seoData?.ogImageUrl) {
      issues.push({ type: "og", message: "Missing Open Graph image", severity: "warning" })
      score -= 5
    }

    // Check canonical URL
    if (!seoData?.canonicalUrl) {
      issues.push({ type: "canonical", message: "Missing canonical URL", severity: "warning" })
      score -= 5
    }

    // Update health record
    const supabase = this.getSupabase()
    if (!supabase) {
      return {
        pageKey,
        score: Math.max(0, score),
        issues,
        lastScanAt: new Date(),
      }
    }
    const healthData = {
      score: Math.max(0, score),
      issues_json: issues,
      last_scan_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from("seo_health")
      .select("id")
      .eq("page_key", pageKey)
      .maybeSingle()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from("seo_health")
        .update(healthData)
        .eq("page_key", pageKey)
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error updating health score:", error)
        return null
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from("seo_health")
        .insert({ page_key: pageKey, ...healthData })
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error creating health score:", error)
        return null
      }
      result = data
    }

    return mapHealthRow(result)
  }

  // Get keywords for a page
  async getPageKeywords(pageKey: string): Promise<SEOKeywords | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null
    const { data, error } = await supabase
      .from("seo_keywords")
      .select("page_key, primary_keyword, secondary_keywords, target_density, actual_density")
      .eq("page_key", pageKey)
      .maybeSingle()

    if (error) {
      console.error("[SEO] Error fetching page keywords:", error)
      return null
    }

    return data ? mapKeywordsRow(data) : null
  }

  // Update keywords for a page
  async updatePageKeywords(pageKey: string, data: Partial<SEOKeywords>): Promise<SEOKeywords | null> {
    const supabase = this.getSupabase()
    if (!supabase) return null

    const { data: existing } = await supabase
      .from("seo_keywords")
      .select("id")
      .eq("page_key", pageKey)
      .maybeSingle()

    const dbRow: Record<string, any> = {}
    if (data.primaryKeyword !== undefined) dbRow.primary_keyword = data.primaryKeyword
    if (data.secondaryKeywords !== undefined) dbRow.secondary_keywords = data.secondaryKeywords
    if (data.targetDensity !== undefined) dbRow.target_density = data.targetDensity
    if (data.actualDensity !== undefined) dbRow.actual_density = data.actualDensity

    let result
    if (existing) {
      const { data: updated, error } = await supabase
        .from("seo_keywords")
        .update({ ...dbRow, updated_at: new Date().toISOString() })
        .eq("page_key", pageKey)
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error updating page keywords:", error)
        return null
      }
      result = updated
    } else {
      const { data: created, error } = await supabase
        .from("seo_keywords")
        .insert({ page_key: pageKey, ...dbRow })
        .select()
        .single()

      if (error) {
        console.error("[SEO] Error creating page keywords:", error)
        return null
      }
      result = created
    }

    return mapKeywordsRow(result)
  }

  // Get SEO dashboard summary
  async getDashboardSummary() {
    const pages = await this.getAllPages()

    const supabase = this.getSupabase()
    let records: Array<{ page_key: string; score: number; issues_json: any; last_scan_at: string }> = []

    if (supabase) {
      const { data: healthRecords, error } = await supabase
        .from("seo_health")
        .select("page_key, score, issues_json, last_scan_at")

      if (error) {
        console.error("[SEO] Error fetching health records:", error)
      }
      records = healthRecords || []
    }

    const totalPages = pages.length
    const indexablePages = pages.filter((p) => p.indexable).length
    const avgScore = records.length > 0 ? records.reduce((sum, h) => sum + h.score, 0) / records.length : 0

    const criticalIssues = records.reduce((count, h) => {
      const issues = (h.issues_json as any[]) || []
      return count + issues.filter((i) => i.severity === "critical").length
    }, 0)

    return {
      totalPages,
      indexablePages,
      avgScore: Math.round(avgScore),
      criticalIssues,
      pages: records.map((h) => ({
        pageKey: h.page_key,
        score: h.score,
        lastScanAt: h.last_scan_at,
      })),
    }
  }

  /** Build the static fallback sitemap from the page registry */
  private getFallbackSitemap() {
    const baseUrl = getSiteUrl()
    const today = new Date().toISOString().split("T")[0]

    return publicPages.map((p) => ({
      loc: `${baseUrl}${p.path === "/" ? "" : p.path}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
    }))
  }

  // Generate sitemap data
  async generateSitemap() {
    const baseUrl = getSiteUrl()

    try {
      const supabase = this.getSupabase()
      if (!supabase) {
        console.warn("[SEO] Supabase client unavailable — returning static fallback sitemap")
        return this.getFallbackSitemap()
      }

      const { data: pages, error } = await supabase
        .from("seo_pages")
        .select("page_key, canonical_url, updated_at")
        .eq("indexable", true)

      if (error) {
        console.warn("[SEO] DB query failed during sitemap generation — using fallback:", error.message)
        return this.getFallbackSitemap()
      }

      if (!pages || pages.length === 0) {
        return this.getFallbackSitemap()
      }

      return pages.map((page) => ({
        loc: page.canonical_url || `${baseUrl}/${page.page_key === "home" ? "" : page.page_key}`,
        lastmod: new Date(page.updated_at).toISOString().split("T")[0],
        changefreq: "weekly",
        priority: page.page_key === "home" ? "1.0" : "0.8",
      }))
    } catch (err) {
      console.warn("[SEO] Unexpected error generating sitemap — using fallback:", err)
      return this.getFallbackSitemap()
    }
  }

  // Generate robots.txt rules
  generateRobotsTxt() {
    const baseUrl = getSiteUrl()

    const rules = [
      "User-agent: *",
      "Allow: /",
      "",
      "# Disallow admin and authenticated areas",
      "Disallow: /admin/",
      "Disallow: /buyer/",
      "Disallow: /dealer/",
      "Disallow: /affiliate/portal/",
      "Disallow: /api/",
      "",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ]

    return rules.join("\n")
  }
}

export const seoService = new SEOService()

export { SEOService as default }
export const SEOServiceInstance = seoService
