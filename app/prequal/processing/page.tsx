"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePrequalStatus } from "@/hooks/usePrequalStatus"
import { ProcessingScreen } from "@/components/prequal/ProcessingScreen"

function PrequalProcessingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("id")
  const status = usePrequalStatus(applicationId)

  useEffect(() => {
    if (!status) return

    switch (status.status) {
      case "PREQUALIFIED":
      case "PREQUALIFIED_CONDITIONAL":
      case "MANUAL_REVIEW":
      case "NOT_PREQUALIFIED":
        router.push(`/prequal/result?id=${status.applicationId}`)
        break
      case "IBV_PENDING":
        router.push(`/prequal/ibv-intro?id=${status.applicationId}`)
        break
      case "SYSTEM_ERROR":
        router.push(`/prequal/result?id=${status.applicationId}`)
        break
      default:
        break
    }
  }, [status?.status, status?.applicationId, router])

  // Trigger iPredict processing
  useEffect(() => {
    if (!applicationId) return

    const triggerIpredict = async () => {
      try {
        await fetch("/api/prequal/ipredict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      } catch {
        // Errors handled by status polling
      }
    }

    triggerIpredict()
  }, [applicationId])

  const stepMap: Record<string, number> = {
    INTAKE_IN_PROGRESS: 1,
    CONSENT_CAPTURED: 1,
    IPREDICT_PENDING: 2,
    IPREDICT_COMPLETED: 3,
    IBV_PENDING: 2,
    IBV_COMPLETED: 3,
    DECISION_PENDING: 4,
  }

  const currentStep = status ? (stepMap[status.status] ?? 1) : 1

  return <ProcessingScreen currentStep={currentStep} />
}

export default function PrequalProcessingPage() {
  return (
    <Suspense fallback={null}>
      <PrequalProcessingPageContent />
    </Suspense>
  )
}
