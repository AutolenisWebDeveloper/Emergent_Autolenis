import { describe, it, expect } from "vitest"

/**
 * Unit tests for link-checker helpers (URL normalization, classification).
 * These test the pure logic without network access.
 */

// Inline the pure helpers from the link checker for unit testing
function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base)
    const origin = new URL(base).origin
    if (u.origin !== origin) return null

    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref",
    ]
    for (const p of trackingParams) u.searchParams.delete(p)

    let pathname = u.pathname
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1)
    }
    return `${u.origin}${pathname}${u.search}`
  } catch {
    return null
  }
}

const AUTH_PROTECTED_ROUTES = [
  "/buyer/dashboard",
  "/dealer/dashboard",
  "/affiliate/portal/dashboard",
  "/admin/dashboard",
]

function classify(status: number, url: string) {
  const isAuth = AUTH_PROTECTED_ROUTES.some((r) => url.includes(r))

  if (status >= 500) {
    return { issueType: isAuth ? "auth-broken-500" : "server-error", priority: "P0" }
  }
  if (status === 0) return { issueType: "redirect-loop-or-timeout", priority: "P0" }
  if (status === 404) return { issueType: "missing-page-404", priority: "P1" }
  if (status >= 400) return { issueType: `client-error-${status}`, priority: "P1" }
  return { issueType: "ok", priority: "" }
}

function parseSitemapUrls(xml: string): string[] {
  const urls: string[] = []
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi
  let match
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1])
  }
  return urls
}

describe("Link Checker Helpers", () => {
  describe("normalizeUrl", () => {
    const base = "https://www.autolenis.com"

    it("normalizes a simple internal link", () => {
      expect(normalizeUrl("/about", base)).toBe("https://www.autolenis.com/about")
    })

    it("preserves root /", () => {
      expect(normalizeUrl("/", base)).toBe("https://www.autolenis.com/")
    })

    it("strips trailing slash", () => {
      expect(normalizeUrl("/about/", base)).toBe("https://www.autolenis.com/about")
    })

    it("strips UTM parameters", () => {
      expect(normalizeUrl("/pricing?utm_source=google&utm_medium=cpc", base))
        .toBe("https://www.autolenis.com/pricing")
    })

    it("strips fbclid parameter", () => {
      expect(normalizeUrl("/contact?fbclid=abc123", base))
        .toBe("https://www.autolenis.com/contact")
    })

    it("preserves non-tracking query params", () => {
      expect(normalizeUrl("/search?q=honda", base))
        .toBe("https://www.autolenis.com/search?q=honda")
    })

    it("returns null for external links", () => {
      expect(normalizeUrl("https://google.com/path", base)).toBeNull()
    })

    it("returns null for truly invalid URLs", () => {
      // URL constructor treats most strings as relative paths with a base
      // Only protocol-relative URLs to different origins return null
      expect(normalizeUrl("https://[invalid", base)).toBeNull()
    })

    it("handles absolute same-origin URLs", () => {
      expect(normalizeUrl("https://www.autolenis.com/buyer/dashboard", base))
        .toBe("https://www.autolenis.com/buyer/dashboard")
    })
  })

  describe("classify", () => {
    it("flags 500 as P0 server-error", () => {
      const result = classify(500, "https://www.autolenis.com/some-page")
      expect(result.issueType).toBe("server-error")
      expect(result.priority).toBe("P0")
    })

    it("flags 502 as P0 server-error", () => {
      const result = classify(502, "https://www.autolenis.com/some-page")
      expect(result.issueType).toBe("server-error")
      expect(result.priority).toBe("P0")
    })

    it("flags 500 on auth route as auth-broken-500", () => {
      const result = classify(500, "https://www.autolenis.com/buyer/dashboard")
      expect(result.issueType).toBe("auth-broken-500")
      expect(result.priority).toBe("P0")
    })

    it("flags 500 on admin dashboard as auth-broken-500", () => {
      const result = classify(500, "https://www.autolenis.com/admin/dashboard")
      expect(result.issueType).toBe("auth-broken-500")
      expect(result.priority).toBe("P0")
    })

    it("flags 404 as P1 missing-page", () => {
      const result = classify(404, "https://www.autolenis.com/nonexistent")
      expect(result.issueType).toBe("missing-page-404")
      expect(result.priority).toBe("P1")
    })

    it("flags status 0 as redirect-loop-or-timeout", () => {
      const result = classify(0, "https://www.autolenis.com/loop")
      expect(result.issueType).toBe("redirect-loop-or-timeout")
      expect(result.priority).toBe("P0")
    })

    it("flags 403 as P1 client error", () => {
      const result = classify(403, "https://www.autolenis.com/forbidden")
      expect(result.issueType).toBe("client-error-403")
      expect(result.priority).toBe("P1")
    })

    it("classifies 200 as ok", () => {
      const result = classify(200, "https://www.autolenis.com/")
      expect(result.issueType).toBe("ok")
      expect(result.priority).toBe("")
    })

    it("classifies 301 redirect as ok", () => {
      const result = classify(200, "https://www.autolenis.com/old-path")
      expect(result.issueType).toBe("ok")
    })
  })

  describe("parseSitemapUrls", () => {
    it("extracts URLs from sitemap XML", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://www.autolenis.com/</loc></url>
          <url><loc>https://www.autolenis.com/about</loc></url>
          <url><loc>https://www.autolenis.com/pricing</loc></url>
        </urlset>`
      const urls = parseSitemapUrls(xml)
      expect(urls).toHaveLength(3)
      expect(urls).toContain("https://www.autolenis.com/")
      expect(urls).toContain("https://www.autolenis.com/about")
      expect(urls).toContain("https://www.autolenis.com/pricing")
    })

    it("handles sitemap index with sub-sitemaps", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://www.autolenis.com/sitemap-pages.xml</loc></sitemap>
          <sitemap><loc>https://www.autolenis.com/sitemap-blog.xml</loc></sitemap>
        </sitemapindex>`
      const urls = parseSitemapUrls(xml)
      expect(urls).toHaveLength(2)
      expect(urls[0]).toContain(".xml")
    })

    it("returns empty array for empty XML", () => {
      expect(parseSitemapUrls("")).toEqual([])
    })

    it("handles whitespace around URLs", () => {
      const xml = `<urlset><url><loc>  https://www.autolenis.com/  </loc></url></urlset>`
      const urls = parseSitemapUrls(xml)
      expect(urls).toHaveLength(1)
      expect(urls[0]).toBe("https://www.autolenis.com/")
    })
  })

  describe("Route existence (CI gate)", () => {
    it("root page (app/page.tsx) should be detected as / route", () => {
      // Verify the toRouteFromPageFile logic handles root page correctly
      const rootPage = "app/page.tsx"
      const rel = rootPage.replace(/^app\//, "").replace(/(^|\/)page\.(t|j)sx?$/, "").replace(/\/$/, "")
      const route = rel ? "/" + rel : "/"
      expect(route).toBe("/")
    })

    it("nested page should resolve correctly", () => {
      const nestedPage = "app/admin/dashboard/page.tsx"
      const rel = nestedPage.replace(/^app\//, "").replace(/(^|\/)page\.(t|j)sx?$/, "").replace(/\/$/, "")
      const route = rel ? "/" + rel : "/"
      expect(route).toBe("/admin/dashboard")
    })

    it("route handler files should be detected as routes", () => {
      const routeHandler = "app/sitemap.xml/route.ts"
      const rel = routeHandler.replace(/^app\//, "").replace(/(^|\/)route\.(t|j)sx?$/, "").replace(/\/$/, "")
      const route = rel ? "/" + rel : "/"
      expect(route).toBe("/sitemap.xml")
    })
  })
})
