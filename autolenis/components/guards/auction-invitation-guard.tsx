"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

interface AuctionInvitationGuardProps {
  children: React.ReactNode
  /** Whether the current dealer is an invited participant in this auction */
  isInvited: boolean
  /** Whether data is still loading */
  isLoading?: boolean
  fallbackRoute?: string
}

/**
 * Wraps Auction detail pages for dealer access control.
 * Dealers can only view auctions where they are an invited participant
 * via AuctionParticipant. If the auction data returns empty or 403,
 * this guard shows an access-denied message and offers navigation back.
 */
export function AuctionInvitationGuard({
  children,
  isInvited,
  isLoading = false,
  fallbackRoute = "/dealer/auctions",
}: AuctionInvitationGuardProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isInvited) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <CardTitle>Auction Not Available</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don&apos;t have access to this auction. Only invited dealers can view and bid on auctions.
          </p>
          <Button onClick={() => router.push(fallbackRoute)}>Back to Auctions</Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
