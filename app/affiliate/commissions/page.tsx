"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateCommissions() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/commissions")
  }, [router])
  return null
}
