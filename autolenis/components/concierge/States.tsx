"use client"

/**
 * EmptyState — shown when the concierge has no messages.
 * LoadingState — skeleton pulse while context is loading.
 * ErrorState — retry-capable error display.
 *
 * Each state is designed to match the AutoLenis fintech design system
 * with restrained brand-purple accents and professional typography.
 */

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  role: string
}

export function EmptyState({ role }: EmptyStateProps) {
  const greeting =
    role === "buyer"
      ? "I can help with pre-qualification, vehicle requests, auction tracking, contract review, and more."
      : role === "dealer"
        ? "I can help you review buyer requests, submit offers, upload documents, and track deal progress."
        : role === "affiliate"
          ? "I can generate referral links, track commissions, check payout status, and review attribution."
          : role === "admin"
            ? "Available: user search, report generation, payout reconciliation, platform analytics."
            : "I'm here to guide you through every step of car buying — from finding your vehicle to completing your purchase."

  return (
    <div className="flex flex-col gap-3 px-1">
      <div className="rounded-xl bg-background border border-border p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-purple) 0%, var(--brand-blue) 100%)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
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
          <span className="text-sm font-semibold text-foreground">
            Welcome to AutoLenis
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {greeting}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LoadingState
// ---------------------------------------------------------------------------

export function LoadingState() {
  return (
    <div className="flex flex-col gap-3 px-1 animate-pulse" role="status" aria-label="Loading">
      <div className="rounded-xl bg-background border border-border p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      </div>
      <div className="h-10 w-full rounded-xl bg-muted" />
      <div className="h-10 w-full rounded-xl bg-muted" />
      <span className="sr-only">Loading concierge context…</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center" role="alert">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground max-w-[240px]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-1"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
