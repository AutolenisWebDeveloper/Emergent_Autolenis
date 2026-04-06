"use client"

import { use, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Car,
  Users,
  DollarSign,
  FileText,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Truck,
  Calendar,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SELECTED: { label: "Selected", variant: "secondary" },
  FINANCING_PENDING: { label: "Financing Pending", variant: "secondary" },
  FINANCING_APPROVED: { label: "Financing Approved", variant: "default" },
  FEE_PENDING: { label: "Fee Pending", variant: "secondary" },
  FEE_PAID: { label: "Fee Paid", variant: "default" },
  INSURANCE_PENDING: { label: "Insurance Pending", variant: "secondary" },
  INSURANCE_COMPLETE: { label: "Insurance Complete", variant: "default" },
  CONTRACT_PENDING: { label: "Contract Pending", variant: "secondary" },
  CONTRACT_REVIEW: { label: "Contract Review", variant: "secondary" },
  CONTRACT_APPROVED: { label: "Contract Approved", variant: "default" },
  SIGNING_PENDING: { label: "Signing Pending", variant: "secondary" },
  SIGNED: { label: "Signed", variant: "default" },
  PICKUP_SCHEDULED: { label: "Pickup Scheduled", variant: "default" },
  COMPLETE: { label: "Complete", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

function formatCents(cents: number | null | undefined): string {
  if (!cents) return "—"
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
}

export default function DealerDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR(`/api/dealer/deals/${dealId}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dealer-deal-detail-loading">
        <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className="space-y-6" data-testid="dealer-deal-detail-error">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/dealer/deals">Deals</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{dealId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Deal not found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {data?.error || "This deal may have been removed or you may not have access."}
            </p>
            <Button variant="outline" onClick={() => router.push("/dealer/deals")} data-testid="back-to-deals-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deal = data.data || data.deal || {}
  const status = String(deal.status || "").toUpperCase()
  const statusConfig = STATUS_CONFIG[status] || { label: deal.status || "Unknown", variant: "outline" as const }

  const vehicle = deal.vehicle || [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel, deal.vehicleTrim].filter(Boolean).join(" ") || "—"
  const buyerName = deal.buyerName || [deal.buyerFirstName, deal.buyerLastName].filter(Boolean).join(" ") || "—"

  return (
    <div className="space-y-6" data-testid="dealer-deal-detail-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/deals">Deals</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{dealId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vehicle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deal #{dealId.slice(0, 8)}</p>
        </div>
        <Badge variant={statusConfig.variant} className="text-sm px-3 py-1" data-testid="deal-status-badge">{statusConfig.label}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicle Info */}
        <Card data-testid="deal-vehicle-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle</span>
              <span className="font-medium">{vehicle}</span>
            </div>
            {deal.vin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">VIN</span>
                <span className="font-mono text-xs">{deal.vin}</span>
              </div>
            )}
            {deal.stockNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock #</span>
                <span>{deal.stockNumber}</span>
              </div>
            )}
            {deal.mileage && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mileage</span>
                <span>{Number(deal.mileage).toLocaleString()} mi</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer Info */}
        <Card data-testid="deal-buyer-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Buyer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer</span>
              <span className="font-medium">{buyerName}</span>
            </div>
            {deal.buyerEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate ml-4">{deal.buyerEmail}</span>
              </div>
            )}
            {deal.buyerPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{deal.buyerPhone}</span>
              </div>
            )}
            {deal.buyerLocation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span>{deal.buyerLocation}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card data-testid="deal-financials-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Price</span>
              <span className="font-medium">{formatCents(deal.priceCents || deal.amount)}</span>
            </div>
            {deal.taxesCents && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes & Fees</span>
                <span>{formatCents(deal.taxesCents)}</span>
              </div>
            )}
            {deal.conciergeFeeCents && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concierge Fee</span>
                <span>{formatCents(deal.conciergeFeeCents)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-base">{formatCents(deal.otdPriceCents || deal.priceCents || deal.amount)}</span>
            </div>
            {deal.financingType && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Payment Method</span>
                <Badge variant="outline">{deal.financingType}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card data-testid="deal-timeline-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {deal.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deal Created</span>
                <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {deal.updatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(deal.updatedAt).toLocaleDateString()}</span>
              </div>
            )}
            {deal.signedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signed</span>
                <span>{new Date(deal.signedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card data-testid="deal-actions-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start" asChild data-testid="view-contract-btn">
              <Link href={`/dealer/contracts/${dealId}`}><Shield className="h-4 w-4 mr-2" /> Contract Shield</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild data-testid="view-documents-btn">
              <Link href="/dealer/documents"><FileText className="h-4 w-4 mr-2" /> Documents</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild data-testid="message-buyer-btn">
              <Link href="/dealer/messages"><MessageSquare className="h-4 w-4 mr-2" /> Message Buyer</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild data-testid="view-pickup-btn">
              <Link href="/dealer/pickups"><Truck className="h-4 w-4 mr-2" /> Pickup</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={() => router.push("/dealer/deals")} data-testid="back-to-deals-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals
        </Button>
      </div>
    </div>
  )
}
