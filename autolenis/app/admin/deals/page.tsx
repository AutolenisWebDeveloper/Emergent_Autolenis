"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Handshake, ChevronLeft, ChevronRight } from "lucide-react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminDealsPage() {
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const { data, error, isLoading } = useSWR(`/api/admin/deals?page=${page}&status=${status}`, fetcher, {
    refreshInterval: 30000,
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const statusColors: Record<string, string> = {
    PENDING_FINANCING: "bg-yellow-100 text-yellow-800",
    FINANCING_SELECTED: "bg-blue-100 text-blue-800",
    FEE_PENDING: "bg-orange-100 text-orange-800",
    FEE_PAID: "bg-purple-100 text-purple-800",
    INSURANCE_PENDING: "bg-cyan-100 text-cyan-800",
    INSURANCE_COMPLETE: "bg-teal-100 text-teal-800",
    CONTRACT_PENDING: "bg-indigo-100 text-indigo-800",
    CONTRACT_UPLOADED: "bg-violet-100 text-violet-800",
    ESIGN_PENDING: "bg-pink-100 text-pink-800",
    ESIGN_COMPLETE: "bg-rose-100 text-rose-800",
    PICKUP_SCHEDULED: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground">Monitor all deals and their progress</p>
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
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                <SelectItem value="PENDING_FINANCING">Pending Financing</SelectItem>
                <SelectItem value="FEE_PENDING">Fee Pending</SelectItem>
                <SelectItem value="FEE_PAID">Fee Paid</SelectItem>
                <SelectItem value="CONTRACT_PENDING">Contract Pending</SelectItem>
                <SelectItem value="ESIGN_PENDING">E-Sign Pending</SelectItem>
                <SelectItem value="PICKUP_SCHEDULED">Pickup Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
              <Handshake className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Deals</p>
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
              <p className="text-muted-foreground">Loading deals...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">Failed to load deals</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deal ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dealer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">OTD</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.deals?.length > 0 ? (
                      data.deals.map((deal: any) => (
                        <tr key={deal.id} className="hover:bg-accent">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-mono text-sm text-foreground">#{deal.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-medium text-foreground">{deal.buyerName}</p>
                            <p className="text-xs text-muted-foreground">{deal.buyerEmail}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{deal.dealerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{deal.vehicle}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {formatCurrency(deal.otdAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[deal.status] || "bg-muted"}`}
                            >
                              {deal.status?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(deal.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/admin/deals/${deal.id}`}
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                          No deals found
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
                    Page {data.page} of {data.totalPages} ({data.total} total)
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
