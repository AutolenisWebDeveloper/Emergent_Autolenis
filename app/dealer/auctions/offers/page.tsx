"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Car, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface SubmittedOffer {
  id: string
  auctionId: string
  buyerName: string
  vehicleYear: number
  vehicleMake: string
  vehicleModel: string
  cashOtd: number
  monthlyPayment: number | null
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED"
  submittedAt: string
}

export default function OffersSubmittedPage() {
  const [offers, setOffers] = useState<SubmittedOffer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOffers() {
      try {
        const res = await fetch("/api/dealer/offers")
        if (res.ok) {
          const data = await res.json()
          setOffers(data.offers || [])
        }
      } catch {
        setOffers([])
      } finally {
        setLoading(false)
      }
    }
    fetchOffers()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "ACCEPTED":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      case "COUNTERED":
        return (
          <Badge className="bg-amber-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Countered
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
        <h1 className="text-3xl font-bold">Offers Submitted</h1>
        <p className="text-muted-foreground mt-1">Track the status of all offers you've submitted to auctions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{offers.length}</div>
            <p className="text-sm text-muted-foreground">Total Offers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-500">
              {offers.filter((o) => o.status === "PENDING").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {offers.filter((o) => o.status === "ACCEPTED").length}
            </div>
            <p className="text-sm text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">
              {offers.filter((o) => o.status === "REJECTED").length}
            </div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Offers Submitted</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any offers yet. Check your invited auctions to start bidding.
            </p>
            <Link href="/dealer/auctions/invited">
              <Button>View Invited Auctions</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {offer.vehicleYear} {offer.vehicleMake} {offer.vehicleModel}
                      {getStatusBadge(offer.status)}
                    </CardTitle>
                    <CardDescription>
                      Offer to {offer.buyerName} - Submitted {new Date(offer.submittedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Link href={`/dealer/auctions/${offer.auctionId}`}>
                    <Button variant="outline">View Auction</Button>
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
                      <p className="text-sm text-muted-foreground">Vehicle</p>
                      <p className="font-semibold">
                        {offer.vehicleYear} {offer.vehicleMake} {offer.vehicleModel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <DollarSign className="h-5 w-5 text-[#7ED321]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cash OTD</p>
                      <p className="font-semibold">${offer.cashOtd.toLocaleString()}</p>
                    </div>
                  </div>
                  {offer.monthlyPayment && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly</p>
                        <p className="font-semibold">${offer.monthlyPayment}/mo</p>
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
