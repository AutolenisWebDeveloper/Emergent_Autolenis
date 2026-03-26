"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function IBVPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("id")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!applicationId) return

    let attempts = 0
    const maxAttempts = 60 // 5 minutes at 5s intervals

    const interval = setInterval(async () => {
      attempts++
      try {
        const response = await fetch("/api/prequal/ibv/report")
        const data = await response.json()

        if (data.success && data.complete) {
          clearInterval(interval)
          await fetch("/api/prequal/finalize", { method: "POST" })
          router.push(`/prequal/result?id=${applicationId}`)
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          await fetch("/api/prequal/finalize", { method: "POST" })
          router.push(`/prequal/result?id=${applicationId}`)
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          router.push(`/prequal/result?id=${applicationId}`)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [applicationId, router])

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-6" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Completing Bank Verification</h2>
      <p className="text-gray-500 text-sm">
        Please complete the bank verification in the window that opened. This page will
        automatically advance when verification is complete.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}
