/**
 * Shared metadata helper for Next.js generateMetadata.
 *
 * Uses the site URL resolver and provides sensible defaults
 * with a title template matching app/layout.tsx.
 */

import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/seo/site-url"

interface PageMetadataOptions {
  title: string
  description: string
  path?: string
  ogImage?: string
  noindex?: boolean
}

export function buildPageMetadata(opts: PageMetadataOptions): Metadata {
  const siteUrl = getSiteUrl()
  const canonical = opts.path ? `${siteUrl}${opts.path}` : siteUrl
  const ogImage = opts.ogImage || `${siteUrl}/og-image.png`

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [ogImage],
    },
    ...(opts.noindex
      ? { robots: { index: false, follow: false } }
      : {}),
  }
}
