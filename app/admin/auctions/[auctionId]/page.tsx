"use client"

import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Gavel, Users, DollarSign, Clock, FileText } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) return res.json().then((body: any) => Promise.reject(body))
    return res.json()
  })

const statusColors: Record<string, string> = {
  PENDING_DEPOSIT: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  CLOSED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export default function AdminAuctionDetailPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { auctionId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/auctions/${auctionId}`, fetcher)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/auctions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data?.auction) {
    const errorMessage = error?.error || "Auction Not Found"
    const correlationId = error?.correlationId || data?.correlationId
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/auctions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{errorMessage}</h1>
            {correlationId && (
              <p className="text-sm text-muted-foreground mt-1">Reference: {correlationId}</p>
            )}
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">The auction could not be loaded. It may have been removed or you may not have access.</p>
            <Button variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const auction = data.auction

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/auctions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Auction #{auction.id.slice(0, 8)}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[auction.status] || "bg-muted text-gray-800"}`}>
              {auction.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created {formatDate(auction.createdAt)}
            {auction.endsAt && ` · Ends ${formatDate(auction.endsAt)}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{auction.offers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Offers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{auction.participants?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Dealers Invited</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{auction.shortlistItems?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Shortlisted Vehicles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{auction.status}</p>
                <p className="text-sm text-muted-foreground">Current Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buyer Info */}
      {auction.buyer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buyer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{auction.buyer.firstName} {auction.buyer.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{auction.buyer.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{auction.buyer.phone || "—"}</p>
              </div>
              {auction.buyer.location && (
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{auction.buyer.location}</p>
                </div>
              )}
              {auction.buyer.creditScore && (
                <div>
                  <p className="text-sm text-muted-foreground">Credit Score</p>
                  <p className="font-medium">{auction.buyer.creditScore}</p>
                </div>
              )}
              {auction.buyer.prequalStatus && (
                <div>
                  <p className="text-sm text-muted-foreground">Prequal Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    auction.buyer.prequalStatus === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {auction.buyer.prequalStatus}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shortlisted Vehicles */}
      {auction.shortlistItems && auction.shortlistItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shortlisted Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inventory ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auction.shortlistItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-accent">
                    <td className="px-6 py-4 text-sm text-foreground">
                      {item.vehicle
                        ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model} ${item.vehicle.trim || ""}`.trim()
                        : "Vehicle info unavailable"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                      {item.inventoryItemId.slice(0, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Participants / Invited Dealers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invited Dealers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auction.participants && auction.participants.length > 0 ? (
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dealer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Invited</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Viewed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auction.participants.map((p: any) => (
                  <tr key={p.id} className="hover:bg-accent">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{p.dealerName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(p.invitedAt)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{p.viewedAt ? formatDate(p.viewedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-8 text-center text-muted-foreground">No dealers have been invited yet</div>
          )}
        </CardContent>
      </Card>

      {/* Offers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Offers Received</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auction.offers && auction.offers.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dealer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Bid Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auction.offers.map((offer: any) => {
                    const isSelected = auction.selectedOffer?.offerId === offer.id
                    return (
                      <tr key={offer.id} className={`hover:bg-accent ${isSelected ? "bg-green-50" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-foreground">
                            {offer.dealerName}
                            {isSelected && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Selected
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {offer.bidPriceCents != null
                            ? formatCurrency(offer.bidPriceCents)
                            : offer.cashOtd != null
                              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(offer.cashOtd)
                              : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {offer.feesCents != null
                            ? formatCurrency(offer.feesCents)
                            : offer.taxAmount != null
                              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(offer.taxAmount)
                              : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {offer.submittedAt ? formatDate(offer.submittedAt) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-muted-foreground">No offers submitted yet</div>
          )}
        </CardContent>
      </Card>

      {/* Related Deal */}
      {auction.deal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Related Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deal ID</p>
                <p className="font-mono text-sm">{auction.deal.id.slice(0, 12)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  auction.deal.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {auction.deal.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(auction.deal.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
