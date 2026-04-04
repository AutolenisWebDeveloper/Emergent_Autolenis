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
import { Car, FileText, MessageSquare } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DealerLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = use(params)
  const { data, error, isLoading, mutate } = useSWR(`/api/dealer/auctions/${leadId}`, fetcher)

  const lead = data?.auction

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." backHref="/dealer/leads" backLabel="Back to Leads" />
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lead Not Found" backHref="/dealer/leads" backLabel="Back to Leads" />
        <ErrorState message="Failed to load lead details" onRetry={() => mutate()} />
      </div>
    )
  }

  const vehicle = lead.inventoryItem

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle?.year || ""} ${vehicle?.make || ""} ${vehicle?.model || ""}`}
        subtitle={`Lead ID: ${leadId.slice(0, 8)}`}
        backHref="/dealer/leads"
        backLabel="Back to Leads"
        breadcrumbs={[
          { label: "Leads", href: "/dealer/leads" },
          { label: `${vehicle?.make || "Lead"} ${vehicle?.model || ""}` },
        ]}
      />

      <DetailShell
        summary={{
          title: "Lead Summary",
          content: (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#7ED321]/10 flex items-center justify-center">
                  <Car className="h-6 w-6 text-[#7ED321]" />
                </div>
                <div>
                  <p className="font-semibold">
                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  </p>
                  <StatusPill status={lead.status?.toLowerCase() || "active"} />
                </div>
              </div>
              <KeyValueGrid
                columns={1}
                items={[
                  { label: "Received", value: new Date(lead.createdAt).toLocaleDateString() },
                  { label: "Auction Ends", value: lead.endsAt ? new Date(lead.endsAt).toLocaleString() : "—" },
                  { label: "Your Offers", value: lead.myOffers?.length || 0 },
                ]}
              />
            </div>
          ),
        }}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Vehicle Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KeyValueGrid
                      items={[
                        { label: "Year", value: vehicle?.year },
                        { label: "Make", value: vehicle?.make },
                        { label: "Model", value: vehicle?.model },
                        { label: "Trim", value: vehicle?.trim || "—" },
                        { label: "Mileage", value: vehicle?.mileage?.toLocaleString() || "—" },
                        { label: "VIN", value: vehicle?.vin?.slice(0, 11) + "..." || "—" },
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            id: "buyer-docs",
            label: "Buyer Docs",
            content: (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="Documents not available"
                description="Buyer documents will be shared once the deal is accepted."
              />
            ),
          },
          {
            id: "messages",
            label: "Messages",
            content: (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
                title="No messages"
                description="Messages with the buyer about this vehicle will appear here."
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
                    title: "Lead received",
                    description: "Buyer submitted a request for this vehicle",
                    timestamp: new Date(lead.createdAt).toLocaleDateString(),
                    type: "info",
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
