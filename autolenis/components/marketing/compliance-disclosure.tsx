"use client"

import { PLATFORM_DISCLOSURE } from "@/lib/content/faith-content"

interface ComplianceDisclosureProps {
  /** Override the default platform disclosure text if needed. */
  text?: string
}

/**
 * Standardized compliance / legal disclosure strip that appears
 * below the faith section (when configured) and above the footer.
 *
 * Visually secondary — small neutral type on a muted background —
 * to keep it distinct from marketing and faith content.
 */
export function ComplianceDisclosure({ text }: ComplianceDisclosureProps) {
  return (
    <section
      aria-label="Legal disclosure"
      className="py-6 bg-muted border-t border-border"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {text ?? PLATFORM_DISCLOSURE}
        </p>
      </div>
    </section>
  )
}
