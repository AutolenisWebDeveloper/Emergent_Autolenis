"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IBVInterstitial } from "@/components/prequal/IBVInterstitial"

export default function IBVIntroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("id")
  const [isLoading, setIsLoading] = useState(false)

  const handleSkip = async () => {
    try {
      await fetch("/api/prequal/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // ignore
    }
    router.push(`/prequal/result?id=${applicationId}`)
  }

  const handleContinue = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/prequal/ibv/create-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (data.success && data.formUrl) {
        router.push(`/prequal/ibv?id=${applicationId}&session=${data.sessionId}`)
      } else {
        await handleSkip()
      }
    } catch {
      await handleSkip()
    }
  }

  return (
    <IBVInterstitial
      onContinue={handleContinue}
      onSkip={handleSkip}
      isLoading={isLoading}
    />
  )
}
