"use client"

import { FadeIn } from "@/components/ui/motion"
import type { FaithEntry } from "@/lib/content/faith-content"

interface FaithSectionProps {
  content: FaithEntry
}

/**
 * Reusable "Faith & Encouragement" section rendered between the final
 * page CTA and the compliance / footer area on all public-facing pages.
 *
 * Accepts a `FaithEntry` content object so each page shows a unique,
 * theme-appropriate Bible verse and encouragement copy.
 */
export function FaithSection({ content }: FaithSectionProps) {
  return (
    <section
      aria-label="Faith and encouragement"
      className="relative py-16 sm:py-20 md:py-24 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--hero-start) 0%, var(--hero-end) 100%)",
      }}
    >
      {/* Subtle decorative accent */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse, var(--brand-purple) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[920px] px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          {/* Kicker */}
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {content.kicker}
          </p>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground text-balance mb-6">
            {content.headline}
          </h2>

          {/* Body */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            {content.body}
          </p>

          {/* Verse block */}
          <blockquote className="relative mx-auto max-w-2xl mb-8">
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
              style={{ background: "var(--brand-purple)" }}
            />
            <p className="italic text-lg sm:text-xl text-foreground/90 leading-relaxed pt-4">
              &ldquo;{content.verse}&rdquo;
            </p>
            <footer className="mt-3">
              <cite className="not-italic text-sm font-semibold tracking-wide text-muted-foreground">
                &mdash; {content.reference}
              </cite>
            </footer>
          </blockquote>

          {/* Closing */}
          <p className="text-sm font-medium text-foreground/80">
            {content.closing}
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
