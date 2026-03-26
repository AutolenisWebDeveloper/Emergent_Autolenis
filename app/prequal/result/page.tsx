"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ResultPrequalified } from "@/components/prequal/ResultPrequalified"
import { ResultConditional } from "@/components/prequal/ResultConditional"
import { ResultManualReview } from "@/components/prequal/ResultManualReview"
import { ResultNotPrequalified } from "@/components/prequal/ResultNotPrequalified"
import type { FinalStatus } from "@/lib/types/prequal"

interface ApplicationStatus {
  finalStatus?: FinalStatus
  shoppingRangeMinCents?: number
  shoppingRangeMaxCents?: number
  expiresAt?: string
  status: string
}

export default function PrequalResultPage() {
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("id")
  const [data, setData] = useState<ApplicationStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!applicationId) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/prequal/status/${applicationId}`)
        const result = await response.json()
        if (result.success) {
          setData(result)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [applicationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Unable to load your application result. Please try again.</p>
      </div>
    )
  }

  const finalStatus = data.finalStatus ?? (data.status as FinalStatus)

  switch (finalStatus) {
    case "PREQUALIFIED":
      return (
        <ResultPrequalified
          shoppingRangeMinCents={data.shoppingRangeMinCents ?? 0}
          shoppingRangeMaxCents={data.shoppingRangeMaxCents ?? 0}
          expiresAt={
            data.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        />
      )
    case "PREQUALIFIED_CONDITIONAL":
      return (
        <ResultConditional
          shoppingRangeMinCents={data.shoppingRangeMinCents ?? 0}
          shoppingRangeMaxCents={data.shoppingRangeMaxCents ?? 0}
          expiresAt={
            data.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        />
      )
    case "MANUAL_REVIEW":
      return <ResultManualReview />
    case "NOT_PREQUALIFIED":
      return <ResultNotPrequalified />
    default:
      return <ResultManualReview />
  }
}
