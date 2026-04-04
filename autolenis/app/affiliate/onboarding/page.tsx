"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateOnboarding() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/onboarding")
  }, [router])
  return null
}
