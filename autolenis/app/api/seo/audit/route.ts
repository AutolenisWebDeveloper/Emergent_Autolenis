import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { publicPages } from "@/lib/seo/registry"
import { getSiteUrl } from "@/lib/seo/site-url"

// In-memory cache (survives within the same serverless invocation / cold start)
let cachedReport: AuditReport | null = null
let cacheTime = 0
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

// ---------- types ----------
interface PageAudit {
  path: string
  name: string
  title: string | null
  description: string | null
  canonical: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  twitterCard: string | null
  h1Count: number
  noindex: boolean
  imgTotal: number
  imgWithAlt: number
  internalLinks: number
  brokenLinks: string[]
  pass: boolean
  issues: string[]
}

interface AuditReport {
  generatedAt: string
  baseUrl: string
  pages: PageAudit[]
  summary: {
    total: number
    passing: number
    failing: number
    missingTitle: number
    missingDescription: number
    missingOgImage: number
    noindexPages: number
    brokenLinksTotal: number
  }
}

// ---------- GET: return cached (or empty if none) ----------
export async function GET() {
  try {
    await requireAuth(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (cachedReport && Date.now() - cacheTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedReport)
  }

  return NextResponse.json({ message: "No cached audit. POST to /api/seo/audit to run one." }, { status: 404 })
}

// ---------- POST: run audit ----------
export async function POST() {
  try {
    await requireAuth(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const report = await runAudit()
    cachedReport = report
    cacheTime = Date.now()
    return NextResponse.json(report)
  } catch (error) {
    console.error("[SEO Audit] Error:", error)
    return NextResponse.json({ error: "Audit failed" }, { status: 500 })
  }
}

// ---------- audit logic ----------
async function runAudit(): Promise<AuditReport> {
  const baseUrl = getSiteUrl()
  const pages: PageAudit[] = []

  for (const page of publicPages) {
    const url = `${baseUrl}${page.path}`
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AutoLenis-SEO-Audit/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        pages.push(emptyAudit(page.path, page.name, [`HTTP ${res.status}`]))
        continue
      }

      const html = await res.text()
      pages.push(auditHtml(page.path, page.name, html, baseUrl))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      pages.push(emptyAudit(page.path, page.name, [`Fetch error: ${msg}`]))
    }
  }

  const summary = {
    total: pages.length,
    passing: pages.filter((p) => p.pass).length,
    failing: pages.filter((p) => !p.pass).length,
    missingTitle: pages.filter((p) => !p.title).length,
    missingDescription: pages.filter((p) => !p.description).length,
    missingOgImage: pages.filter((p) => !p.ogImage).length,
    noindexPages: pages.filter((p) => p.noindex).length,
    brokenLinksTotal: pages.reduce((s, p) => s + p.brokenLinks.length, 0),
  }

  return { generatedAt: new Date().toISOString(), baseUrl, pages, summary }
}

// ---------- helpers ----------

function first(html: string, regex: RegExp): string | null {
  const m = regex.exec(html)
  return m?.[1]?.trim() ?? null
}

function auditHtml(path: string, name: string, html: string, baseUrl: string): PageAudit {
  const title = first(html, /<title[^>]*>([^<]+)<\/title>/i)
  const description = first(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const canonical = first(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? first(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
  const ogTitle = first(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  const ogDescription = first(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    ?? first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
  const ogImage = first(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  const twitterCard = first(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i)
    ?? first(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:card["']/i)

  const h1Matches = html.match(/<h1[\s>]/gi)
  const h1Count = h1Matches ? h1Matches.length : 0

  const noindex = /name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)

  // Image alt coverage
  const imgs = html.match(/<img\s[^>]*>/gi) || []
  const imgTotal = imgs.length
  const imgWithAlt = imgs.filter((tag) => /\balt=["'][^"']+["']/i.test(tag)).length

  // Internal links (limit to 50 per page)
  const linkRegex = /href=["']([^"'#]+)["']/gi
  const internalHrefs = new Set<string>()
  let match: RegExpExecArray | null
  let linkCount = 0
  while ((match = linkRegex.exec(html)) !== null && linkCount < 50) {
    const href = match?.[1]
    if (href && (href.startsWith("/") || href.startsWith(baseUrl))) {
      internalHrefs.add(href.startsWith("/") ? href : href.replace(baseUrl, ""))
      linkCount++
    }
  }

  const issues: string[] = []
  if (!title) issues.push("Missing <title>")
  if (!description) issues.push("Missing meta description")
  if (!canonical) issues.push("Missing canonical URL")
  if (!ogTitle) issues.push("Missing og:title")
  if (!ogDescription) issues.push("Missing og:description")
  if (!ogImage) issues.push("Missing og:image")
  if (!twitterCard) issues.push("Missing twitter:card")
  if (h1Count === 0) issues.push("No <h1> tag found")
  if (h1Count > 1) issues.push(`Multiple <h1> tags (${h1Count})`)
  if (noindex) issues.push("Page is noindex")
  if (imgTotal > 0 && imgWithAlt < imgTotal) issues.push(`${imgTotal - imgWithAlt} images missing alt text`)

  return {
    path,
    name,
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    h1Count,
    noindex,
    imgTotal,
    imgWithAlt,
    internalLinks: internalHrefs.size,
    brokenLinks: [], // broken link checking is deferred to avoid long audit times
    pass: issues.length === 0,
    issues,
  }
}

function emptyAudit(path: string, name: string, issues: string[]): PageAudit {
  return {
    path,
    name,
    title: null,
    description: null,
    canonical: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    h1Count: 0,
    noindex: false,
    imgTotal: 0,
    imgWithAlt: 0,
    internalLinks: 0,
    brokenLinks: [],
    pass: false,
    issues,
  }
}
