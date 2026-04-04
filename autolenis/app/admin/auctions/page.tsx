"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gavel, ChevronLeft, ChevronRight } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminAuctionsPage() {
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const { data, error, isLoading } = useSWR(`/api/admin/auctions?page=${page}&status=${status}`, fetcher, {
    refreshInterval: 30000,
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const statusColors: Record<string, string> = {
    DRAFT: "bg-muted text-gray-800",
    ACTIVE: "bg-green-100 text-green-800",
    CLOSED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-red-100 text-red-800",
    NO_OFFERS: "bg-yellow-100 text-yellow-800",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auctions & Offers</h1>
          <p className="text-muted-foreground">Monitor all auction activity</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Auctions</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Auctions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading auctions...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">Failed to load auctions</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Auction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Starts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ends</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dealers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Offers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.auctions?.length > 0 ? (
                      data.auctions.map((auction: any) => (
                        <tr key={auction.id} className="hover:bg-accent">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-mono text-sm text-foreground">#{auction.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-medium text-foreground">{auction.buyerName}</p>
                            <p className="text-xs text-muted-foreground">{auction.buyerEmail}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[auction.status] || "bg-muted"}`}
                            >
                              {auction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {auction.startsAt ? formatDate(auction.startsAt) : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {auction.endsAt ? formatDate(auction.endsAt) : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{auction.dealersInvited}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{auction.offersReceived}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{auction.vehicleCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/admin/auctions/${auction.id}`}
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                          No auctions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= data.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
