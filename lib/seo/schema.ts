/**
 * JSON-LD structured data helpers.
 *
 * Generates schema.org JSON-LD for public pages.
 * Designed to never throw — returns empty object on missing data.
 */

import { getSiteUrl } from "@/lib/seo/site-url"

export function organizationSchema() {
  const siteUrl = getSiteUrl()

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AutoLenis",
    url: siteUrl,
    logo: `${siteUrl}/og-image.png`,
    description:
      "Get pre-qualified, compare dealer offers, and buy your next car with complete transparency. No hidden fees, no surprises.",
    sameAs: [],
  }
}

export function webSiteSchema() {
  const siteUrl = getSiteUrl()

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AutoLenis",
    url: siteUrl,
  }
}

export interface FAQItem {
  question: string
  answer: string
}

export function faqPageSchema(items: FAQItem[]) {
  if (!items || items.length === 0) return null

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  if (!items || items.length === 0) return null

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Renders one or more JSON-LD schemas as a <script> tag string.
 * Safe to embed in JSX via dangerouslySetInnerHTML.
 */
export function jsonLdScript(schemas: (Record<string, unknown> | null | undefined)[]) {
  const filtered = schemas.filter(Boolean)
  if (filtered.length === 0) return null
  return JSON.stringify(filtered.length === 1 ? filtered[0] : filtered)
}
