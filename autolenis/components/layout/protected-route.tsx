"use client"

import type React from "react"

import { useUser } from "@/hooks/use-user"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { UserRole } from "@/lib/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/auth/signin" }: ProtectedRouteProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo)
    }

    if (!isLoading && user && allowedRoles) {
      // Check if user's role is in the allowed roles
      const hasAccess = allowedRoles.includes(user.role)

      // Also check for buyer-affiliates (BUYER role with is_affiliate flag)
      const isBuyerAffiliate = user.role === "BUYER" && user.is_affiliate === true
      const affiliateRolesRequested = allowedRoles.includes("AFFILIATE") || allowedRoles.includes("AFFILIATE_ONLY")

      if (!hasAccess && !(isBuyerAffiliate && affiliateRolesRequested)) {
        router.push("/")
      }
    }
  }, [user, isLoading, allowedRoles, router, redirectTo])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (allowedRoles) {
    const hasAccess = allowedRoles.includes(user.role)
    const isBuyerAffiliate = user.role === "BUYER" && user.is_affiliate === true
    const affiliateRolesRequested = allowedRoles.includes("AFFILIATE") || allowedRoles.includes("AFFILIATE_ONLY")

    if (!hasAccess && !(isBuyerAffiliate && affiliateRolesRequested)) {
      return null
    }
  }

  return <>{children}</>
}
