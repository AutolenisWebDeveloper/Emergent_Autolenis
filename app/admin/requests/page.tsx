"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Car, Clock, CheckCircle, Eye, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/dashboard/page-header"

interface VehicleRequest {
  id: string
  buyerId: string
  status: string
  make: string
  model: string
  year: number
  trim?: string
  maxBudget?: number
  createdAt: string
  buyer?: {
    firstName: string
    lastName: string
    email: string
  }
  auctionCount?: number
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<VehicleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      
      const res = await fetch(`/api/admin/requests?${params.toString()}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch requests")
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error("Error fetching requests:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    MATCHED: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-muted text-gray-800",
    EXPIRED: "bg-red-100 text-red-800",
  }

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    active: requests.filter((r) => r.status === "ACTIVE").length,
    completed: requests.filter((r) => r.status === "COMPLETED" || r.status === "MATCHED").length,
  }

  return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Vehicle Requests"
          subtitle="Manage all buyer vehicle requests and auction matching"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
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
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
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
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
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
                  placeholder="Search by vehicle or buyer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRequests()}
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
                  <SelectItem value="MATCHED">Matched</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchRequests} variant="outline">
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
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No vehicle requests found
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auctions</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.year} {request.make} {request.model}
                            </p>
                            {request.trim && (
                              <p className="text-sm text-muted-foreground">{request.trim}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.buyer ? (
                            <div>
                              <p className="font-medium">
                                {request.buyer.firstName} {request.buyer.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{request.buyer.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status] || "bg-muted"}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.auctionCount || 0}</TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/requests/${request.id}`}>
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
