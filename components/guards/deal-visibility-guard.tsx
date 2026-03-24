"use client"

import type React from "react"
import { useUser } from "@/hooks/use-user"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { isDealer } from "@/lib/utils/role-detection"
import { isDealerVisibleStatus } from "@/lib/constants/deal-visibility"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

interface DealVisibilityGuardProps {
  children: React.ReactNode
  dealStatus?: string | null
  dealDealerId?: string | null
  currentDealerId?: string | null
  fallbackRoute?: string
}

/**
 * Wraps SelectedDeal pages to enforce dealer visibility rules.
 * Dealers can only view deals where:
 * 1. Their dealerId matches the deal's dealerId
 * 2. The deal status is in the active pipeline allow-list
 * Buyers can always view their own deals.
 */
export function DealVisibilityGuard({
  children,
  dealStatus,
  dealDealerId,
  currentDealerId,
  fallbackRoute = "/dealer/deals",
}: DealVisibilityGuardProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (isLoading || !user) return

    if (!isDealer(user.role)) return

    // Dealer checks
    if (dealDealerId && currentDealerId && dealDealerId !== currentDealerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate authorization check
      setDenied(true)
      return
    }

    if (dealStatus && !isDealerVisibleStatus(dealStatus)) {
      setDenied(true)
      return
    }
  }, [user, isLoading, dealStatus, dealDealerId, currentDealerId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (denied) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <CardTitle>Access Restricted</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don&apos;t have access to view this deal. This may be because the deal is no longer in an
            active status or is assigned to a different dealer.
          </p>
          <Button onClick={() => router.push(fallbackRoute)}>Back to My Deals</Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
