"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton"
import { ErrorState } from "@/components/dashboard/error-state"
import { StatusPill } from "@/components/dashboard/status-pill"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Car, MapPin, Calendar, ArrowRight, DollarSign } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { Suspense } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const Loading = () => null;

export default function DealerLeadsPage() {
  const [search, setSearch] = useState("")
  const { data, error, isLoading, mutate } = useSWR("/api/dealer/auctions", fetcher)

  const leads = data?.auctions || []
  const filteredLeads = search
    ? leads.filter((lead: any) => {
        const vehicle = lead.inventoryItem
        const s = search.toLowerCase()
        return (
          vehicle?.make?.toLowerCase().includes(s) ||
          vehicle?.model?.toLowerCase().includes(s) ||
          lead.buyer?.zipCode?.toLowerCase().includes(s) ||
          lead.status?.toLowerCase().includes(s)
        )
      })
    : leads

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <PageHeader
          title="Leads"
          subtitle="View and respond to buyer requests"
        />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : error ? (
          <ErrorState message="Failed to load leads" onRetry={() => mutate()} />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No active leads"
            description="When buyers request vehicles matching your inventory, their requests will appear here as leads for you to submit offers."
            secondaryCta={{ label: "Manage Inventory", href: "/dealer/inventory" }}
          />
        ) : (
          <div className="grid gap-4">
            {filteredLeads.map((lead: any) => {
              const vehicle = lead.inventoryItem
              return (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#7ED321]/10 flex items-center justify-center flex-shrink-0">
                          <Car className="h-6 w-6 text-[#7ED321]" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {vehicle?.year} {vehicle?.make} {vehicle?.model}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {lead.buyer?.zipCode || "N/A"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Budget: ${(lead.buyer?.maxBudget || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2">
                            <StatusPill status={lead.status?.toLowerCase() || "active"} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {lead.offers?.length || 0} offers submitted
                          </p>
                        </div>
                        <Button asChild>
                          <Link href={`/dealer/leads/${lead.id}`}>
                            View Lead
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Suspense>
  )
}
