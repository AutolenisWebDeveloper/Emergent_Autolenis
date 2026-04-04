"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateReferrals() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/referrals")
  }, [router])
  return null
}
