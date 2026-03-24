"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, DollarSign, Clock, CheckCircle, Eye, RefreshCw, TrendingUp } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/dashboard/page-header"
import { useSearchParams } from "next/navigation"

interface Offer {
  id: string
  auctionId: string
  dealerId: string
  status: string
  otdPriceCents: number
  createdAt: string
  dealer?: {
    dealershipName: string
  }
  auction?: {
    make: string
    model: string
    year: number
  }
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const searchParams = useSearchParams()

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      
      const res = await fetch(`/api/admin/offers?${params}`)
      if (!res.ok) throw new Error("Failed to fetch offers")
      const data = await res.json()
      setOffers(data.offers || [])
    } catch (err) {
      console.error("Error fetching offers:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    EXPIRED: "bg-muted text-gray-800",
    COUNTERED: "bg-purple-100 text-purple-800",
  }

  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.status === "PENDING").length,
    accepted: offers.filter((o) => o.status === "ACCEPTED").length,
    avgPrice: offers.length > 0 
      ? offers.reduce((sum, o) => sum + (o.otdPriceCents || 0), 0) / offers.length / 100 
      : 0,
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dealer Offers"
        subtitle="Review and manage all dealer offers on auctions"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Offers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Price</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgPrice * 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by dealer or vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchOffers()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchOffers} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading offers...</p>
              </div>
            ) : offers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No offers found
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>OTD Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          {offer.auction ? (
                            <p className="font-medium">
                              {offer.auction.year} {offer.auction.make} {offer.auction.model}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">Unknown Vehicle</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {offer.dealer?.dealershipName || "Unknown Dealer"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(offer.otdPriceCents)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[offer.status] || "bg-muted"}>
                            {offer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(offer.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/offers/${offer.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
