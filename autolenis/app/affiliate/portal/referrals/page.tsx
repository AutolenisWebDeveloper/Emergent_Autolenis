"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ReferralsListPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useSWR(`/api/affiliate/referrals?page=${page}&limit=20`, fetcher, {
    refreshInterval: 30000,
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DEAL_COMPLETE":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Deal Complete
          </Badge>
        )
      case "DEAL_IN_PROGRESS":
        return (
          <Badge className="bg-blue-500">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case "PREQUAL_COMPLETE":
        return <Badge className="bg-amber-500">Pre-Qualified</Badge>
      case "SIGNED_UP":
        return <Badge variant="outline">Signed Up</Badge>
      case "INACTIVE":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLevelBadge = (level: number) => {
    const colors = {
      1: "bg-[#7ED321]/10 text-[#7ED321] border-[#7ED321]/20",
      2: "bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/20",
      3: "bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20",
      4: "bg-primary/10 text-primary border-primary/20",
      5: "bg-muted text-muted-foreground border-gray-200",
    }
    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors] || colors[5]}>
        L{level}
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

  const { referrals = [], pagination = {} } = data || {}
  const totalReferrals = pagination.total || 0
  const completedDeals = referrals.filter((r: any) => r.status === "DEAL_COMPLETE").length
  const inProgress = referrals.filter((r: any) => r.status === "DEAL_IN_PROGRESS").length
  const totalEarned = referrals.reduce((sum: number, r: any) => sum + (r.commission || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referrals List</h1>
        <p className="text-muted-foreground mt-1">Track all users who signed up using your referral link</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{completedDeals}</div>
            <p className="text-sm text-muted-foreground">Completed Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{inProgress}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-[#7ED321]">${totalEarned.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {referrals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
            <p className="text-muted-foreground">Share your referral link to start earning commissions.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Referrals ({totalReferrals})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referrals.map((referral: any) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {referral.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{referral.name}</p>
                        {getLevelBadge(referral.level)}
                      </div>
                      <p className="text-sm text-muted-foreground">{referral.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(referral.signedUpAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(referral.status)}
                    {referral.commission !== null && (
                      <span className="font-semibold text-[#7ED321]">+${referral.commission.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

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
      )}
    </div>
  )
}
