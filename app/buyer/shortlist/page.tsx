"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { VehicleCard } from "@/components/buyer/vehicle-card"
import { VehicleStatusChips, VehicleEmptyState, VehicleLoadingSkeleton, type ChipVariant } from "@/components/vehicles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { useRouter } from "next/navigation"
import { csrfHeaders } from "@/lib/csrf-client"
import { Trash2, Gavel, CheckCircle2, AlertCircle, CreditCard, Car } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MatchStatus {
  requestId: string
  matchScore: number
  networkDealerAvailable: boolean
  externalSourcingAvailable: boolean
  invitesSent: number
  offersReceived: number
}

export default function BuyerShortlistPage() {
  const [shortlist, setShortlist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [validation, setValidation] = useState<any>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [creatingAuction, setCreatingAuction] = useState(false)
  const [matchStatuses, setMatchStatuses] = useState<Record<string, MatchStatus>>({})
  const { toast } = useToast()
  const router = useRouter()

  const validateAuction = useCallback(async () => {
    try {
      const response = await fetch("/api/buyer/auction/validate")
      const data = await response.json()
      if (data.success) {
        setValidation(data.data)
      }
    } catch (error) {}
  }, [])

  // Fetch match status for items in the shortlist
  const loadMatchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/shortlist/match")
      const data = await res.json()
      if (data.success && data.data?.matches) {
        const statusMap: Record<string, MatchStatus> = {}
        for (const match of data.data.matches) {
          statusMap[match.inventoryItemId || match.requestId] = match
        }
        setMatchStatuses(statusMap)
      }
    } catch {
      // Non-critical: match status is supplementary
    }
  }, [])

  useEffect(() => {
    const loadShortlist = async () => {
      try {
        const response = await fetch("/api/buyer/shortlist")
        const data = await response.json()

        if (data.success) {
          setShortlist(data.data.shortlist)
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load shortlist",
        })
      } finally {
        setLoading(false)
      }
    }

    loadShortlist()
    validateAuction()
    loadMatchStatuses()
  }, [toast, validateAuction, loadMatchStatuses])

  const handleRemove = async (inventoryItemId: string) => {
    try {
      const response = await fetch(`/api/buyer/shortlist?inventoryItemId=${inventoryItemId}`, { method: "DELETE", headers: csrfHeaders() })
      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to load shortlist"))
      }

      setShortlist(data.data.shortlist)
      validateAuction()

      toast({
        title: "Removed from shortlist",
        description: "Vehicle removed successfully",
      })
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const handleStartAuction = async () => {
    // Check prerequisites first
    if (!validation?.hasDeposit) {
      router.push("/buyer/deposit")
      return
    }

    setCreatingAuction(true)

    try {
      const response = await fetch("/api/buyer/auction", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ shortlistId: shortlist.id }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Shortlist operation failed"))
      }

      toast({
        title: "Auction started!",
        description: "Dealers are now competing to offer you the best deal",
      })

      router.push(`/buyer/auction/${data.data.auction.id}`)
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setCreatingAuction(false)
      setShowStartModal(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-9 w-40 bg-muted rounded animate-pulse" />
              <div className="h-5 w-56 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <VehicleLoadingSkeleton variant="card" count={3} />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Shortlist</h1>
            <p className="text-muted-foreground">
              {shortlist?.items?.length || 0} vehicle{shortlist?.items?.length !== 1 ? "s" : ""} ready for auction
            </p>
          </div>
          {shortlist?.items?.length > 0 && (
            <Button
              onClick={() => setShowStartModal(true)}
              size="lg"
              className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF] hover:opacity-90"
            >
              <Gavel className="h-5 w-5 mr-2" />
              Start Auction
            </Button>
          )}
        </div>

        {(!shortlist || shortlist.items.length === 0) && (
          <VehicleEmptyState
            title="Your shortlist is empty"
            description="Add vehicles from search to start building your shortlist and launch an auction."
            icon={<Car className="h-8 w-8 text-muted-foreground/50" />}
            primaryAction={{ label: "Search Vehicles", href: "/buyer/search" }}
          />
        )}

        {shortlist && shortlist.items.length > 0 && (
          <>
            {/* Prerequisites Status */}
            <Card className="bg-gradient-to-r from-primary/5 to-[#0066FF]/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Auction Prerequisites</CardTitle>
                <CardDescription>Complete these steps before starting your auction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${validation?.hasPreQual ? "bg-green-50" : "bg-yellow-50"}`}
                  >
                    {validation?.hasPreQual ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Pre-Qualification</p>
                      <p className="text-xs text-muted-foreground">
                        {validation?.hasPreQual ? "Completed" : "Required"}
                      </p>
                    </div>
                    {!validation?.hasPreQual && (
                      <Button size="sm" variant="outline" onClick={() => router.push("/buyer/prequal")}>
                        Complete
                      </Button>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${validation?.hasShortlist ? "bg-green-50" : "bg-yellow-50"}`}
                  >
                    {validation?.hasShortlist ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Shortlist</p>
                      <p className="text-xs text-muted-foreground">
                        {validation?.vehicleCount || 0} vehicle{validation?.vehicleCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${validation?.hasDeposit ? "bg-green-50" : "bg-yellow-50"}`}
                  >
                    {validation?.hasDeposit ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">$99 Deposit</p>
                      <p className="text-xs text-muted-foreground">
                        {validation?.hasDeposit ? "Paid (Refundable)" : "Required"}
                      </p>
                    </div>
                    {!validation?.hasDeposit && (
                      <Button size="sm" variant="outline" onClick={() => router.push("/buyer/deposit")}>
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicles Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shortlist.items.map((item: any) => {
                const matchInfo = matchStatuses[item.inventoryItemId] || matchStatuses[item.id]
                return (
                  <div key={item.id} className="relative group">
                    <VehicleCard
                      vehicle={item.inventoryItem}
                      inventoryItem={item.inventoryItem}
                      dealer={item.inventoryItem.dealer}
                    />
                    {/* Sourcing / network indicators */}
                    {matchInfo && (
                      <div className="absolute bottom-16 left-3">
                        <VehicleStatusChips
                          chips={[
                            ...(matchInfo.networkDealerAvailable ? ["network" as ChipVariant] : []),
                            ...(matchInfo.externalSourcingAvailable ? ["sourcing" as ChipVariant] : []),
                          ]}
                        />
                        {matchInfo.offersReceived > 0 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {matchInfo.offersReceived} offer{matchInfo.offersReceived !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(item.inventoryItemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Start Auction Modal */}
        <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Start Your Auction
              </DialogTitle>
              <DialogDescription>
                Dealers will compete to give you the best price on your shortlisted vehicles
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                      1
                    </span>
                    <span>Your auction runs for 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                      2
                    </span>
                    <span>Dealers submit their best offers (they can&apos;t see each other&apos;s bids)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                      3
                    </span>
                    <span>Our Best Price Engine shows you the top 3 options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                      4
                    </span>
                    <span>Choose your favorite and proceed to purchase</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Vehicles in auction</p>
                  <p className="text-sm text-muted-foreground">{shortlist?.items?.length || 0} vehicles</p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {shortlist?.items?.length || 0}
                </Badge>
              </div>

              {!validation?.hasDeposit && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">$99 Refundable Deposit Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    This deposit is fully refundable if you don&apos;t complete a purchase
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartAuction}
                disabled={creatingAuction || !validation?.valid}
                className="bg-gradient-to-r from-[#7ED321] to-[#00D9FF]"
              >
                {creatingAuction ? "Starting..." : validation?.hasDeposit ? "Start Auction" : "Pay Deposit & Start"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
