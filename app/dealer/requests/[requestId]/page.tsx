"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Send,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Car,
  AlertCircle,
  Clock,
  Palette,
  Gauge,
  Star,
  FileText,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "Open", variant: "default" },
  IN_REVIEW: { label: "In Review", variant: "secondary" },
  MATCHED: { label: "Matched", variant: "default" },
  AUCTION_CREATED: { label: "Auction Created", variant: "default" },
  FULFILLED: { label: "Fulfilled", variant: "default" },
  CLOSED: { label: "Closed", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

export default function DealerRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params)
  const router = useRouter()
  const { data, error, isLoading } = useSWR(`/api/dealer/requests/${requestId}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dealer-request-detail-loading">
        <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error || !(data?.success || data?.data)) {
    return (
      <div className="space-y-6" data-testid="dealer-request-detail-error">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="/dealer/requests">Requests</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{requestId.slice(0, 8)}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Request not found</h2>
            <p className="text-sm text-muted-foreground mb-4">This buyer request may have been closed or is no longer available to your dealership.</p>
            <Button variant="outline" onClick={() => router.push("/dealer/requests")} data-testid="back-to-requests-btn">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const request = data.data || data
  const vehicle = request.vehicle || [request.year, request.make, request.model, request.trim].filter(Boolean).join(" ") || "Vehicle Request"
  const status = String(request.status || "OPEN").toUpperCase()
  const statusConfig = STATUS_CONFIG[status] || { label: request.status || "Open", variant: "outline" as const }

  return (
    <div className="space-y-6" data-testid="dealer-request-detail-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dealer/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/dealer/requests">Requests</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{vehicle}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vehicle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Request #{requestId.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusConfig.variant} className="text-sm px-3 py-1" data-testid="request-status-badge">{statusConfig.label}</Badge>
          {request.matchScore && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="match-score-badge">
              <Star className="h-3 w-3 mr-1" /> {request.matchScore}% Match
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Vehicle Preferences */}
        <Card className="md:col-span-2" data-testid="request-vehicle-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Vehicle Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium">{vehicle}</p>
              </div>
              {request.budget && (
                <div>
                  <p className="text-muted-foreground">Max Budget</p>
                  <p className="font-medium flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{Number(request.budget).toLocaleString()}</p>
                </div>
              )}
              {request.location && (
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{request.location}</p>
                </div>
              )}
              {request.distance && (
                <div>
                  <p className="text-muted-foreground">Max Distance</p>
                  <p className="font-medium">{request.distance}</p>
                </div>
              )}
              {request.competingOffers !== undefined && (
                <div>
                  <p className="text-muted-foreground">Competing Offers</p>
                  <p className="font-medium flex items-center gap-1"><Users className="h-3.5 w-3.5" />{request.competingOffers || 0}</p>
                </div>
              )}
              {request.createdAt && (
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trade-In */}
        <Card data-testid="request-tradein-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Trade-In</CardTitle>
          </CardHeader>
          <CardContent>
            {request.tradeIn || request.tradeInDetails ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">
                  {request.tradeInDetails?.year} {request.tradeInDetails?.make} {request.tradeInDetails?.model}
                </p>
                {request.tradeInDetails?.mileage && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="h-3.5 w-3.5" /> {Number(request.tradeInDetails.mileage).toLocaleString()} mi
                  </div>
                )}
                {request.tradeInDetails?.condition && (
                  <p className="text-muted-foreground">Condition: {request.tradeInDetails.condition}</p>
                )}
                {request.tradeInDetails?.estimatedValue && (
                  <p className="font-semibold mt-2 text-green-600">Est. Value: ${Number(request.tradeInDetails.estimatedValue).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <Car className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No trade-in</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buyer Profile Preferences */}
      {request.buyerProfile?.preferences && (
        <Card data-testid="request-preferences-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Buyer Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-2 flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Preferred Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {request.buyerProfile.preferences.color?.length > 0
                    ? request.buyerProfile.preferences.color.map((c: string) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)
                    : <span className="text-muted-foreground/60">None specified</span>}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Required Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {request.buyerProfile.preferences.features?.length > 0
                    ? request.buyerProfile.preferences.features.map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)
                    : <span className="text-muted-foreground/60">None specified</span>}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Timeline</p>
                <p className="font-medium">{request.buyerProfile.timeline || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyer Info */}
      <Card data-testid="request-buyer-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Buyer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{request.buyerName || "—"}</p>
            </div>
            {request.buyerCity && (
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{request.buyerCity}</p>
              </div>
            )}
            {request.prequalStatus && (
              <div>
                <p className="text-muted-foreground">Pre-Qualification</p>
                <Badge variant={request.prequalStatus === "APPROVED" ? "default" : "secondary"}>{request.prequalStatus}</Badge>
              </div>
            )}
            {request.budgetRange && (
              <div>
                <p className="text-muted-foreground">Budget Range</p>
                <p className="font-medium">{request.budgetRange}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <Button variant="ghost" onClick={() => router.push("/dealer/requests")} data-testid="back-to-requests-btn">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requests
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="message-buyer-btn">
            <Link href="/dealer/messages"><MessageSquare className="h-4 w-4 mr-2" /> Message Buyer</Link>
          </Button>
          <Button asChild data-testid="submit-offer-btn">
            <Link href="/dealer/offers/new"><Send className="h-4 w-4 mr-2" /> Submit Offer</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
