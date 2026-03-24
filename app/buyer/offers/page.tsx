"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { StatusPill } from "@/components/dashboard/status-pill"
import { VehiclePriceBlock } from "@/components/vehicles"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Gavel, Search, Building2, ArrowRight, Shield, Clock, EyeOff } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BuyerOffersPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/buyer/auctions", fetcher)

  // Flatten offers from all auctions
  const allOffers = (data?.data?.auctions || []).flatMap((auction: any) =>
    (auction.offers || []).map((offer: any) => ({
      ...offer,
      auction,
      vehicle: auction.shortlist?.items?.[0]?.inventoryItem,
    }))
  )

  const getDealerDisplay = (offer: any) => {
    // Identity masking: before release conditions are met, show anonymous
    if (offer.identityState === "ANONYMOUS" || offer.identityState === "CONDITIONAL_HOLD") {
      return { name: "Anonymous Dealer", isAnonymous: true }
    }
    // If dealer is in onboarding-pending state
    if (offer.dealerOnboardingStatus === "pending" || offer.dealerOnboardingStatus === "converting") {
      return { name: "Dealer (Onboarding)", isAnonymous: true, isPending: true }
    }
    return { name: offer.dealer?.name || "Dealer", isAnonymous: false }
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <PageHeader
          title="My Offers"
          subtitle="Review and compare offers from dealers"
        />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search offers..." className="pl-9" />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : error ? (
          <ErrorState message="Failed to load offers" onRetry={() => mutate()} />
        ) : allOffers.length === 0 ? (
          <EmptyState
            icon={<Gavel className="h-8 w-8 text-muted-foreground" />}
            title="No offers yet"
            description="Complete your vehicle request to start receiving competitive offers from dealers."
            primaryCta={{ label: "Start a Request", href: "/buyer/search" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allOffers.map((offer: any) => {
              const dealerInfo = getDealerDisplay(offer)
              return (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {offer.vehicle?.year} {offer.vehicle?.make} {offer.vehicle?.model}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            {dealerInfo.isAnonymous ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span className="italic">{dealerInfo.name}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="h-3 w-3" />
                                {dealerInfo.name}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusPill status={offer.status?.toLowerCase() || "pending"} />
                          {dealerInfo.isPending && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              Onboarding
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Anonymous dealer notice */}
                      {dealerInfo.isAnonymous && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2 flex items-start gap-2">
                          <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Dealer identity is protected until deal commitment is confirmed.
                          </p>
                        </div>
                      )}

                      <VehiclePriceBlock
                        price={offer.cashOtd || 0}
                        label="OTD Price"
                        size="md"
                      />

                      <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                        <Link href={`/buyer/offers/${offer.id}`}>
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

