"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Clock, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CommissionsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")

  const url = `/api/affiliate/commissions?page=${page}&limit=20${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`
  const { data, isLoading } = useSWR(url, fetcher, {
    refreshInterval: 30000,
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        )
      case "APPROVED":
        return <Badge className="bg-blue-500">Approved</Badge>
      case "PROCESSING":
        return <Badge className="bg-amber-500">Processing</Badge>
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLevelBadge = (level: number) => {
    const colors = {
      1: "bg-[#7ED321]/10 text-[#7ED321]",
      2: "bg-[#00D9FF]/10 text-[#00D9FF]",
      3: "bg-[#0066FF]/10 text-[#0066FF]",
      4: "bg-primary/10 text-primary",
      5: "bg-muted text-muted-foreground",
    }
    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors] || colors[5]}>
        Level {level}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { commissions = [], stats = {}, pagination = {} } = data || {}
  const totalEarnings = (stats.pending || 0) + (stats.approved || 0) + (stats.paid || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Commissions & Earnings</h1>
        <p className="text-muted-foreground mt-1">Track your earnings and commission history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.pending || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.paid || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commission History</CardTitle>
            <CardDescription>All commissions earned from your referrals</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Commissions Yet</h3>
              <p className="text-muted-foreground">
                When your referrals complete purchases, your commissions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission: any) => (
                <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{commission.referralName}</p>
                      {getLevelBadge(commission.level)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Earned {new Date(commission.earnedAt).toLocaleDateString()}
                      {commission.paidAt && ` • Paid ${new Date(commission.paidAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(commission.status)}
                    <span className="text-lg font-bold text-[#7ED321]">+${commission.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
