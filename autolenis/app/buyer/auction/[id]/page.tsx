"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { VehicleCardCompact, VehicleLoadingSkeleton, VehicleEmptyState } from "@/components/vehicles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Clock, Users, DollarSign, CheckCircle2, AlertCircle } from "lucide-react"

export default function AuctionStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [auction, setAuction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadAuction = async () => {
      try {
        const response = await fetch(`/api/auction/${id}`)
        const data = await response.json()

        if (data.success) {
          setAuction(data.data.auction)
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load auction",
        })
      } finally {
        setLoading(false)
      }
    }
    loadAuction()
    const interval = setInterval(loadAuction, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [id, toast])

  const getTimeRemaining = () => {
    if (!auction?.closesAt) return null
    const now = new Date()
    const end = new Date(auction.closesAt)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "Closed"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m remaining`
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-9 w-48 bg-muted rounded animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="h-56 bg-muted rounded-xl animate-pulse" />
          <VehicleLoadingSkeleton variant="compact" count={3} />
        </div>
      </ProtectedRoute>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Auction not found</CardTitle>
            <CardDescription>This auction may have been deleted or doesn't exist</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/buyer/dashboard")}>Return to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const timeRemaining = getTimeRemaining()
  const isClosed = auction.status === "CLOSED" || timeRemaining === "Closed"

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auction Status</h1>
          <Badge variant={isClosed ? "secondary" : "default"} className="text-lg px-4 py-2">
            {auction.status}
          </Badge>
        </div>

        {/* Auction Status Card */}
        <Card className="border-2 border-[#7ED321]">
          <CardHeader className="bg-gradient-to-r from-primary to-[#0066FF] text-white">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isClosed ? "Auction Complete" : "Auction in Progress"}
            </CardTitle>
            <CardDescription className="text-white/80">
              {isClosed ? "Dealers have submitted their offers" : "Dealers are competing for your business"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                <div className="text-2xl font-bold text-[#0066FF]">{timeRemaining}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Dealers Invited</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-[#00D9FF]" />
                  {auction.participants?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Offers Received</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-[#7ED321]" />
                  {auction.offers?.length || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles in Auction */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicles in This Auction</CardTitle>
            <CardDescription>Dealers are bidding on these vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auction.shortlist?.items?.map((item: any) => (
                <VehicleCardCompact
                  key={item.id}
                  year={item.inventoryItem?.year}
                  make={item.inventoryItem?.make}
                  model={item.inventoryItem?.model}
                  trim={item.inventoryItem?.trim}
                  imageSrc={item.inventoryItem?.photosJson?.[0] || null}
                  mileage={item.inventoryItem?.mileage}
                  price={item.inventoryItem?.priceCents ? item.inventoryItem.priceCents / 100 : undefined}
                  priceLabel="Listed Price"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        {!isClosed && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <AlertCircle className="h-5 w-5" />
                What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-900">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Dealers are reviewing your shortlisted vehicles and preparing their best offers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>When the auction closes, you'll see all offers and can compare them side-by-side</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Our Best Price Engine will highlight the best deals for you</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {isClosed && (auction.offers?.length || 0) > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle2 className="h-5 w-5" />
                Auction Complete!
              </CardTitle>
              <CardDescription className="text-green-700">
                You've received {auction.offers?.length} offer{auction.offers?.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-[#7ED321] to-[#00D9FF] hover:opacity-90"
                onClick={() => router.push(`/buyer/auction/${id}/offers`)}
              >
                View Offers & Choose Best Deal
              </Button>
            </CardContent>
          </Card>
        )}

        {isClosed && (!auction.offers || auction.offers.length === 0) && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-900">No Offers Received</CardTitle>
              <CardDescription className="text-yellow-700">
                Unfortunately, no dealers submitted offers for this auction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-900">
                Your $99 deposit will be automatically refunded to your original payment method within 5-7 business
                days.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push("/buyer/search")}>
                  Search Other Vehicles
                </Button>
                <Button onClick={() => router.push("/buyer/dashboard")}>Return to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
