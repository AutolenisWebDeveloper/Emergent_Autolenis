"use client"

import { ProtectedRoute } from "@/components/layout/protected-route"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, Car, ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SourcingOpportunitiesPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/opportunities", fetcher)

  const opportunities = data?.opportunities || []

  return (
    <ProtectedRoute allowedRoles={["DEALER"]}>
      <div className="space-y-6">
        <PageHeader
          title="Sourcing Opportunities"
          subtitle="Browse available vehicle requests and submit your best offers"
        />

        {isLoading ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : error ? (
          <ErrorState message="Failed to load opportunities" onRetry={() => mutate()} />
        ) : opportunities.length === 0 ? (
          <EmptyState
            icon={<Car className="h-8 w-8 text-muted-foreground" />}
            title="No opportunities available"
            description="When buyers submit vehicle sourcing requests, matching opportunities will appear here for you to submit offers."
          />
        ) : (
          <div className="grid gap-4">
            {opportunities.map((opp: any) => (
              <Card key={opp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0">
                        <Car className="h-6 w-6 text-[#7ED321]" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {opp.vehicleSummary || "Vehicle Request"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {opp.marketZip || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(opp.createdAt).toLocaleDateString()}
                          </span>
                          {opp.timeline && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {opp.timeline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button asChild>
                      <Link href={`/dealer/opportunities/${opp.id}/offer`}>
                        Submit Offer
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
