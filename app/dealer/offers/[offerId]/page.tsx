"use client"

import { use } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { KeyValueGrid } from "@/components/dashboard/key-value-grid"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { StatusPill } from "@/components/dashboard/status-pill"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, User, FileText } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerOfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>
}) {
  const { offerId } = use(params)
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/offers", fetcher)

  // Find the specific offer
  const offer = data?.offers?.find((o: any) => o.id === offerId)
  const vehicle = offer?.auction?.inventoryItem

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." backHref="/dealer/offers" backLabel="Back to Offers" />
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Offer Not Found" backHref="/dealer/offers" backLabel="Back to Offers" />
        <ErrorState message="Failed to load offer details" onRetry={() => mutate()} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="dealer-offer-detail-page">
      <PageHeader
        title={`Offer for ${vehicle?.year || ""} ${vehicle?.make || ""} ${vehicle?.model || ""}`}
        subtitle={`Offer ID: ${offerId.slice(0, 8)}`}
        backHref="/dealer/offers"
        backLabel="Back to Offers"
        breadcrumbs={[
          { label: "Offers", href: "/dealer/offers" },
          { label: `${vehicle?.make || "Offer"} ${vehicle?.model || ""}` },
        ]}
      />

      <DetailShell
        summary={{
          title: "Offer Summary",
          content: (
            <div className="space-y-4">
              <div className="text-center p-4 bg-[#7ED321]/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Your Offer</p>
                <p className="text-3xl font-bold text-[#7ED321]">
                  ${(offer.cashOtd || 0).toLocaleString()}
                </p>
              </div>
              <KeyValueGrid
                columns={1}
                items={[
                  { label: "Status", value: <StatusPill status={offer.status?.toLowerCase() || "pending"} /> },
                  { label: "Submitted", value: new Date(offer.createdAt).toLocaleDateString() },
                  { label: "Vehicle", value: `${vehicle?.year} ${vehicle?.make} ${vehicle?.model}` },
                ]}
              />
            </div>
          ),
          actions: null,
        }}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Offer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KeyValueGrid
                      items={[
                        { label: "Cash Price (OTD)", value: `$${(offer.cashOtd || 0).toLocaleString()}` },
                        { label: "Monthly Payment", value: offer.monthlyPayment ? `$${offer.monthlyPayment.toLocaleString()}/mo` : "—" },
                        { label: "Term", value: offer.term ? `${offer.term} months` : "—" },
                        { label: "Status", value: <StatusPill status={offer.status?.toLowerCase() || "pending"} /> },
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            id: "buyer",
            label: "Buyer",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Buyer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <KeyValueGrid
                    items={[
                      { label: "Name", value: offer.auction?.buyer?.profile?.firstName || "Anonymous Buyer" },
                      { label: "Location", value: offer.auction?.buyer?.zipCode || "—" },
                      { label: "Pre-Qualified", value: offer.auction?.buyer?.isPreQualified ? "Yes" : "No" },
                    ]}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="No documents"
                description="Documents will be available once the offer is accepted."
              />
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: (
              <ActivityTimeline
                items={[
                  {
                    id: "1",
                    title: "Offer submitted",
                    description: `You submitted an offer of $${(offer.cashOtd || 0).toLocaleString()}`,
                    timestamp: new Date(offer.createdAt).toLocaleDateString(),
                    type: "success",
                  },
                ]}
              />
            ),
          },
        ]}
      />

    </div>
  )
}
