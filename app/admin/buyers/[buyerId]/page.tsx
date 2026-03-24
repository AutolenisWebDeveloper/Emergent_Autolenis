"use client"

import { use, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  User,
  CreditCard,
  Gavel,
  Car,
  DollarSign,
  Users,
  Ban,
  CheckCircle,
  Loader2,
  FileText,
  Truck,
  Shield,
  Heart,
  ClipboardList,
} from "lucide-react"
import useSWR from "swr"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminBuyerDetailPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/buyers/${buyerId}`, fetcher)
  const [suspending, setSuspending] = useState(false)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/buyers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
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

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/buyers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Buyer Not Found</h1>
        </div>
        <p className="text-muted-foreground">The buyer you are looking for does not exist.</p>
      </div>
    )
  }

  const buyer = data.buyer
  const profile = buyer?.buyerProfile || buyer?.buyer?.profile
  const preQual = buyer?.buyerPreQualification || buyer?.buyer?.preQualification
  const preferences = buyer?.buyerPreferences || buyer?.buyer?.preferences
  const shortlists = buyer?.shortlists || []
  const auctions = buyer?.auctions || buyer?.buyer?.auctions || []
  const deals = buyer?.selectedDeals || buyer?.buyer?.selectedDeals || []
  const affiliate = buyer?.affiliate || buyer?.buyer?.affiliate
  const documents = buyer?.documents || []
  const pickupAppointments = buyer?.pickupAppointments || []
  const complianceEvents = buyer?.complianceEvents || []
  const auditLogs = buyer?.adminAuditLogs || []
  const packageBilling = data.packageBilling
  const packageHistory = data.packageHistory || []
  const paymentLedger = data.paymentLedger || []

  const totalOffers = auctions.reduce((sum: number, a: any) => sum + (a.offers?.length || 0), 0)
  const depositPaid = deals.some((d: any) => d.deposit?.status === "PAID")
  const feePaid = deals.some((d: any) => d.serviceFee?.status === "PAID")
  const completedDocs = documents.filter((d: any) => d.status === "APPROVED" || d.status === "VERIFIED").length

  const handleStatusChange = async (action: "suspend" | "reactivate") => {
    const msg = action === "suspend"
      ? "Are you sure you want to suspend this account?"
      : "Are you sure you want to reactivate this account?"
    if (!confirm(msg)) return
    setSuspending(true)
    try {
      const res = await fetch(`/api/admin/buyers/${buyerId}/status`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        alert(body?.error || `Failed to ${action} account. Please try again.`)
        return
      }
      mutate()
    } catch {
      alert(`Network error. Failed to ${action} account.`)
    } finally {
      setSuspending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/buyers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {profile?.firstName || buyer?.first_name || "Unknown"}{" "}
                {profile?.lastName || buyer?.last_name || ""}
              </h1>
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${
                  buyer?.status === "SUSPENDED"
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {buyer?.status || "ACTIVE"}
              </span>
              {preQual && (
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
                  Pre-Qualified
                </span>
              )}
              {!preQual && (
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">
                  Not Pre-Qualified
                </span>
              )}
              {auctions.some((a: any) => a.status === "ACTIVE") && (
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
                  Auction Active
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{buyer?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {buyer?.status === "SUSPENDED" ? (
            <Button
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
              disabled={suspending}
              onClick={() => handleStatusChange("reactivate")}
            >
              {suspending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Reactivate Account
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              disabled={suspending}
              onClick={() => handleStatusChange("suspend")}
            >
              {suspending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Suspend Account
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pre-Qual</p>
                <p className="text-lg font-semibold">
                  {preQual ? (
                    <span className="text-green-600">
                      {preQual.creditTier || preQual.scoreBand || "Approved"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-[#00D9FF]" />
              <div>
                <p className="text-sm text-muted-foreground">Auctions / Offers</p>
                <p className="text-lg font-semibold">
                  {auctions.length} / {totalOffers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-[#7ED321]" />
              <div>
                <p className="text-sm text-muted-foreground">Deal Stage</p>
                <p className="text-lg font-semibold">
                  {deals.length > 0 ? (
                    <span>{deals[0].status || "In Progress"}</span>
                  ) : (
                    <span className="text-muted-foreground">No Deal</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Payments</p>
                <p className="text-sm font-semibold">
                  <span className={depositPaid ? "text-green-600" : "text-muted-foreground"}>
                    Deposit {depositPaid ? "✓" : "✗"}
                  </span>
                  {" · "}
                  <span className={feePaid ? "text-green-600" : "text-muted-foreground"}>
                    Fee {feePaid ? "✓" : "✗"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-[#00D9FF]" />
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-lg font-semibold">
                  {documents.length > 0 ? (
                    <span>
                      {completedDocs}/{documents.length}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prequal">Pre-Qualification</TabsTrigger>
          <TabsTrigger value="shortlist">Shortlist</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="pickup">Pickup</TabsTrigger>
          {affiliate && <TabsTrigger value="affiliate">Affiliate</TabsTrigger>}
          <TabsTrigger value="package">Package</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* A. Overview */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Full Name</dt>
                    <dd className="font-medium">
                      {profile?.firstName || buyer?.first_name || "Unknown"}{" "}
                      {profile?.lastName || buyer?.last_name || ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Email</dt>
                    <dd className="font-medium">{buyer?.email || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{profile?.phone || buyer?.phone || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Address</dt>
                    <dd className="font-medium">
                      {profile?.address
                        ? `${profile?.address}${profile?.city ? `, ${profile.city}` : ""}${profile?.state ? `, ${profile.state}` : ""} ${profile?.zip || profile?.postalCode || ""}`
                        : "-"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Account Created</dt>
                    <dd className="font-medium">
                      {buyer?.createdAt ? formatDate(buyer.createdAt) : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Role</dt>
                    <dd className="font-medium">{buyer?.role || "BUYER"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Package Tier</dt>
                    <dd className="font-medium">
                      {profile?.package_tier === "PREMIUM" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          Premium
                        </span>
                      ) : profile?.package_tier === "STANDARD" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          Standard
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </dd>
                  </div>
                  {profile?.package_selection_source && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Package Source</dt>
                      <dd className="font-medium">{profile.package_selection_source}</dd>
                    </div>
                  )}
                  {profile?.package_selected_at && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Package Selected At</dt>
                      <dd className="font-medium">{formatDate(profile.package_selected_at)}</dd>
                    </div>
                  )}
                  {profile?.package_upgraded_at && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Package Upgraded At</dt>
                      <dd className="font-medium">{formatDate(profile.package_upgraded_at)}</dd>
                    </div>
                  )}
                  {/* Billing data from canonical buyer_package_billing table */}
                  {packageBilling ? (
                    <>
                      <div>
                        <dt className="text-sm text-muted-foreground">Deposit Status</dt>
                        <dd className="font-medium">
                          {packageBilling.deposit_status === "PAID" ? (
                            <span className="text-green-600">{packageBilling.deposit_status}</span>
                          ) : (
                            <span className="text-yellow-600">{packageBilling.deposit_status}</span>
                          )}
                          {packageBilling.deposit_amount_cents != null && ` ($${(packageBilling.deposit_amount_cents / 100).toFixed(0)})`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Deposit Credit Treatment</dt>
                        <dd className="font-medium">{packageBilling.deposit_credit_treatment || "-"}</dd>
                      </div>
                      {profile?.package_tier === "PREMIUM" && (
                        <>
                          <div>
                            <dt className="text-sm text-muted-foreground">Premium Fee Total</dt>
                            <dd className="font-medium">{formatCurrency((packageBilling.premium_fee_total_cents || 0) / 100)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Premium Fee Credit from Deposit</dt>
                            <dd className="font-medium">{formatCurrency((packageBilling.premium_fee_credit_from_deposit_cents || 0) / 100)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Premium Fee Remaining</dt>
                            <dd className="font-medium">{formatCurrency((packageBilling.premium_fee_remaining_cents || 0) / 100)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Premium Fee Status</dt>
                            <dd className="font-medium">{packageBilling.premium_fee_status || "-"}</dd>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div>
                      <dt className="text-sm text-muted-foreground">Deposit Status</dt>
                      <dd className="font-medium text-muted-foreground">No billing data available</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">Current Workflow Stage</dt>
                    <dd className="font-medium">
                      {buyer?.workflowStage || buyer?.stage || (deals.length > 0 ? "Deal Selected" : preQual ? "Pre-Qualified" : "Onboarding")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Employment</dt>
                    <dd className="font-medium">
                      {profile?.employmentStatus || profile?.employer || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Housing</dt>
                    <dd className="font-medium">{profile?.housingStatus || "-"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {buyer?.adminNotes || buyer?.notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {buyer.adminNotes || buyer.notes}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No admin notes for this buyer.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* B. Pre-Qualification */}
        <TabsContent value="prequal">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pre-Qualification Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preQual ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Status</dt>
                        <dd>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              preQual.status === "APPROVED" || preQual.status === "ACTIVE"
                                ? "bg-green-100 text-green-800"
                                : preQual.status === "DENIED" || preQual.status === "REVOKED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {preQual.status || "PENDING"}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Max OTD Amount</dt>
                        <dd className="text-xl font-bold text-green-600">
                          {formatCurrency(preQual.maxOtd || (preQual.maxOtdAmountCents || 0) / 100)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Score Band / Credit Tier</dt>
                        <dd className="font-medium">
                          {preQual.scoreBand || preQual.creditTier || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">DTI Ratio</dt>
                        <dd className="font-medium">
                          {preQual.dti ? `${(preQual.dti * 100).toFixed(1)}%` : "-"}
                        </dd>
                      </div>
                    </dl>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Monthly Payment Range</dt>
                        <dd className="font-medium">
                          {formatCurrency(preQual.estimatedMonthlyMin || 0)} –{" "}
                          {formatCurrency(preQual.estimatedMonthlyMax || 0)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Soft Pull Date</dt>
                        <dd className="font-medium">
                          {preQual.softPullDate ? formatDate(preQual.softPullDate) : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Expires</dt>
                        <dd className="font-medium">
                          {preQual.expiresAt ? formatDate(preQual.expiresAt) : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Created</dt>
                        <dd className="font-medium">
                          {preQual.createdAt ? formatDate(preQual.createdAt) : "-"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    This buyer has not completed pre-qualification.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financing Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                {preferences ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Down Payment</dt>
                        <dd className="font-medium">
                          {preferences.downPayment != null
                            ? formatCurrency(preferences.downPayment)
                            : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Preferred Term</dt>
                        <dd className="font-medium">
                          {preferences.preferredTerm
                            ? `${preferences.preferredTerm} months`
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Max Monthly Payment</dt>
                        <dd className="font-medium">
                          {preferences.maxMonthlyPayment != null
                            ? formatCurrency(preferences.maxMonthlyPayment)
                            : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Trade-In</dt>
                        <dd className="font-medium">
                          {preferences.hasTradeIn ? "Yes" : "No"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No financing preferences recorded for this buyer.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* C. Vehicle Preferences / Shortlist */}
        <TabsContent value="shortlist">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Saved Vehicles & Shortlists
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shortlists.length > 0 ? (
                  <div className="space-y-4">
                    {shortlists.map((list: any) => (
                      <div key={list.id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">
                          {list.name || "Shortlist"}{" "}
                          <span className="text-sm text-muted-foreground">
                            ({list.items?.length || 0} vehicles)
                          </span>
                        </h4>
                        {list.items && list.items.length > 0 ? (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Vehicle
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Price
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                    Added
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {list.items.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 text-sm">
                                      {item.vehicle
                                        ? `${item.vehicle.year || ""} ${item.vehicle.make || ""} ${item.vehicle.model || ""}`
                                        : item.inventoryItem
                                          ? `${item.inventoryItem.year || ""} ${item.inventoryItem.make || ""} ${item.inventoryItem.model || ""}`
                                          : "Unknown Vehicle"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {item.vehicle?.price != null
                                        ? formatCurrency(item.vehicle.price)
                                        : item.inventoryItem?.priceCents != null
                                          ? formatCurrency(item.inventoryItem.priceCents / 100)
                                          : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                      {item.createdAt ? formatDate(item.createdAt) : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No vehicles in this shortlist.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No shortlists found for this buyer.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buyer Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                {preferences ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Preferred Makes</dt>
                        <dd className="font-medium">
                          {preferences.preferredMakes?.join(", ") || preferences.makes?.join(", ") || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Body Types</dt>
                        <dd className="font-medium">
                          {preferences.bodyTypes?.join(", ") || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Year Range</dt>
                        <dd className="font-medium">
                          {preferences.minYear || preferences.maxYear
                            ? `${preferences.minYear || "Any"} – ${preferences.maxYear || "Any"}`
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Max Mileage</dt>
                        <dd className="font-medium">
                          {preferences.maxMileage
                            ? `${preferences.maxMileage.toLocaleString()} mi`
                            : "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Fuel Type</dt>
                        <dd className="font-medium">
                          {preferences.fuelType || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Must-Haves</dt>
                        <dd className="font-medium">
                          {preferences.mustHaves?.join(", ") || preferences.features?.join(", ") || "-"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No vehicle preferences recorded for this buyer.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* D. Auctions & Offers */}
        <TabsContent value="auctions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Auctions ({auctions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auctions.length > 0 ? (
                <div className="space-y-6">
                  {auctions.map((auction: any) => (
                    <div key={auction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">
                            {auction.id.slice(0, 8)}...
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              auction.status === "ACTIVE"
                                ? "bg-green-100 text-green-800"
                                : auction.status === "CLOSED"
                                  ? "bg-muted text-gray-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {auction.status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Created {auction.createdAt ? formatDate(auction.createdAt) : "-"}
                          </span>
                        </div>
                        <Link
                          href={`/admin/auctions/${auction.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View Auction
                        </Link>
                      </div>

                      {auction.offers && auction.offers.length > 0 ? (
                        <div className="w-full overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                  Dealer
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                  Price
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                  Term
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {auction.offers.map((offer: any) => (
                                <tr key={offer.id}>
                                  <td className="px-4 py-3 text-sm">
                                    {offer.dealer?.name ||
                                      offer.dealer?.businessName ||
                                      offer.dealerName ||
                                      "Unknown"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {formatCurrency(
                                      offer.otdPrice ||
                                        offer.price ||
                                        (offer.totalOtdAmountCents || 0) / 100
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {offer.term
                                      ? `${offer.term} mo`
                                      : offer.termMonths
                                        ? `${offer.termMonths} mo`
                                        : "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        offer.status === "ACCEPTED"
                                          ? "bg-green-100 text-green-800"
                                          : offer.status === "REJECTED"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {offer.status || "PENDING"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No offers received for this auction.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No auctions found for this buyer.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E. Selected Deals */}
        <TabsContent value="deals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Selected Deals ({deals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <div className="space-y-6">
                  {deals.map((deal: any) => (
                    <div key={deal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">
                            {deal.id.slice(0, 8)}...
                          </span>
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
                        </div>
                        <Link
                          href={`/admin/deals/${deal.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View Deal →
                        </Link>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">Vehicle</dt>
                            <dd className="font-medium">
                              {deal.inventoryItem
                                ? `${deal.inventoryItem.year} ${deal.inventoryItem.make} ${deal.inventoryItem.model}`
                                : "Unknown"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Dealer</dt>
                            <dd className="font-medium">
                              {deal.dealer?.name ||
                                deal.dealer?.businessName ||
                                "Unknown"}
                            </dd>
                          </div>
                        </dl>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">OTD Price</dt>
                            <dd className="font-medium">
                              {formatCurrency(
                                deal.cashOtd || (deal.totalOtdAmountCents || 0) / 100
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Financing</dt>
                            <dd className="font-medium">
                              {deal.financingOffer
                                ? `${formatCurrency(deal.financingOffer.monthlyPayment || 0)}/mo × ${deal.financingOffer.term || deal.financingOffer.termMonths || "-"} mo`
                                : deal.monthlyPayment
                                  ? `${formatCurrency(deal.monthlyPayment)}/mo`
                                  : "-"}
                            </dd>
                          </div>
                        </dl>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">Contract Status</dt>
                            <dd className="font-medium">
                              {deal.contractStatus || deal.contract?.status || "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Created</dt>
                            <dd className="font-medium">
                              {deal.createdAt ? formatDate(deal.createdAt) : "-"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No deals found for this buyer.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* F. Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <div className="space-y-4">
                  {deals.map((deal: any) => (
                    <div key={deal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          Deal: {deal.id.slice(0, 8)}...
                        </h4>
                        <Link
                          href={`/admin/deals/${deal.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          View Deal
                        </Link>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground mb-1">Deposit</p>
                          {deal.deposit ? (
                            <div>
                              <p className="font-medium">
                                <span
                                  className={
                                    deal.deposit.status === "PAID"
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }
                                >
                                  {formatCurrency(deal.deposit.amount || 99)} –{" "}
                                  {deal.deposit.status}
                                </span>
                              </p>
                              {deal.deposit.paidAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Paid {formatDate(deal.deposit.paidAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Not paid</p>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground mb-1">Service Fee</p>
                          {deal.serviceFee ? (
                            <div>
                              <p className="font-medium">
                                <span
                                  className={
                                    deal.serviceFee.status === "PAID"
                                      ? "text-green-600"
                                      : "text-yellow-600"
                                  }
                                >
                                  {formatCurrency(
                                    deal.serviceFee.amount ||
                                      (deal.serviceFee.baseFeeCents || 0) / 100
                                  )}{" "}
                                  – {deal.serviceFee.status}
                                </span>
                              </p>
                              {deal.serviceFee.paidAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Paid {formatDate(deal.serviceFee.paidAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Not paid</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No payment records found for this buyer.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* G. Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Uploaded
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documents.map((doc: any) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 text-sm font-medium">
                            {doc.type || doc.documentType || doc.name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                doc.status === "APPROVED" || doc.status === "VERIFIED"
                                  ? "bg-green-100 text-green-800"
                                  : doc.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {doc.status || "PENDING"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {doc.createdAt ? formatDate(doc.createdAt) : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {doc.notes || doc.rejectionReason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No documents found for this buyer.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* H. Pickup & Delivery */}
        <TabsContent value="pickup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Pickup & Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pickupAppointments.length > 0 ? (
                <div className="space-y-4">
                  {pickupAppointments.map((appt: any) => (
                    <div key={appt.id} className="border rounded-lg p-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">Status</dt>
                            <dd>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  appt.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : appt.status === "CANCELLED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {appt.status || "SCHEDULED"}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Type</dt>
                            <dd className="font-medium">
                              {appt.type || appt.deliveryType || "-"}
                            </dd>
                          </div>
                        </dl>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">
                              Scheduled Date
                            </dt>
                            <dd className="font-medium">
                              {appt.scheduledDate
                                ? formatDate(appt.scheduledDate)
                                : appt.date
                                  ? formatDate(appt.date)
                                  : "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Location</dt>
                            <dd className="font-medium">
                              {appt.location || appt.address || "-"}
                            </dd>
                          </div>
                        </dl>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-muted-foreground">Notes</dt>
                            <dd className="font-medium">
                              {appt.notes || "-"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No pickup or delivery appointments found for this buyer.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* I. Affiliate Attribution */}
        {affiliate && (
          <TabsContent value="affiliate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Affiliate Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Referral Code</dt>
                      <dd className="font-mono font-medium">
                        {affiliate.referralCode ||
                          affiliate.refCode ||
                          affiliate.ref_code ||
                          "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Total Referrals</dt>
                      <dd className="font-medium">
                        {affiliate.referrals?.length || affiliate.totalReferrals || 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Status</dt>
                      <dd>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {affiliate.status || "Active"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-muted-foreground">Total Earnings</dt>
                      <dd className="text-xl font-bold text-green-600">
                        {formatCurrency(affiliate.totalEarnings || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Pending Earnings</dt>
                      <dd className="font-medium">
                        {formatCurrency(affiliate.pendingEarnings || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Joined</dt>
                      <dd className="font-medium">
                        {affiliate.createdAt
                          ? formatDate(affiliate.createdAt)
                          : "-"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {(affiliate.utmSource || affiliate.utmMedium || affiliate.utmCampaign) && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-medium text-foreground mb-3">
                      UTM Attribution
                    </h4>
                    <dl className="grid gap-4 md:grid-cols-3">
                      <div>
                        <dt className="text-sm text-muted-foreground">Source</dt>
                        <dd className="font-medium">
                          {affiliate.utmSource || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Medium</dt>
                        <dd className="font-medium">
                          {affiliate.utmMedium || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Campaign</dt>
                        <dd className="font-medium">
                          {affiliate.utmCampaign || "-"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* J. Compliance & Audit Logs */}
        {/* Package History & Payment Ledger */}
        <TabsContent value="package">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Package Change History</CardTitle>
              </CardHeader>
              <CardContent>
                {packageHistory.length > 0 ? (
                  <div className="space-y-3">
                    {packageHistory.map((entry: any, i: number) => (
                      <div key={entry.id || i} className="flex items-start gap-3 border-l-2 border-primary/20 pl-4 py-1">
                        <div>
                          <p className="text-sm font-medium">
                            {entry.old_tier ? `${entry.old_tier} → ${entry.new_tier}` : `Initial: ${entry.new_tier}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Source: {entry.change_source}{entry.change_reason ? ` — ${entry.change_reason}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(entry.changed_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No package history recorded.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentLedger.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Direction</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">External ID</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentLedger.map((entry: any, i: number) => (
                          <tr key={entry.id || i} className="border-b last:border-0">
                            <td className="py-2 px-2">{entry.payment_type}</td>
                            <td className="py-2 px-2">{entry.direction}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency((entry.amount_cents || 0) / 100)}</td>
                            <td className="py-2 px-2 text-xs font-mono">{entry.external_payment_id ? entry.external_payment_id.slice(0, 16) + "…" : "-"}</td>
                            <td className="py-2 px-2">{formatDate(entry.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No payment ledger entries.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceEvents.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Event
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {complianceEvents.map((event: any) => (
                          <tr key={event.id}>
                            <td className="px-4 py-3 text-sm font-medium">
                              {event.event || event.action || event.name || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-muted text-gray-800">
                                {event.type || event.category || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {event.createdAt ? formatDate(event.createdAt) : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {event.details || event.description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No compliance events found for this buyer.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Admin Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Action
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Admin
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {auditLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td className="px-4 py-3 text-sm font-medium">
                              {log.action || log.event || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {log.admin?.email || log.adminEmail || log.performedBy || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {log.createdAt ? formatDate(log.createdAt) : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {log.details || log.description || log.reason || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No audit logs found for this buyer.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
