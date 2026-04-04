"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, ShieldAlert, ShieldX, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminContractsPage() {
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const { data, error, isLoading } = useSWR(`/api/admin/contracts?page=${page}&status=${status}`, fetcher, {
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

  const statusIcons: Record<string, React.ReactNode> = {
    PASS: <ShieldCheck className="h-5 w-5 text-green-500" />,
    FAIL: <ShieldX className="h-5 w-5 text-red-500" />,
    PENDING: <ShieldAlert className="h-5 w-5 text-yellow-500" />,
  }

  const statusColors: Record<string, string> = {
    PASS: "bg-green-100 text-green-800",
    FAIL: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contract Shield & Docs</h1>
        <p className="text-muted-foreground">Review contract scans and issues</p>
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
                <SelectItem value="all">All Scans</SelectItem>
                <SelectItem value="PASS">Passed</SelectItem>
                <SelectItem value="FAIL">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
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
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Scans</p>
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
              <p className="text-muted-foreground">Loading contract scans...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">Failed to load contract scans</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dealer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Issues</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Checks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Scanned</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.scans?.length > 0 ? (
                      data.scans.map((scan: any) => (
                        <tr key={scan.id} className="hover:bg-accent">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {statusIcons[scan.status]}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[scan.status]}`}>
                                {scan.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{scan.buyerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{scan.dealerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                scan.overallScore >= 80
                                  ? "text-green-600"
                                  : scan.overallScore >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {scan.overallScore.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                scan.issuesCount === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {scan.issuesCount} issues
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="flex items-center gap-1">
                                {scan.aprMatch ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                APR
                              </span>
                              <span className="flex items-center gap-1">
                                {scan.otdMatch ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                OTD
                              </span>
                              <span className="flex items-center gap-1">
                                {!scan.junkFeesDetected ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                Fees
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {scan.scannedAt ? formatDate(scan.scannedAt) : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="text-primary">
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                          No contract scans found
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
