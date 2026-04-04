"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/dashboard/error-state"

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[BuyerRequests]", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <ErrorState
        title="Requests Error"
        message="Something went wrong loading your vehicle requests. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
