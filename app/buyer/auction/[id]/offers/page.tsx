"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { VehicleComparisonPanel, VehicleEmptyState, VehicleLoadingSkeleton } from "@/components/vehicles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { extractApiError } from "@/lib/utils/error-message"
import { useRouter } from "next/navigation"
import { csrfHeaders } from "@/lib/csrf-client"
import { DollarSign, TrendingDown, Scale, AlertCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AuctionOffersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [bestPriceOptions, setBestPriceOptions] = useState<any[]>([])
  const [auction, setAuction] = useState<any>(null)
  const [decliningOffer, setDecliningOffer] = useState<string | null>(null)
  const [selectingOffer, setSelectingOffer] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get auction details
        const auctionRes = await fetch(`/api/auction/${id}`)
        const auctionData = await auctionRes.json()

        if (auctionData.success) {
          setAuction(auctionData.data.auction)

          // Compute best price options
          setComputing(true)
          await fetch(`/api/auction/${id}/best-price`, { method: "POST", headers: csrfHeaders() })

          // Get the computed options
          const optionsRes = await fetch(`/api/auction/${id}/best-price`)
          const optionsData = await optionsRes.json()

          if (optionsData.success) {
            setBestPriceOptions(optionsData.data.options)
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load offers",
        })
      } finally {
        setLoading(false)
        setComputing(false)
      }
    }
    loadData()
  }, [id, toast])

  const handleDeclineOffer = async (offerId: string) => {
    try {
      const response = await fetch("/api/buyer/auction/decline", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ auctionId: id, offerId }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Failed to load offers"))
      }

      setBestPriceOptions(data.data.options)

      toast({
        title: "Offer declined",
        description: data.data.message,
      })
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setDecliningOffer(null)
    }
  }

  const handleSelectOffer = async (offerId: string, financingOptionId?: string) => {
    setSelectingOffer(offerId)
    try {
      const response = await fetch("/api/buyer/deal/select", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          auctionId: id,
          offerId,
          financingOptionId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(extractApiError(data.error, "Offer operation failed"))
      }

      toast({
        title: "Deal selected!",
        description: "Proceeding to financing and next steps",
      })

      router.push(`/buyer/deal`)
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setSelectingOffer(null)
    }
  }

  const getTypeInfo = (type: string) => {
    const types: Record<string, { label: string; icon: any; color: string; bgColor: string; description: string }> = {
      BEST_CASH: {
        label: "Best Cash Price",
        icon: DollarSign,
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
        description: "Lowest out-the-door price if paying cash or with your own financing",
      },
      BEST_MONTHLY: {
        label: "Best Monthly Payment",
        icon: TrendingDown,
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
        description: "Lowest monthly payment with dealer financing options",
      },
      BALANCED: {
        label: "Best Overall Value",
        icon: Scale,
        color: "text-purple-600",
        bgColor: "bg-purple-50 border-purple-200",
        description: "Best combination of price, dealer reputation, and terms",
      },
    }
    return types[type] || types['BALANCED']
  }

  if (loading || computing) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="space-y-6">
          <div>
            <div className="h-10 w-72 bg-muted rounded animate-pulse mb-2" />
            <div className="h-5 w-96 bg-muted rounded animate-pulse" />
          </div>
          <VehicleLoadingSkeleton variant="summary" count={3} />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Best Price Options</h1>
          <p className="text-muted-foreground">
            {auction?.offers?.length || 0} dealer{auction?.offers?.length !== 1 ? "s" : ""} submitted offers. Here are
            your top choices.
          </p>
        </div>

        {bestPriceOptions.length === 0 ? (
          <VehicleEmptyState
            title="No More Offers Available"
            description="You've reviewed all available offers for this auction. Your $99 deposit will be automatically refunded."
            icon={<AlertCircle className="h-8 w-8 text-yellow-500" />}
            primaryAction={{ label: "Start New Auction", href: "/buyer/shortlist" }}
            secondaryAction={{ label: "Search Other Vehicles", href: "/buyer/search" }}
          />
        ) : (
          <VehicleComparisonPanel
            options={bestPriceOptions.map((option, index) => {
              const typeInfo = getTypeInfo(option.type)
              const Icon = typeInfo?.icon
              const vehicle = option.inventoryItem
              const dealer = option.dealer || option.inventoryItem?.dealer

              return {
                id: option.id,
                label: typeInfo?.label || "Offer",
                description: typeInfo?.description,
                recommended: index === 0,
                score: option.score,
                bgColor: typeInfo?.bgColor,
                accentColor: typeInfo?.color,
                icon: Icon ? <Icon className={`h-6 w-6 ${typeInfo?.color}`} /> : undefined,
                year: vehicle?.year,
                make: vehicle?.make,
                model: vehicle?.model,
                trim: vehicle?.trim,
                mileage: vehicle?.mileage,
                cashOtd: option.cashOtd,
                monthlyPayment: option.monthlyPayment,
                dealerName: dealer?.businessName,
                dealerCity: dealer?.city,
                dealerState: dealer?.state,
                dealerScore: dealer?.integrityScore || 85,
                financingOptions: option.offer?.financingOptions,
                onSelect: () => handleSelectOffer(option.offerId, option.financingOptionId),
                selectDisabled: selectingOffer === option.offerId,
                selectLabel: selectingOffer === option.offerId ? "Processing..." : "Select This Deal",
                onDecline: () => setDecliningOffer(option.offerId),
              }
            })}
          />
        )}

        {/* Decline Confirmation Dialog */}
        <AlertDialog open={!!decliningOffer} onOpenChange={() => setDecliningOffer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this offer?</AlertDialogTitle>
              <AlertDialogDescription>
                This offer will be removed from your options. If there are more offers available, the next best one will
                be shown in its place.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => decliningOffer && handleDeclineOffer(decliningOffer)}
                className="bg-red-600 hover:bg-red-700"
              >
                Decline Offer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
