"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AffiliateDashboard() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/affiliate/portal/dashboard")
  }, [router])
  return null
}
