"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateLinks() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/link")
  }, [router])
  return null
}
