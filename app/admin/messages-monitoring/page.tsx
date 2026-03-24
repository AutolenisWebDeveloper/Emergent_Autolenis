"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Shield, AlertTriangle, Search, Filter } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json())

function approvalBadge(type: string) {
  switch (type) {
    case "autolenis":
      return <Badge variant="default" className="bg-green-600 text-xs">AutoLenis</Badge>
    case "external":
      return <Badge variant="default" className="bg-blue-600 text-xs">External</Badge>
    case "cash":
      return <Badge variant="secondary" className="text-xs">Cash</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

export default function AdminMessagesMonitoringPage() {
  const [page, setPage] = useState(1)
  const [approvalFilter, setApprovalFilter] = useState("all")
  const [flaggedFilter, setFlaggedFilter] = useState("all")
  const [identityFilter, setIdentityFilter] = useState("all")

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "25")
    if (approvalFilter !== "all") params.set("approvalType", approvalFilter)
    if (flaggedFilter === "true") params.set("flagged", "true")
    if (flaggedFilter === "false") params.set("flagged", "false")
    if (identityFilter === "true") params.set("identityReleased", "true")
    if (identityFilter === "false") params.set("identityReleased", "false")
    return params.toString()
  }, [page, approvalFilter, flaggedFilter, identityFilter])

  const { data, isLoading } = useSWR(`/api/admin/messages-monitoring?${queryParams}`, fetcher, {
    refreshInterval: 30000,
  })

  const result = data?.data
  const threads = result?.threads || []
  const stats = result?.stats || { totalThreads: 0, activeThreads: 0, flaggedMessages: 0, approvalDistribution: {} }
  const totalPages = result?.totalPages || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Messages Monitoring</h1>
        <p className="text-muted-foreground">Monitor buyer↔dealer messaging, circumvention attempts, and redaction events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalThreads}</p>
                <p className="text-xs text-muted-foreground">Total Threads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeThreads}</p>
                <p className="text-xs text-muted-foreground">Active Threads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.flaggedMessages}</p>
                <p className="text-xs text-muted-foreground">Flagged Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(stats.approvalDistribution as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.approvalDistribution?.external || 0} External
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={approvalFilter} onValueChange={(v) => { setApprovalFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Approval Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="autolenis">AutoLenis</SelectItem>
                <SelectItem value="external">External</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Select value={flaggedFilter} onValueChange={(v) => { setFlaggedFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Flagged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Flagged Only</SelectItem>
                <SelectItem value="false">Not Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={identityFilter} onValueChange={(v) => { setIdentityFilter(v); setPage(1) }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Identity Released" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Identity Released</SelectItem>
                <SelectItem value="false">Identity Protected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Thread list */}
      <Card>
        <CardHeader>
          <CardTitle>Message Threads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No threads match current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Thread</th>
                    <th className="text-left p-2">Approval</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Identity</th>
                    <th className="text-left p-2">Risk</th>
                    <th className="text-left p-2">Last Message</th>
                    <th className="text-left p-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <span className="font-mono text-xs">{t.id.slice(0, 12)}...</span>
                      </td>
                      <td className="p-2">{approvalBadge(t.approvalType)}</td>
                      <td className="p-2">
                        <Badge variant={t.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {t.identityReleased ? (
                          <Badge variant="default" className="bg-green-600 text-xs">Released</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Protected</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        {t.flagged ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 font-medium">{t.lastMessageScore}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t.lastMessageScore || 0}</span>
                        )}
                      </td>
                      <td className="p-2 max-w-[200px] truncate text-muted-foreground">
                        {t.lastMessage || "—"}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
