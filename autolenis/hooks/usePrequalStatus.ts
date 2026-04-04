"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ApplicationStatus, FinalStatus } from "@/lib/types/prequal"

interface PrequalStatus {
  applicationId: string
  status: ApplicationStatus
  finalStatus?: FinalStatus
  shoppingRangeMinCents?: number
  shoppingRangeMaxCents?: number
  ibvFormUrl?: string
  expiresAt?: string
  loading: boolean
  error: string | null
}

const POLL_INTERVAL_MS = 3000

export function usePrequalStatus(applicationId: string | null) {
  const [status, setStatus] = useState<PrequalStatus | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/prequal/status/${id}`, {
        cache: "no-store",
      })
      if (!response.ok) return

      const data = await response.json()
      if (data.success) {
        setStatus({
          applicationId: data.applicationId,
          status: data.status,
          finalStatus: data.finalStatus,
          shoppingRangeMinCents: data.shoppingRangeMinCents,
          shoppingRangeMaxCents: data.shoppingRangeMaxCents,
          ibvFormUrl: data.ibvFormUrl,
          expiresAt: data.expiresAt,
          loading: false,
          error: null,
        })
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [])

  useEffect(() => {
    if (!applicationId) return

    // Initial fetch
    setStatus((prev) =>
      prev
        ? { ...prev, loading: true }
        : { applicationId, status: "INTAKE_IN_PROGRESS", loading: true, error: null }
    )
    fetchStatus(applicationId)

    // Start polling
    intervalRef.current = setInterval(() => fetchStatus(applicationId), POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [applicationId, fetchStatus])

  // Stop polling when terminal state is reached
  useEffect(() => {
    const terminalStatuses: ApplicationStatus[] = [
      "PREQUALIFIED",
      "PREQUALIFIED_CONDITIONAL",
      "MANUAL_REVIEW",
      "NOT_PREQUALIFIED",
      "EXPIRED",
      "STALE",
      "SYSTEM_ERROR",
    ]
    if (status?.status && terminalStatuses.includes(status.status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status?.status])

  return status
}
