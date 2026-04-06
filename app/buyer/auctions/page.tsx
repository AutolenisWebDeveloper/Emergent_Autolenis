"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gavel, Clock, CheckCircle2, ArrowRight, Inbox } from "lucide-react"

interface Auction {
  id: string
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleTrim: string | null
  status: string
  currentBidCents: number | null
  reservePriceCents: number | null
  endsAt: string | null
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Live", variant: "default" },
  PENDING: { label: "Pending", variant: "secondary" },
  WON: { label: "Won", variant: "default" },
  LOST: { label: "Lost", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
}

export default function BuyerAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/auctions")
      const data = await res.json()
      setAuctions(data?.data?.auctions || data?.auctions || [])
    } catch {
      // Empty state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAuctions() }, [fetchAuctions])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="auctions-loading">
        <h1 className="text-2xl font-semibold tracking-tight">Auctions & Offers</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="auctions-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auctions & Offers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track dealer offers and auction results for vehicles you&apos;re interested in.
        </p>
      </div>

      {auctions.length === 0 ? (
        <Card className="border-dashed" data-testid="no-auctions-empty">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No auctions yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              When you shortlist vehicles or submit requests, dealers may respond with offers and auctions. They&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" data-testid="auctions-list">
          {auctions.map((auction) => {
            const config = STATUS_MAP[auction.status] || STATUS_MAP.PENDING
            const vehicle = [auction.vehicleYear, auction.vehicleMake, auction.vehicleModel, auction.vehicleTrim].filter(Boolean).join(" ")
            return (
              <Card key={auction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Gavel className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{vehicle || "Vehicle Auction"}</p>
                      {auction.currentBidCents && (
                        <p className="text-sm text-muted-foreground">
                          Current bid: ${(auction.currentBidCents / 100).toLocaleString()}
                        </p>
                      )}
                      {auction.endsAt && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Ends {new Date(auction.endsAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
