"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import useSWR from "swr"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Gavel, Clock, DollarSign, CheckCircle2, Car, TrendingDown, AlertCircle, RefreshCw } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function BuyerAuctionsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/buyer/auctions", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const { toast } = useToast()
  const router = useRouter()

  const handleSelectOffer = async (auctionId: string, offerId: string) => {
    try {
      const response = await fetch("/api/buyer/auction/select", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ auctionId, offerId }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Offer accepted!",
        description: "Moving to deal process",
      })

      router.push("/buyer/deal")
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      OPEN: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      PENDING_DEPOSIT: "bg-yellow-100 text-yellow-800",
      CLOSED: "bg-muted text-gray-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      NO_OFFERS: "bg-orange-100 text-orange-800",
      CANCELLED: "bg-red-100 text-red-800",
    }
    return <Badge className={styles[status] || "bg-muted"}>{status}</Badge>
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-2" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="bg-muted h-24" />
                <CardContent className="pt-6">
                  <div className="h-32 bg-muted/50 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !data?.success) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Auctions & Offers</h1>
              <p className="text-muted-foreground">View dealer offers on your shortlisted vehicles</p>
            </div>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-4 py-6">
              <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Unable to load auctions</h3>
                <p className="text-sm text-red-700">{data?.error || "Please try refreshing the page."}</p>
              </div>
              <Button variant="outline" onClick={() => mutate()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  const auctions = data?.data?.auctions || []

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Auctions & Offers</h1>
            <p className="text-muted-foreground">View dealer offers on your shortlisted vehicles</p>
          </div>
          <Button onClick={() => router.push("/buyer/shortlist")} variant="outline">
            <Gavel className="h-4 w-4 mr-2" />
            Start New Auction
          </Button>
        </div>

        {auctions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Active Auctions</CardTitle>
              <CardDescription>Start an auction from your shortlist to receive dealer offers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/buyer/shortlist")}>Go to Shortlist</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {auctions.map((auction: any) => (
              <Card key={auction.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-[#0066FF] text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gavel className="h-6 w-6" />
                      <div>
                        <CardTitle className="text-white">Auction #{auction.id.slice(-6)}</CardTitle>
                        <CardDescription className="text-white/80">
                          {auction.shortlist?.items?.length || 0} vehicle(s)
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(auction.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicles
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(auction.shortlist?.items || []).map((item: any) => {
                        const vehicle = item?.inventoryItem
                        return (
                          <div key={item.id} className="border rounded-lg p-3 bg-muted/50">
                            <p className="font-medium">
                              {vehicle
                                ? `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Unknown Vehicle"
                                : "Vehicle data unavailable"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle?.mileage ? `${vehicle.mileage.toLocaleString()} miles` : "Mileage N/A"}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {auction.offers && auction.offers.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Dealer Offers ({auction.offers.length})
                      </h4>
                      <div className="space-y-3">
                        {auction.offers
                          .map((offer: any, index: number) => (
                            <div
                              key={offer.id}
                              className={`border rounded-lg p-4 ${index === 0 ? "border-[#7ED321] border-2 bg-green-50" : ""}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold">{offer.dealer?.businessName || "Dealer"}</p>
                                    {index === 0 && (
                                      <Badge className="bg-[#7ED321] text-white">
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                        Best Price
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {[offer.dealer?.city, offer.dealer?.state].filter(Boolean).join(", ") || "Location N/A"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-[#0066FF]">
                                    ${(offer.otdPrice || 0).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Out-the-door</p>
                                </div>
                              </div>

                              {offer.financingOptions && offer.financingOptions.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-sm text-muted-foreground mb-2">Financing available:</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {offer.financingOptions.slice(0, 2).map((opt: any, i: number) => (
                                      <Badge key={i} variant="outline">
                                        {opt.apr ?? 0}% APR • {opt.termMonths ?? 0}mo • ${opt.monthlyPayment ?? 0}/mo
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(auction.status === "ACTIVE" || auction.status === "OPEN") && (
                                <Button
                                  onClick={() => handleSelectOffer(auction.id, offer.id)}
                                  className="w-full mt-4 bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Accept This Offer
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/50 rounded-lg">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">Waiting for dealer offers</p>
                      <p className="text-sm text-muted-foreground">Dealers typically respond within 24-48 hours</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
