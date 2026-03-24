"use client"

import { csrfHeaders } from "@/lib/csrf-client"
import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Search,
  XCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TIMELINE_STEPS = [
  "SUBMITTED",
  "SOURCING",
  "OFFERS_AVAILABLE",
  "OFFER_SELECTED",
  "DEALER_INVITED",
  "IN_PLATFORM_TRANSACTION",
  "CLOSED_WON",
] as const

const STEP_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  SOURCING: "Sourcing",
  OFFERS_AVAILABLE: "Offers Available",
  OFFER_SELECTED: "Offer Selected",
  DEALER_INVITED: "Dealer Invited",
  IN_PLATFORM_TRANSACTION: "Transaction",
  CLOSED_WON: "Closed",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300",
  SOURCING: "bg-yellow-100 text-yellow-700 border-yellow-300",
  OFFERS_AVAILABLE: "bg-green-100 text-green-700 border-green-300",
  OFFER_SELECTED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  DEALER_INVITED: "bg-purple-100 text-purple-700 border-purple-300",
  IN_PLATFORM_TRANSACTION: "bg-indigo-100 text-indigo-700 border-indigo-300",
  CLOSED_WON: "bg-gray-200 text-gray-600 border-gray-400",
  CLOSED_LOST: "bg-gray-200 text-gray-500 border-gray-300",
  CLOSED_CANCELLED: "bg-red-100 text-red-700 border-red-300",
}

const TIMELINE_LABELS: Record<string, string> = {
  ZERO_7_DAYS: "0–7 Days",
  EIGHT_14_DAYS: "8–14 Days",
  FIFTEEN_30_DAYS: "15–30 Days",
  THIRTY_PLUS_DAYS: "30+ Days",
}

interface OfferPricingBreakdown {
  cashOtdCents?: number
  taxCents?: number
  [key: string]: number | undefined
}

interface Offer {
  id: string
  year?: number | null
  make?: string | null
  modelName?: string | null
  trim?: string | null
  sourceDealerName?: string | null
  pricingBreakdownJson?: OfferPricingBreakdown | null
  expiresAt?: string | null
  status: string
}

interface RequestItem {
  id: string
  vehicleType: string
  condition: string
  yearMin?: number
  yearMax?: number
  make: string
  model?: string
  openToSimilar: boolean
  trim?: string
  budgetType: string
  budgetTargetCents?: number
  maxTotalOtdBudgetCents?: number | null
  maxMonthlyPaymentCents?: number | null
  desiredDownPaymentCents?: number | null
  mileageMax?: number
  mustHaveFeatures: string[]
  colors: string[]
  distancePreference: string
  maxDistanceMiles?: number
  timeline: string
  vin?: string
  notes?: string
}

interface RequestCase {
  id: string
  status: string
  marketZip: string
  radiusMiles: number
  createdAt: string
  submittedAt?: string
  items: RequestItem[]
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = use(params)
  const { toast } = useToast()
  const [requestCase, setRequestCase] = useState<RequestCase | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptingOffer, setAcceptingOffer] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [caseRes, offersRes] = await Promise.all([
        fetch(`/api/buyer/requests/${caseId}`),
        fetch(`/api/buyer/requests/${caseId}/offers`),
      ])

      if (!caseRes.ok) throw new Error("Failed to load request details")
      const caseData = await caseRes.json()
      setRequestCase(caseData.case ?? caseData.data ?? caseData)

      if (offersRes.ok) {
        const offersData = await offersRes.json()
        setOffers(offersData.offers ?? offersData.data ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load request")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAcceptOffer(offerId: string) {
    setAcceptingOffer(offerId)
    try {
      const res = await fetch(
        `/api/buyer/requests/${caseId}/offers/${offerId}/accept`,
        { method: "POST", headers: csrfHeaders() }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? "Failed to accept offer")
      }
      toast({ title: "Offer accepted!" })
      loadData()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to accept offer",
      })
    } finally {
      setAcceptingOffer(null)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/buyer/requests/${caseId}/cancel`, {
        method: "POST",
        headers: csrfHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? "Failed to cancel request")
      }
      toast({ title: "Request cancelled" })
      loadData()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel request",
      })
    } finally {
      setCancelling(false)
    }
  }

  // Current step index for timeline
  const currentStepIndex = requestCase
    ? TIMELINE_STEPS.indexOf(
        requestCase.status as (typeof TIMELINE_STEPS)[number]
      )
    : -1

  const canCancel =
    requestCase?.status === "DRAFT" || requestCase?.status === "SUBMITTED"

  const showOffers =
    requestCase &&
    [
      "OFFERS_AVAILABLE",
      "OFFER_SELECTED",
      "DEALER_INVITED",
      "IN_PLATFORM_TRANSACTION",
      "CLOSED_WON",
      "CLOSED_LOST",
      "CLOSED_CANCELLED",
    ].includes(requestCase.status)

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/buyer/requests">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Request Details</h1>
              {requestCase && (
                <p className="text-sm text-muted-foreground">
                  Case {caseId.slice(0, 8)}
                </p>
              )}
            </div>
          </div>
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel Request
            </Button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="font-semibold text-lg">Something went wrong</h3>
              <p className="text-muted-foreground mt-1">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  loadData()
                }}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {requestCase && !loading && !error && (
          <>
            {/* Status Timeline */}
            {requestCase.status !== "DRAFT" &&
              requestCase.status !== "CLOSED_CANCELLED" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center overflow-x-auto pb-2">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex
                        const isCurrent = idx === currentStepIndex
                        return (
                          <div key={step} className="flex items-center">
                            <div className="flex flex-col items-center min-w-[90px]">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/30 text-muted-foreground/50"
                                } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </div>
                              <span
                                className={`text-xs mt-1 text-center whitespace-nowrap ${
                                  isCurrent
                                    ? "font-semibold text-foreground"
                                    : isCompleted
                                      ? "text-muted-foreground"
                                      : "text-muted-foreground/50"
                                }`}
                              >
                                {STEP_LABELS[step]}
                              </span>
                            </div>
                            {idx < TIMELINE_STEPS.length - 1 && (
                              <div
                                className={`h-0.5 w-6 sm:w-10 ${
                                  idx < currentStepIndex
                                    ? "bg-primary"
                                    : "bg-muted-foreground/20"
                                }`}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Case Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Case Information
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[requestCase.status] ?? ""}
                  >
                    {requestCase.status.replace(/_/g, " ")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Market ZIP</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {requestCase.marketZip}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Radius</p>
                    <p className="font-medium">{requestCase.radiusMiles} miles</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(requestCase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {requestCase.submittedAt && (
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {new Date(requestCase.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Request Items */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Requested Vehicles ({requestCase.items?.length ?? 0})
              </h2>
              {requestCase.items?.map((item, idx) => (
                <Card key={item.id ?? idx}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      {item.make}
                      {item.model ? ` ${item.model}` : ""}
                      {item.trim ? ` ${item.trim}` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{item.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Condition</p>
                        <p className="font-medium">{item.condition}</p>
                      </div>
                      {(item.yearMin || item.yearMax) && (
                        <div>
                          <p className="text-muted-foreground">Year Range</p>
                          <p className="font-medium">
                            {item.yearMin ?? "Any"} – {item.yearMax ?? "Any"}
                          </p>
                        </div>
                      )}
                      {item.budgetTargetCents != null && item.budgetTargetCents > 0 && !item.maxTotalOtdBudgetCents && !item.maxMonthlyPaymentCents && (
                        <div>
                          <p className="text-muted-foreground">
                            Legacy Budget ({item.budgetType === "MONTHLY" ? "Monthly" : "Total"})
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {(item.budgetTargetCents / 100).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Budget Type</p>
                        <p className="font-medium">
                          {item.budgetType === "TOTAL_PRICE" ? "Total Out-the-Door" :
                           item.budgetType === "MONTHLY_PAYMENT" ? "Monthly Payment" :
                           item.budgetType === "MONTHLY" ? "Monthly" : "Total Price"}
                        </p>
                      </div>
                      {item.maxTotalOtdBudgetCents != null && (
                        <div>
                          <p className="text-muted-foreground">Total OTD Budget</p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {(item.maxTotalOtdBudgetCents / 100).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {item.maxMonthlyPaymentCents != null && (
                        <div>
                          <p className="text-muted-foreground">Max Monthly Payment</p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {(item.maxMonthlyPaymentCents / 100).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {item.desiredDownPaymentCents != null && (
                        <div>
                          <p className="text-muted-foreground">Desired Down Payment</p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {(item.desiredDownPaymentCents / 100).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {item.mileageMax != null && (
                        <div>
                          <p className="text-muted-foreground">Max Mileage</p>
                          <p className="font-medium">
                            {item.mileageMax.toLocaleString()} mi
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Delivery</p>
                        <p className="font-medium">{item.distancePreference}</p>
                      </div>
                      {item.maxDistanceMiles != null && (
                        <div>
                          <p className="text-muted-foreground">Max Distance</p>
                          <p className="font-medium">{item.maxDistanceMiles} mi</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium">
                          {TIMELINE_LABELS[item.timeline] ?? item.timeline}
                        </p>
                      </div>
                      {item.openToSimilar && (
                        <div>
                          <p className="text-muted-foreground">Similar</p>
                          <Badge variant="secondary" className="mt-0.5">
                            Open to similar
                          </Badge>
                        </div>
                      )}
                      {item.vin && (
                        <div>
                          <p className="text-muted-foreground">VIN</p>
                          <p className="font-medium font-mono text-xs">{item.vin}</p>
                        </div>
                      )}
                    </div>
                    {item.mustHaveFeatures?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-1">
                          Must-Have Features
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.mustHaveFeatures.map((f) => (
                            <Badge key={f} variant="outline">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.colors?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-1">
                          Preferred Colors
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.colors.map((c) => (
                            <Badge key={c} variant="secondary">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{item.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Offers Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Offers</h2>
              {showOffers && offers.length > 0 ? (
                <div className="grid gap-4">
                  {offers.map((offer) => {
                    const vehicleInfo = [offer.year, offer.make, offer.modelName, offer.trim]
                      .filter(Boolean)
                      .join(" ")
                    const askCents = offer.pricingBreakdownJson?.cashOtdCents ?? 0
                    return (
                    <Card key={offer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="font-semibold">{vehicleInfo || "Vehicle"}</p>
                            {offer.sourceDealerName && (
                              <p className="text-sm text-muted-foreground">
                                {offer.sourceDealerName}
                              </p>
                            )}
                            {askCents > 0 && (
                              <p className="text-2xl font-bold text-[#7ED321]">
                                ${(askCents / 100).toLocaleString()}
                              </p>
                            )}
                            {offer.expiresAt && (
                              <p className="text-xs text-muted-foreground">
                                Expires:{" "}
                                {new Date(offer.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={
                              acceptingOffer === offer.id ||
                              offer.status === "ACCEPTED"
                            }
                          >
                            {acceptingOffer === offer.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {offer.status === "ACCEPTED"
                              ? "Accepted"
                              : "Accept Offer"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold">
                      {requestCase.status === "CLOSED_CANCELLED"
                        ? "Request was cancelled"
                        : "We&apos;re sourcing offers for you"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      {requestCase.status === "CLOSED_CANCELLED"
                        ? "This request has been cancelled and is no longer active."
                        : "Our dealer network is reviewing your request. You&apos;ll see offers here once they&apos;re available."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
