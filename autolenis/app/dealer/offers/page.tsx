"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, Search, Car, DollarSign, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerOffersPage() {
  const [search, setSearch] = useState("")
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/offers", fetcher)

  const allOffers = data?.offers || []
  const offers = search
    ? allOffers.filter((offer: any) => {
        const vehicle = offer.auction?.inventoryItem
        const s = search.toLowerCase()
        return (
          vehicle?.make?.toLowerCase().includes(s) ||
          vehicle?.model?.toLowerCase().includes(s) ||
          offer.status?.toLowerCase().includes(s) ||
          offer.auction?.buyer?.profile?.firstName?.toLowerCase().includes(s)
        )
      })
    : allOffers
  const pendingOffers = offers.filter((o: any) => o.status === "PENDING")
  const acceptedOffers = offers.filter((o: any) => o.status === "ACCEPTED" || o.status === "WON")
  const rejectedOffers = offers.filter((o: any) => o.status === "REJECTED" || o.status === "LOST")

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Offers"
        subtitle="Track the status of your submitted offers"
      />

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offers..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="cards" count={3} />
      ) : error ? (
        <ErrorState message="Failed to load offers" onRetry={() => mutate()} />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={<Gavel className="h-8 w-8 text-muted-foreground" />}
          title="No offers submitted"
          description="Submit offers on active leads to compete for buyers. Your offers will appear here."
          primaryCta={{ label: "View Leads", href: "/dealer/leads" }}
        />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({offers.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingOffers.length})</TabsTrigger>
            <TabsTrigger value="accepted">Won ({acceptedOffers.length})</TabsTrigger>
            <TabsTrigger value="rejected">Lost ({rejectedOffers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <OffersList offers={offers} />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            {pendingOffers.length === 0 ? (
              <EmptyState
                icon={<Gavel className="h-8 w-8 text-muted-foreground" />}
                title="No pending offers"
                description="All your offers have been reviewed."
              />
            ) : (
              <OffersList offers={pendingOffers} />
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            {acceptedOffers.length === 0 ? (
              <EmptyState
                icon={<Gavel className="h-8 w-8 text-muted-foreground" />}
                title="No won offers yet"
                description="Keep submitting competitive offers to win deals."
              />
            ) : (
              <OffersList offers={acceptedOffers} />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedOffers.length === 0 ? (
              <EmptyState
                icon={<Gavel className="h-8 w-8 text-muted-foreground" />}
                title="No lost offers"
                description="Great job! You haven't lost any offers."
              />
            ) : (
              <OffersList offers={rejectedOffers} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function OffersList({ offers }: { offers: any[] }) {
  return (
    <div className="grid gap-4">
      {offers.map((offer: any) => {
        const vehicle = offer.auction?.inventoryItem
        return (
          <Card key={offer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {vehicle?.year || "—"} {vehicle?.make || "—"} {vehicle?.model || "—"}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      Buyer: {offer.auction?.buyer?.profile?.firstName || "Anonymous"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <StatusPill status={offer.status?.toLowerCase() || "pending"} />
                      <span className="text-sm text-muted-foreground">
                        Submitted {new Date(offer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Your Offer</p>
                    <p className="text-xl font-bold text-[#7ED321] flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {(offer.cashOtd || 0).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="bg-transparent">
                    <Link href={`/dealer/offers/${offer.id}`}>
                      View
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
