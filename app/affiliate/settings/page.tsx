"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateSettings() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/settings")
  }, [router])
  return null
}
