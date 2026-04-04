"use client"

import { FaithSection } from "@/components/marketing/faith-section"
import { ComplianceDisclosure } from "@/components/marketing/compliance-disclosure"
import { getFaithContent } from "@/lib/content/faith-content"

interface PageFaithBlockProps {
  /** Route path used to look up content (e.g. "/pricing"). */
  pathname: string
}

/**
 * Convenience wrapper that renders the faith section and, when
 * configured, the compliance disclosure for a given route.
 *
 * Drop this in between the last CTA and `<PublicFooter />`:
 *
 * ```tsx
 * <PageFaithBlock pathname="/pricing" />
 * <PublicFooter />
 * ```
 */
export function PageFaithBlock({ pathname }: PageFaithBlockProps) {
  const content = getFaithContent(pathname)
  return (
    <>
      <FaithSection content={content} />
      {content.showDisclosure && <ComplianceDisclosure />}
    </>
  )
}
