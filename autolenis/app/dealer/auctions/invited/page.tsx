"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Clock, Eye, Car, DollarSign, MapPin } from "lucide-react"
import Link from "next/link"

interface InvitedAuction {
  id: string
  buyerName: string
  vehicleCount: number
  maxBudget: number
  location: string
  endsAt: string
  viewedAt: string | null
  status: "PENDING" | "VIEWED" | "OFFER_SUBMITTED"
}

export default function InvitedAuctionsPage() {
  const [auctions, setAuctions] = useState<InvitedAuction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAuctions() {
      try {
        const res = await fetch("/api/dealer/auctions")
        if (res.ok) {
          const data = await res.json()
          setAuctions(data.auctions || [])
        }
      } catch {
        setAuctions([])
      } finally {
        setLoading(false)
      }
    }
    fetchAuctions()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">New</Badge>
      case "VIEWED":
        return <Badge className="bg-blue-500">Viewed</Badge>
      case "OFFER_SUBMITTED":
        return <Badge className="bg-green-500">Offer Sent</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`
    }
    return `${hours}h ${minutes}m remaining`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invited Auctions</h1>
        <p className="text-muted-foreground mt-1">View and respond to auction invitations from buyers</p>
      </div>

      {auctions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Invited Auctions</h3>
            <p className="text-muted-foreground">
              You haven't been invited to any auctions yet. Keep your inventory updated to receive more invitations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {auctions.map((auction) => (
            <Card key={auction.id} className={auction.status === "PENDING" ? "border-[#7ED321]" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Auction from {auction.buyerName}
                      {getStatusBadge(auction.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {auction.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {getTimeRemaining(auction.endsAt)}
                      </span>
                    </CardDescription>
                  </div>
                  <Link href={`/dealer/auctions/${auction.id}`}>
                    <Button>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicles</p>
                      <p className="font-semibold">{auction.vehicleCount} on shortlist</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <DollarSign className="h-5 w-5 text-[#7ED321]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Max Budget</p>
                      <p className="font-semibold">${auction.maxBudget.toLocaleString()}</p>
                    </div>
                  </div>
                  {auction.viewedAt && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Eye className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Viewed</p>
                        <p className="font-semibold">{new Date(auction.viewedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
