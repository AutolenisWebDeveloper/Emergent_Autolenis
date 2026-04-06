"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Car,
  Users,
  DollarSign,
  Building2,
  Clock,
  AlertCircle,
  Shield,
  FileText,
  CreditCard,
  Truck,
  RefreshCcw,
  MessageSquare,
  ExternalLink,
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

function fmt(cents: number | null | undefined): string {
  if (!cents) return "—"
  return `$${(Number(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
}

export default function AdminDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)
  const router = useRouter()
  const { data, error, isLoading } = useSWR(`/api/admin/deals/${dealId}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="admin-deal-detail-loading">
        <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !(data?.success || data?.deal)) {
    return (
      <div className="space-y-6" data-testid="admin-deal-detail-error">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{dealId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Deal not found</h2>
            <p className="text-sm text-muted-foreground mb-4">{data?.error || "This deal may not exist or may have been archived."}</p>
            <Button variant="outline" onClick={() => router.push("/admin/deals")} data-testid="back-to-deals-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deal = data.deal || data.data || {}
  const status = String(deal.status || "").toUpperCase()
  const statusConfig = STATUS_CONFIG[status] || { label: deal.status || "Unknown", variant: "outline" as const }
  const vehicle = deal.vehicle || [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel, deal.vehicleTrim].filter(Boolean).join(" ") || "—"
  const buyerName = deal.buyerName || [deal.buyerFirstName, deal.buyerLastName].filter(Boolean).join(" ") || "—"
  const dealerName = deal.dealerName || deal.dealer?.businessName || "—"

  return (
    <div className="space-y-6" data-testid="admin-deal-detail-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink></BreadcrumbItem>
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

      <div className="grid gap-4 md:grid-cols-3">
        {/* Vehicle */}
        <Card data-testid="deal-vehicle-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium text-right">{vehicle}</span></div>
            {deal.vin && <div className="flex justify-between"><span className="text-muted-foreground">VIN</span><span className="font-mono text-xs">{deal.vin}</span></div>}
            {deal.stockNumber && <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span>{deal.stockNumber}</span></div>}
          </CardContent>
        </Card>

        {/* Buyer */}
        <Card data-testid="deal-buyer-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Buyer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{buyerName}</span></div>
            {deal.buyerEmail && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate ml-2">{deal.buyerEmail}</span></div>}
            {deal.buyerId && (
              <Button variant="link" size="sm" className="p-0 h-auto" asChild data-testid="view-buyer-link">
                <Link href={`/admin/buyers/${deal.buyerId}`}>View Buyer Profile <ExternalLink className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Dealer */}
        <Card data-testid="deal-dealer-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Dealer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Dealer</span><span className="font-medium">{dealerName}</span></div>
            {deal.dealerCity && <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{[deal.dealerCity, deal.dealerState].filter(Boolean).join(", ")}</span></div>}
            {deal.dealerId && (
              <Button variant="link" size="sm" className="p-0 h-auto" asChild data-testid="view-dealer-link">
                <Link href={`/admin/dealers/${deal.dealerId}`}>View Dealer Profile <ExternalLink className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial */}
      <Card data-testid="deal-financials-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Vehicle Price</span><span className="font-medium">{fmt(deal.priceCents || deal.amount)}</span></div>
            {deal.taxesCents && <div className="flex justify-between"><span className="text-muted-foreground">Taxes & Fees</span><span>{fmt(deal.taxesCents)}</span></div>}
            {deal.conciergeFeeCents && <div className="flex justify-between"><span className="text-muted-foreground">Concierge Fee</span><span>{fmt(deal.conciergeFeeCents)}</span></div>}
            {deal.depositCents && <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>{fmt(deal.depositCents)}</span></div>}
            <Separator />
            <div className="flex justify-between"><span className="font-semibold">Out-the-Door</span><span className="font-bold text-base">{fmt(deal.otdPriceCents || deal.priceCents || deal.amount)}</span></div>
            {deal.financingType && <div className="flex justify-between pt-2 border-t"><span className="text-muted-foreground">Financing</span><Badge variant="outline">{deal.financingType}</Badge></div>}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card data-testid="deal-timeline-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {deal.createdAt && <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(deal.createdAt).toLocaleDateString()}</p></div>}
            {deal.updatedAt && <div><p className="text-muted-foreground">Updated</p><p className="font-medium">{new Date(deal.updatedAt).toLocaleDateString()}</p></div>}
            {deal.signedAt && <div><p className="text-muted-foreground">Signed</p><p className="font-medium">{new Date(deal.signedAt).toLocaleDateString()}</p></div>}
            {deal.completedAt && <div><p className="text-muted-foreground">Completed</p><p className="font-medium">{new Date(deal.completedAt).toLocaleDateString()}</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card data-testid="deal-admin-actions-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button variant="outline" size="sm" className="justify-start" asChild data-testid="admin-contracts-btn">
              <Link href="/admin/contracts"><Shield className="h-4 w-4 mr-2" /> Contracts</Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild data-testid="admin-documents-btn">
              <Link href="/admin/documents"><FileText className="h-4 w-4 mr-2" /> Documents</Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild data-testid="admin-payments-btn">
              <Link href="/admin/payments"><CreditCard className="h-4 w-4 mr-2" /> Payments</Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild data-testid="admin-refunds-btn">
              <Link href="/admin/refunds"><RefreshCcw className="h-4 w-4 mr-2" /> Refunds</Link>
            </Button>
            <Button variant="outline" size="sm" className="justify-start" asChild data-testid="admin-messages-btn">
              <Link href="/admin/messages-monitoring"><MessageSquare className="h-4 w-4 mr-2" /> Messages</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={() => router.push("/admin/deals")} data-testid="back-to-deals-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals
        </Button>
      </div>
    </div>
  )
}
