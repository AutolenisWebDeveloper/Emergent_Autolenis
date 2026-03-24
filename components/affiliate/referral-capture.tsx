"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

const REFERRAL_STORAGE_KEY = "affiliate_referral"
const REFERRAL_CODE_KEY = "ref_code"
const REFERRAL_TIMESTAMP_KEY = "ref_code_timestamp"
export const REFERRAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export interface ReferralAttribution {
  refCode?: string
  affiliateId?: string
  firstTouchUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  capturedAt?: string
}

export function ReferralCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === "undefined") return

    const ref = searchParams.get("ref") || searchParams.get("affiliate")
    const affiliateId = searchParams.get("aid")

    if (!ref && !affiliateId) return

    const existing = localStorage.getItem(REFERRAL_STORAGE_KEY)
    if (existing) {
      try {
        const parsed: ReferralAttribution = JSON.parse(existing)
        if (parsed.capturedAt && Date.now() - new Date(parsed.capturedAt).getTime() < REFERRAL_WINDOW_MS) {
          return
        }
      } catch {
        localStorage.removeItem(REFERRAL_STORAGE_KEY)
      }
    }

    const utmSource = searchParams.get("utm_source") || undefined
    const utmMedium = searchParams.get("utm_medium") || undefined
    const utmCampaign = searchParams.get("utm_campaign") || undefined
    const utmTerm = searchParams.get("utm_term") || undefined
    const utmContent = searchParams.get("utm_content") || undefined
    const firstTouchUrl = window.location.href
    const capturedAt = new Date().toISOString()

    fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref || undefined, affiliateId: affiliateId || undefined }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data?.success) return
        const resolvedRefCode = data.refCode || ref || undefined
        const attribution: ReferralAttribution = {
          refCode: resolvedRefCode,
          affiliateId: data.affiliateId || affiliateId || undefined,
          firstTouchUrl,
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
          capturedAt,
        }

        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(attribution))
        if (resolvedRefCode) {
          localStorage.setItem(REFERRAL_CODE_KEY, resolvedRefCode)
          localStorage.setItem(REFERRAL_TIMESTAMP_KEY, Date.now().toString())
        }
      })
      .catch((error) => {
        console.error("[ReferralCapture] Failed to capture referral:", error)
      })
  }, [searchParams])

  return null
}
