"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Shield, RefreshCw, User, Clock, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/dashboard/page-header"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string
  userId?: string
  adminId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: {
    email: string
    role: string
  }
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (entityFilter !== "all") params.set("entityType", entityFilter)
      if (search) params.set("search", search)
      
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch logs")
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error("Error fetching audit logs:", err)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, entityFilter, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
    LOGIN: "bg-purple-100 text-purple-800",
    LOGIN_FAILED: "bg-red-100 text-red-800",
    LOGOUT: "bg-muted text-gray-800",
    VIEW: "bg-muted text-gray-800",
    EXPORT: "bg-yellow-100 text-yellow-800",
    APPROVE: "bg-green-100 text-green-800",
    REJECT: "bg-red-100 text-red-800",
    REFUND: "bg-orange-100 text-orange-800",
    PAYOUT: "bg-purple-100 text-purple-800",
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
      case "LOGOUT":
        return <User className="h-4 w-4" />
      case "LOGIN_FAILED":
        return <AlertTriangle className="h-4 w-4" />
      case "APPROVE":
      case "CREATE":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Audit Logs"
          subtitle="Track all administrative actions and system events"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Logins Today</p>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.action === "LOGIN" && new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed Logins</p>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.action === "LOGIN_FAILED").length}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Admin Actions</p>
                  <p className="text-2xl font-bold">
                    {logs.filter((l) => l.adminId).length}
                  </p>
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
                  placeholder="Search by user email or entity ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGIN_FAILED">Failed Login</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="APPROVE">Approve</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="DEALER">Dealers</SelectItem>
                  <SelectItem value="BUYER">Buyers</SelectItem>
                  <SelectItem value="AUCTION">Auctions</SelectItem>
                  <SelectItem value="DEAL">Deals</SelectItem>
                  <SelectItem value="PAYMENT">Payments</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchLogs} variant="outline">
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
                <p className="text-muted-foreground">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={`${actionColors[log.action] || "bg-muted"} flex items-center gap-1 w-fit`}>
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.entityType}</p>
                            {log.entityId && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.entityId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <p className="text-sm">{log.user.email}</p>
                              <Badge variant="outline" className="text-xs">
                                {log.user.role}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                              {JSON.stringify(log.details).slice(0, 50)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{log.ipAddress || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDate(log.createdAt)}
                          </div>
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
