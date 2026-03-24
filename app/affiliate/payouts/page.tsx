"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliatePayouts() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/payouts")
  }, [router])
  return null
}
