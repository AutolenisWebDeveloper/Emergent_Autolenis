"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, ChevronLeft, ChevronRight, Loader2, Search, AlertCircle } from "lucide-react"
import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ReferredAffiliatesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const url = `/api/affiliate/referrals/affiliates?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}`
  const { data, isLoading, error } = useSWR(url, fetcher, { refreshInterval: 30000 })

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || data?.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referred Affiliates</h1>
          <p className="text-muted-foreground mt-1">Affiliates who joined through your referral</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load data</h3>
            <p className="text-muted-foreground">{data?.error || "An error occurred. Please try again later."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { affiliates = [], pagination = {} } = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referred Affiliates</h1>
        <p className="text-muted-foreground mt-1">Affiliates who joined through your referral</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
      </div>

      {affiliates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Referred Affiliates Yet</h3>
            <p className="text-muted-foreground">
              No affiliates have signed up with your referral link yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Referred Affiliates ({pagination.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Name</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Signup Date</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Attribution</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((aff: any) => (
                    <tr key={aff.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-[#7ED321] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {aff.affiliateName?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium truncate">{aff.affiliateName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{aff.affiliateEmail}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">
                        {new Date(aff.signupDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">{getStatusBadge(aff.status)}</td>
                      <td className="py-3 px-2 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {aff.attributionSource || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
