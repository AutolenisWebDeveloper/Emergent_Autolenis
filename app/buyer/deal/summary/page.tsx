"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Car,
  Building2,
  DollarSign,
  FileText,
  ShieldCheck,
  CreditCard,
  PenLine,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Receipt,
} from "lucide-react"

interface DealSummary {
  id: string
  status: string
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleTrim: string | null
  vin: string | null
  mileage: number | null
  exteriorColor: string | null
  dealerName: string | null
  dealerCity: string | null
  dealerState: string | null
  priceCents: number | null
  otdPriceCents: number | null
  taxesCents: number | null
  conciergeFeeCents: number | null
  depositCents: number | null
  financingType: string | null
  insuranceStatus: string | null
  contractStatus: string | null
  esignStatus: string | null
  pickupStatus: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; step: number }> = {
  SELECTED: { label: "Offer Selected", variant: "secondary", step: 1 },
  FINANCING_PENDING: { label: "Financing Pending", variant: "secondary", step: 2 },
  FINANCING_APPROVED: { label: "Financing Approved", variant: "default", step: 2 },
  FEE_PENDING: { label: "Fee Pending", variant: "secondary", step: 3 },
  FEE_PAID: { label: "Fee Paid", variant: "default", step: 3 },
  INSURANCE_PENDING: { label: "Insurance Needed", variant: "secondary", step: 4 },
  INSURANCE_COMPLETE: { label: "Insurance Verified", variant: "default", step: 4 },
  CONTRACT_PENDING: { label: "Contract Pending", variant: "secondary", step: 5 },
  CONTRACT_REVIEW: { label: "Under Review", variant: "secondary", step: 5 },
  CONTRACT_APPROVED: { label: "Contract Ready", variant: "default", step: 5 },
  SIGNING_PENDING: { label: "Awaiting Signature", variant: "secondary", step: 6 },
  SIGNED: { label: "Signed", variant: "default", step: 6 },
  PICKUP_SCHEDULED: { label: "Pickup Scheduled", variant: "default", step: 7 },
  COMPLETE: { label: "Complete", variant: "default", step: 8 },
}

const DEAL_STEPS = [
  { key: "financing", label: "Financing", icon: Banknote, href: "/buyer/deal/financing" },
  { key: "fee", label: "Concierge Fee", icon: Receipt, href: "/buyer/deal/fee" },
  { key: "insurance", label: "Insurance", icon: ShieldCheck, href: "/buyer/deal/insurance" },
  { key: "contract", label: "Contract Shield", icon: FileText, href: "/buyer/deal/contract" },
  { key: "esign", label: "E-Sign", icon: PenLine, href: "/buyer/deal/esign" },
  { key: "pickup", label: "Pickup & QR", icon: Truck, href: "/buyer/deal/pickup" },
]

function formatCents(cents: number | null): string {
  if (!cents) return "$0"
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function DealSummaryPage() {
  const router = useRouter()
  const [deal, setDeal] = useState<DealSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/deal")
      const data = await res.json()
      if (data.success && data.data?.deal) {
        const d = data.data.deal
        setDeal({
          id: d.id,
          status: d.status || "SELECTED",
          vehicleYear: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.year || d.sourcedDealContext?.vehicle?.year || null,
          vehicleMake: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.make || d.sourcedDealContext?.vehicle?.make || null,
          vehicleModel: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.model || d.sourcedDealContext?.vehicle?.model || null,
          vehicleTrim: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.trim || d.sourcedDealContext?.vehicle?.trim || null,
          vin: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.vin || d.sourcedDealContext?.vehicle?.vin || null,
          mileage: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.mileage || null,
          exteriorColor: d.auctionOffer?.auction?.shortlist?.items?.[0]?.inventoryItem?.exteriorColor || null,
          dealerName: d.auctionOffer?.dealer?.businessName || d.sourcedDealContext?.dealerName || null,
          dealerCity: d.auctionOffer?.dealer?.city || null,
          dealerState: d.auctionOffer?.dealer?.state || null,
          priceCents: d.auctionOffer?.priceCents || d.cashOtd || null,
          otdPriceCents: d.otdPrice || d.cashOtd || null,
          taxesCents: d.auctionOffer?.taxAmount || null,
          conciergeFeeCents: d.conciergeFee || null,
          depositCents: d.depositAmount || null,
          financingType: d.financingType || d.paymentType || null,
          insuranceStatus: d.insurancePolicy?.status || null,
          contractStatus: d.contractDocument?.status || null,
          esignStatus: d.esignEnvelope?.status || null,
          pickupStatus: d.pickupAppointment?.status || null,
          createdAt: d.createdAt || new Date().toISOString(),
        })
      } else {
        setError("NO_DEAL")
      }
    } catch {
      setError("LOAD_FAILED")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDeal() }, [fetchDeal])

  const currentStep = useMemo(() => {
    if (!deal) return 0
    return STATUS_CONFIG[deal.status.toUpperCase()]?.step || 1
  }, [deal])

  if (loading) {
    return (
      <div className="space-y-6" data-testid="deal-summary-loading">
        <div className="h-8 w-48 bg-muted/50 animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted/40 animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
        <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        <div className="h-24 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    )
  }

  if (error === "NO_DEAL" || !deal) {
    return (
      <div className="space-y-6" data-testid="deal-summary-empty">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your active vehicle purchase.</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No active deal</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              You don&apos;t have an active deal yet. Browse vehicles, get pre-qualified, and select an offer from a dealer to start your deal.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/buyer/search")} data-testid="browse-vehicles-btn">Browse Vehicles</Button>
              <Button onClick={() => router.push("/buyer/prequal")} data-testid="get-prequalified-btn">Get Pre-Qualified</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "LOAD_FAILED") {
    return (
      <div className="space-y-6" data-testid="deal-summary-error">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Summary</h1>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <h3 className="font-semibold text-lg mb-1">Failed to load deal</h3>
            <p className="text-sm text-muted-foreground mb-4">Please try again or contact support.</p>
            <Button variant="outline" onClick={fetchDeal} data-testid="retry-btn">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vehicle = [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel, deal.vehicleTrim].filter(Boolean).join(" ")
  const statusKey = deal.status.toUpperCase()
  const statusInfo = STATUS_CONFIG[statusKey] || { label: deal.status, variant: "secondary" as const, step: 1 }

  return (
    <div className="space-y-6" data-testid="deal-summary-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">Deal #{deal.id.slice(0, 8)} &middot; Started {new Date(deal.createdAt).toLocaleDateString()}</p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1" data-testid="deal-status-badge">{statusInfo.label}</Badge>
      </div>

      {/* Progress Steps */}
      <Card data-testid="deal-progress-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deal Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {DEAL_STEPS.map((step, idx) => {
              const stepNum = idx + 2
              const isComplete = currentStep > stepNum
              const isCurrent = currentStep === stepNum
              const StepIcon = step.icon
              return (
                <button
                  key={step.key}
                  onClick={() => router.push(step.href)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-w-0 ${
                    isCurrent
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : isComplete
                        ? "text-muted-foreground hover:bg-accent"
                        : "text-muted-foreground/50 hover:bg-accent/50"
                  }`}
                  data-testid={`deal-step-${step.key}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <StepIcon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{step.label}</span>
                  {idx < DEAL_STEPS.length - 1 && <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/30 ml-1" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicle Card */}
        <Card data-testid="deal-vehicle-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" /> Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p className="font-medium text-base">{vehicle || "N/A"}</p>
            </div>
            {deal.vin && (
              <div>
                <p className="text-muted-foreground">VIN</p>
                <p className="font-mono text-xs">{deal.vin}</p>
              </div>
            )}
            <div className="flex gap-6">
              {deal.mileage && (
                <div>
                  <p className="text-muted-foreground">Mileage</p>
                  <p className="font-medium">{deal.mileage.toLocaleString()} mi</p>
                </div>
              )}
              {deal.exteriorColor && (
                <div>
                  <p className="text-muted-foreground">Color</p>
                  <p className="font-medium">{deal.exteriorColor}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dealer Card */}
        <Card data-testid="deal-dealer-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Dealer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Dealership</p>
              <p className="font-medium text-base">{deal.dealerName || "N/A"}</p>
            </div>
            {(deal.dealerCity || deal.dealerState) && (
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{[deal.dealerCity, deal.dealerState].filter(Boolean).join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card data-testid="deal-financials-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vehicle Price</span>
              <span className="font-medium">{formatCents(deal.priceCents)}</span>
            </div>
            {deal.taxesCents && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes & Fees</span>
                <span className="font-medium">{formatCents(deal.taxesCents)}</span>
              </div>
            )}
            {deal.conciergeFeeCents && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Concierge Fee</span>
                <span className="font-medium">{formatCents(deal.conciergeFeeCents)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Out-the-Door Price</span>
              <span className="font-bold text-lg">{formatCents(deal.otdPriceCents || deal.priceCents)}</span>
            </div>
            {deal.financingType && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Payment Method</span>
                <Badge variant="outline">{deal.financingType === "CASH" ? "Cash" : deal.financingType === "LOAN" ? "Financing" : deal.financingType}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/2 border-primary/10" data-testid="deal-actions-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold">Continue Your Deal</h3>
              <p className="text-sm text-muted-foreground">Proceed to the next step in your vehicle purchase.</p>
            </div>
            <Button onClick={() => router.push("/buyer/deal")} className="w-full sm:w-auto" data-testid="continue-deal-btn">
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
