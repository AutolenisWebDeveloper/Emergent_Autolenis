"use client"

import { use, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, Package, Gavel, FileText, Shield, BarChart3, CreditCard, Clock, Settings, FileSignature } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"
import { DealerAgreementTimeline } from "@/components/admin/dealer-agreement-timeline"
import { DealerAgreementActions } from "@/components/admin/dealer-agreement-actions"
import { InventoryStatus } from "@/lib/constants/statuses"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) return res.json().then((body: any) => Promise.reject(body))
  return res.json()
})

export default function AdminDealerDetailPage({ params }: { params: Promise<{ dealerId: string }> }) {
  const { dealerId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/dealers/${dealerId}`, fetcher)
  const [suspendConfirm, setSuspendConfirm] = useState(false)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleApprove = async () => {
    await fetch(`/api/admin/dealers/${dealerId}/approve`, { method: "POST", headers: csrfHeaders() })
    mutate()
  }

  const handleSuspend = async () => {
    await fetch(`/api/admin/dealers/${dealerId}/suspend`, { method: "POST", headers: csrfHeaders() })
    mutate()
    setSuspendConfirm(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dealers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (error || !data?.dealer) {
    const errorMessage = error?.error || "Dealer Not Found"
    const correlationId = error?.correlationId || data?.correlationId
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dealers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{errorMessage}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {correlationId && `Reference: ${correlationId}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const dealer = data.dealer

  return (
    <div className="space-y-6" data-testid="admin-dealer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dealers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{dealer.name || dealer.businessName}</h1>
            <p className="text-muted-foreground">
              {dealer.city}, {dealer.state}
            </p>
          </div>
          <span
            className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
              dealer.verified && dealer.active
                ? "bg-green-100 text-green-800"
                : !dealer.verified
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {dealer.verified && dealer.active ? "Approved" : !dealer.verified ? "Pending" : "Suspended"}
          </span>
        </div>
        <div className="flex gap-2">
          {!dealer.verified && (
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve Dealer
            </Button>
          )}
          {dealer.active ? (
            <Button
              onClick={handleSuspend}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
            >
              Suspend Dealer
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
            >
              Reinstate Dealer
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Inventory</p>
                <p className="text-lg font-semibold">{dealer._count?.inventoryItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-[#00D9FF]" />
              <div>
                <p className="text-sm text-muted-foreground">Offers Made</p>
                <p className="text-lg font-semibold">{dealer._count?.offers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-[#7ED321]" />
              <div>
                <p className="text-sm text-muted-foreground">Deals Won</p>
                <p className="text-lg font-semibold">{dealer._count?.selectedDeals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Integrity Score</p>
                <p className="text-lg font-semibold">{dealer.integrityScore || 100}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="auctions-offers">Auctions &amp; Offers</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="performance">Win Rate / Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payments">Payments / Fees</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="agreement"><FileSignature className="mr-1 h-3 w-3 inline" />Agreement</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dealer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-foreground mb-4">Business Details</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Business Name</dt>
                      <dd className="font-medium">{dealer.businessName || dealer.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Legal Name</dt>
                      <dd className="font-medium">{dealer.legalName || dealer.legal_name || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">License Number</dt>
                      <dd className="font-medium">{dealer.licenseNumber || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="font-medium">{dealer.email || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Phone</dt>
                      <dd className="font-medium">{dealer.phone || "-"}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-4">Location</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Address</dt>
                      <dd className="font-medium">
                        {dealer.address || "-"}
                        {dealer.address_line2 && `, ${dealer.address_line2}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">City</dt>
                      <dd className="font-medium">{dealer.city || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">State</dt>
                      <dd className="font-medium">{dealer.state || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">ZIP Code</dt>
                      <dd className="font-medium">{dealer.zip || dealer.postalCode || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Member Since</dt>
                      <dd className="font-medium">{formatDate(dealer.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory ({dealer.inventoryItems?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealer.inventoryItems?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Stock #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dealer.inventoryItems.slice(0, 20).map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm">
                            {item.vehicle ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}` : "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">{item.stockNumber || item.stock_number || "-"}</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            ${(item.price || (item.priceCents || 0) / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                item.status === InventoryStatus.AVAILABLE ? "bg-green-100 text-green-800" : "bg-muted text-gray-800"
                              }`}
                            >
                              {item.status || InventoryStatus.AVAILABLE}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No inventory items found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auctions-offers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Auctions &amp; Offers ({dealer.offers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealer.offers?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Auction</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">OTD Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dealer.offers.slice(0, 20).map((offer: any) => (
                        <tr key={offer.id}>
                          <td className="px-4 py-3 text-sm font-mono">{offer.auctionId?.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            ${(offer.cashOtd || (offer.cashOtdCents || 0) / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(offer.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No offers submitted.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Deals Won ({dealer.selectedDeals?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dealer.selectedDeals?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Deal ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">OTD</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dealer.selectedDeals.map((deal: any) => (
                        <tr key={deal.id}>
                          <td className="px-4 py-3 text-sm font-mono">{deal.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-sm">
                            {deal.inventoryItem
                              ? `${deal.inventoryItem.year} ${deal.inventoryItem.make} ${deal.inventoryItem.model}`
                              : "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            ${(deal.cashOtd || (deal.totalOtdAmountCents || 0) / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                deal.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : deal.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/deals/${deal.id}`} className="text-primary hover:underline text-sm">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No deals won yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Integrity Score</span>
                      <span className="text-sm font-medium">{dealer.integrityScore || 100}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${dealer.integrityScore || 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="text-sm font-medium">
                        {dealer._count?.offers > 0
                          ? ((dealer._count.selectedDeals / dealer._count.offers) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            dealer._count?.offers > 0 ? (dealer._count.selectedDeals / dealer._count.offers) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total Offers</dt>
                    <dd className="font-medium">{dealer._count?.offers || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Deals Won</dt>
                    <dd className="font-medium">{dealer._count?.selectedDeals || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Active Inventory</dt>
                    <dd className="font-medium">{dealer._count?.inventoryItems || 0}</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-foreground">Business License</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dealer.licenseNumber ? `License #${dealer.licenseNumber}` : "Not uploaded"}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                        dealer.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {dealer.verified ? "Verified" : "Pending Review"}
                    </span>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-foreground">Dealer Agreement</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dealer.verified ? "Signed and on file" : "Awaiting signature"}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                        dealer.verified ? "bg-green-100 text-green-800" : "bg-muted text-gray-800"
                      }`}
                    >
                      {dealer.verified ? "Complete" : "Pending"}
                    </span>
                  </div>
                </div>
                {dealer.contractDocuments?.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Document</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Uploaded</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dealer.contractDocuments.map((doc: any) => (
                          <tr key={doc.id}>
                            <td className="px-4 py-3 text-sm">{doc.name || doc.fileName || "Document"}</td>
                            <td className="px-4 py-3 text-sm">{doc.type || "General"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                {doc.status || "Uploaded"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No additional documents on file.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payments &amp; Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Deals Value</p>
                  <p className="text-xl font-semibold">
                    ${((dealer.selectedDeals || []).reduce((sum: number, d: any) =>
                      sum + (d.cashOtd || (d.totalOtdAmountCents || 0) / 100), 0
                    )).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Completed Deals</p>
                  <p className="text-xl font-semibold">
                    {(dealer.selectedDeals || []).filter((d: any) => d.status === "COMPLETED").length}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending Deals</p>
                  <p className="text-xl font-semibold">
                    {(dealer.selectedDeals || []).filter((d: any) => d.status !== "COMPLETED" && d.status !== "CANCELLED").length}
                  </p>
                </div>
              </div>
              {dealer.selectedDeals?.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Deal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dealer.selectedDeals.map((deal: any) => (
                        <tr key={deal.id}>
                          <td className="px-4 py-3 text-sm font-mono">{deal.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-sm font-medium">
                            ${(deal.cashOtd || (deal.totalOtdAmountCents || 0) / 100).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                deal.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : deal.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(deal.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No payment records.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-2 border-gray-200 pl-4 space-y-6">
                  {dealer.verified && dealer.active && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500" />
                      <p className="text-sm font-medium text-foreground">Dealer Approved</p>
                      <p className="text-xs text-muted-foreground">Account verified and activated</p>
                    </div>
                  )}
                  {!dealer.active && dealer.verified && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500" />
                      <p className="text-sm font-medium text-foreground">Dealer Suspended</p>
                      <p className="text-xs text-muted-foreground">Account suspended by admin</p>
                    </div>
                  )}
                  {(dealer.offers?.length || 0) > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500" />
                      <p className="text-sm font-medium text-foreground">{dealer.offers.length} Offer(s) Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        Last offer: {formatDate(dealer.offers[0]?.createdAt)}
                      </p>
                    </div>
                  )}
                  {(dealer.selectedDeals?.length || 0) > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500" />
                      <p className="text-sm font-medium text-foreground">{dealer.selectedDeals.length} Deal(s) Won</p>
                      <p className="text-xs text-muted-foreground">
                        Last deal: {formatDate(dealer.selectedDeals[0]?.createdAt)}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-400" />
                    <p className="text-sm font-medium text-foreground">Dealer Registered</p>
                    <p className="text-xs text-muted-foreground">{formatDate(dealer.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agreement">
          <AgreementTab dealerId={dealerId} dealer={data.dealer} onRefresh={() => mutate()} />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dealer Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-foreground">Account Status</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dealer.verified && dealer.active
                        ? "Active — Dealer can participate in auctions and submit offers"
                        : !dealer.verified
                          ? "Pending — Awaiting admin verification"
                          : "Suspended — Dealer access restricted"}
                    </p>
                    <div className="mt-3">
                      {dealer.active ? (
                        <>
                          {!suspendConfirm ? (
                            <Button
                              onClick={() => setSuspendConfirm(true)}
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                              size="sm"
                            >
                              Suspend Dealer
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-red-600">Are you sure?</p>
                              <Button onClick={handleSuspend} size="sm" className="bg-red-600 hover:bg-red-700">
                                Confirm Suspend
                              </Button>
                              <Button onClick={() => setSuspendConfirm(false)} variant="ghost" size="sm">
                                Cancel
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={handleApprove}
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
                          size="sm"
                        >
                          Reactivate Dealer
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-foreground">Verification Status</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dealer.verified ? "Verified" : "Unverified"}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                        dealer.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {dealer.verified ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-foreground">Dealer ID</h4>
                  <p className="text-sm font-mono text-muted-foreground mt-1">{dealer.id}</p>
                </div>
                {dealer.userId && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-foreground">Linked User ID</h4>
                    <p className="text-sm font-mono text-muted-foreground mt-1">{dealer.userId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agreement Tab (admin)
// ---------------------------------------------------------------------------

function AgreementTab({ dealerId, dealer, onRefresh }: {
  dealerId: string
  dealer: Record<string, unknown>
  onRefresh: () => void
}) {
  const { data: agreementData, mutate: mutateAgreement } = useSWR(
    `/api/dealer/onboarding/agreement/status?dealerId=${dealerId}`,
    fetcher,
  )

  const agreement = agreementData?.agreement
  const status = agreementData?.status || "REQUIRED"

  const handleActionComplete = () => {
    mutateAgreement()
    onRefresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Dealer Agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agreement Status</p>
                <p className="font-semibold">{status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agreement Required</p>
                <p>{dealer.agreementRequired ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agreement Completed</p>
                <p>{dealer.agreementCompleted ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">DocuSign Blocked</p>
                <p>{dealer.docusignBlocked ? "Yes — dealer is blocked" : "No"}</p>
              </div>
            </div>

            {agreement && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p>{agreement.version || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Envelope ID</p>
                  <p className="break-all text-xs">{agreement.envelopeId || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signer</p>
                  <p>{agreement.signerName} ({agreement.signerEmail})</p>
                </div>
                {agreement.signedDocumentStoragePath && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Signed PDF</p>
                    <p className="break-all text-xs">{agreement.signedDocumentStoragePath}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {agreement && (
        <Card>
          <CardContent className="pt-6">
            <DealerAgreementTimeline agreement={agreement} />
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      <Card>
        <CardContent className="pt-6">
          <DealerAgreementActions
            dealerId={dealerId}
            agreementStatus={status}
            onActionComplete={handleActionComplete}
          />
        </CardContent>
      </Card>
    </div>
  )
}
