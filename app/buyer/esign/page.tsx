"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/layout/protected-route"

export default function BuyerEsignRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to deal esign page
    router.replace("/buyer/deal/esign")
  }, [router])

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </ProtectedRoute>
  )
}
