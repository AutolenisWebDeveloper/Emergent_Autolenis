"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/dashboard/error-state"

export default function DealerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[DealerDashboard]", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <ErrorState
        title="Dashboard Error"
        message="Something went wrong loading this page. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
