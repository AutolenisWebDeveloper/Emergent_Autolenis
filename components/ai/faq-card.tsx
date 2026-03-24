"use client"

/**
 * FAQ Card – renders a single FAQ answer with a state-aware CTA button.
 *
 * Used inside the Lenis Concierge chat widget to display structured
 * FAQ responses with:
 *  - Answer text (2–6 lines)
 *  - One primary CTA button
 *  - Optional disclosure
 *
 * No tool calls are triggered unless the user clicks the CTA.
 */

import * as React from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { FAQCardData } from "@/lib/ai/faq/types"

// ---------------------------------------------------------------------------
// Category display config
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  VALUE: "AutoLenis",
  FEES: "Fees & Pricing",
  FLOW: "Process",
  OFFERS: "Offers & Auction",
  CONTRACT_SHIELD: "Contract Shield",
  CLOSE: "Closing & Delivery",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FAQCardProps {
  data: FAQCardData
  onCTAClick?: (data: FAQCardData) => void
}

export function FAQCard({ data, onCTAClick }: FAQCardProps) {
  const categoryLabel = CATEGORY_LABELS[data.category] ?? data.category

  return (
    <Card className="max-w-md border-brand-purple/20">
      {/* Category badge */}
      <div className="px-6 pt-2">
        <span className="inline-block text-xs font-medium text-brand-purple/70 uppercase tracking-wide">
          {categoryLabel}
        </span>
      </div>

      {/* Answer */}
      <CardContent className="pt-1">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {data.answerMarkdown}
        </p>
      </CardContent>

      {/* CTA + Disclosure */}
      <CardFooter className="flex flex-col items-stretch gap-3">
        <button
          type="button"
          disabled={!data.cta.isEnabled}
          onClick={() => onCTAClick?.(data)}
          className="w-full rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={data.cta.disabledReason ?? undefined}
        >
          {data.cta.label}
        </button>

        {data.disclosure && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            ⚠️ {data.disclosure}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
