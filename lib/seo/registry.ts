/**
 * SEO Page Registry — single source of truth for public marketing pages.
 *
 * Used by:
 *  - Sitemap generation (fallback when DB is unavailable)
 *  - SEO audit engine (pages to scan)
 *  - Metadata helpers
 */

export interface PublicPage {
  path: string
  name: string
  priority: string
  changefreq: string
}

/**
 * All public marketing pages that should appear in the sitemap.
 * Keep this list in sync with actual routes under app/.
 */
export const publicPages: PublicPage[] = [
  { path: "/", name: "Home", priority: "1.0", changefreq: "weekly" },
  { path: "/about", name: "About", priority: "0.8", changefreq: "monthly" },
  { path: "/pricing", name: "Pricing", priority: "0.9", changefreq: "monthly" },
  { path: "/contact", name: "Contact", priority: "0.7", changefreq: "monthly" },
  { path: "/how-it-works", name: "How It Works", priority: "0.9", changefreq: "monthly" },
  { path: "/faq", name: "FAQ", priority: "0.8", changefreq: "monthly" },
  { path: "/insurance", name: "Insurance", priority: "0.7", changefreq: "monthly" },
  { path: "/refinance", name: "Refinance", priority: "0.7", changefreq: "monthly" },
  { path: "/contract-shield", name: "Contract Shield", priority: "0.7", changefreq: "monthly" },
  { path: "/privacy", name: "Privacy Policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", name: "Terms of Service", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/privacy", name: "Legal Privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/terms", name: "Legal Terms", priority: "0.3", changefreq: "yearly" },
  { path: "/dealer-application", name: "Dealer Application", priority: "0.6", changefreq: "monthly" },
  { path: "/feedback", name: "Feedback", priority: "0.4", changefreq: "monthly" },
]
