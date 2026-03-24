"use client"

/**
 * ChatHeader — role-aware header for the concierge panel.
 *
 * Displays:
 *   - Lenis Concierge™ branding
 *   - Current user role badge
 *   - LIVE / TEST workspace badge
 *   - Clear history button
 *
 * Meets WCAG 2.2 AA: all interactive elements have labels,
 * sufficient contrast, and focus-visible rings.
 */

import type { AIRole } from "@/lib/ai/context-builder"

interface ChatHeaderProps {
  role: AIRole
  workspaceMode: "LIVE" | "TEST"
  onClearHistory: () => void
}

const ROLE_LABELS: Record<AIRole, string> = {
  public: "Guest",
  buyer: "Buyer",
  dealer: "Dealer",
  affiliate: "Affiliate",
  admin: "Admin",
}

export function ChatHeader({ role, workspaceMode, onClearHistory }: ChatHeaderProps) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4 border-b border-white/10"
      style={{
        background: "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)",
      }}
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      </div>

      {/* Title + subtitle */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-semibold text-white leading-tight truncate">
          Lenis Concierge
        </span>
        <span className="text-[11px] text-white/70 leading-tight">
          AI-Powered Assistant
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Role badge */}
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90 uppercase tracking-wider">
          {ROLE_LABELS[role]}
        </span>

        {/* Workspace badge */}
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            workspaceMode === "TEST"
              ? "bg-amber-400/20 text-amber-200"
              : "bg-green-400/20 text-green-200"
          }`}
        >
          {workspaceMode}
        </span>
      </div>

      {/* Clear history */}
      <button
        type="button"
        onClick={onClearHistory}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Clear conversation history"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
          />
        </svg>
      </button>
    </div>
  )
}
