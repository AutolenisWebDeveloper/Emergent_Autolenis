"use client"

/**
 * StatusStrip — horizontal lifecycle progress indicator.
 *
 * Shows the buyer's position in the 13-system flow:
 *   Prequal → Auction → Payments → Insurance → Contract → E-Sign → Pickup
 *
 * Each step is rendered as a compact pill with completed/active/upcoming state.
 * Non-buyer roles do not render this component.
 *
 * Accessibility: uses role="list" with meaningful step labels.
 */

import type { StatusStripStep } from "@/lib/ai/next-step-resolver"

interface StatusStripProps {
  steps: StatusStripStep[]
}

export function StatusStrip({ steps }: StatusStripProps) {
  if (steps.length === 0) return null

  return (
    <div className="border-b border-border bg-background px-3 py-2.5">
      <nav aria-label="Deal progress">
        <ol className="flex items-center gap-1 overflow-x-auto" role="list">
          {steps.map((step, idx) => (
            <li key={step.key} className="flex items-center gap-1 shrink-0">
              {idx > 0 && (
                <div
                  className={`h-px w-2 ${
                    step.status === "completed" || step.status === "active"
                      ? "bg-brand-purple/40"
                      : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  step.status === "completed"
                    ? "bg-brand-purple/10 text-brand-purple"
                    : step.status === "active"
                      ? "bg-brand-purple text-white shadow-sm"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={step.status === "active" ? "step" : undefined}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
