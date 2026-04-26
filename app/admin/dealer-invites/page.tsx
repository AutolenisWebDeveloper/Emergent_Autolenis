"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { AdminListPageShell } from "@/components/admin/admin-list-page-shell"
import type { AdminListColumn } from "@/components/admin/admin-list-page-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Send,
  RefreshCw,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Phone,
  AlertCircle,
} from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { PageHeader } from "@/components/dashboard/page-header"
import { toast } from "sonner"
import { csrfHeaders } from "@/lib/csrf-client"

interface Invite {
  id: string
  dealerEmail: string | null
  dealerName: string | null
  dealerPhone: string | null
  status: string
  sentAt: string
  viewedAt: string | null
  respondedAt: string | null
  tokenExpiresAt: string
  prospect?: {
    id: string
    businessName: string | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  sent: { label: "Sent", variant: "secondary", icon: Clock },
  viewed: { label: "Viewed", variant: "outline", icon: Eye },
  responded: { label: "Accepted", variant: "default", icon: CheckCircle },
  expired: { label: "Expired", variant: "destructive", icon: XCircle },
}

function AdminDealerInvitesContent() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")

  // Create invite form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    dealerName: "",
    dealerEmail: "",
    dealerPhone: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchInvites = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/dealer-invites?${params}`)
      if (!res.ok) throw new Error("Failed to fetch invites")
      const data = await res.json()
      setInvites(data.invites || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error("Error fetching invites:", err)
      toast.error("Failed to load dealer invites")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const handleSubmit = async () => {
    if (!form.dealerName.trim() || !form.dealerEmail.trim()) {
      toast.error("Dealer name and email are required")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.dealerEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/dealer-invites", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          dealerName: form.dealerName.trim(),
          dealerEmail: form.dealerEmail.trim().toLowerCase(),
          dealerPhone: form.dealerPhone.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message || "Failed to send invite")
      }
      toast.success("Dealer invite sent successfully")
      setForm({ dealerName: "", dealerEmail: "", dealerPhone: "", notes: "" })
      setShowForm(false)
      await fetchInvites()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite")
    } finally {
      setSubmitting(false)
    }
  }

  const isExpired = (invite: Invite) =>
    new Date(invite.tokenExpiresAt) < new Date() && invite.status === "sent"

  const getStatusDisplay = (invite: Invite) => {
    if (isExpired(invite)) return STATUS_CONFIG.expired
    return STATUS_CONFIG[invite.status] || STATUS_CONFIG.sent
  }

  const stats = {
    total,
    sent: invites.filter((i) => i.status === "sent" && !isExpired(i)).length,
    responded: invites.filter((i) => i.status === "responded").length,
    expired: invites.filter((i) => i.status === "expired" || isExpired(i)).length,
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-dealer-invites-page">
      <PageHeader
        title="Dealer Network Invites"
        subtitle="Invite dealers to join the AutoLenis network"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invites</p>
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
                <p className="text-2xl font-bold">{stats.sent}</p>
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
                <p className="text-2xl font-bold">{stats.responded}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Invite Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Invite a Dealer
              </CardTitle>
              <CardDescription>
                Send an invitation to a dealer to join the AutoLenis network
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} data-testid="create-invite-btn">
                <UserPlus className="h-4 w-4 mr-2" />
                New Invite
              </Button>
            )}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-name">
                  Business / Dealer Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inv-name"
                    placeholder="ABC Auto Group"
                    value={form.dealerName}
                    onChange={(e) => setForm((f) => ({ ...f, dealerName: e.target.value }))}
                    className="pl-10"
                    data-testid="invite-dealer-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-email">
                  Contact Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="dealer@example.com"
                    value={form.dealerEmail}
                    onChange={(e) => setForm((f) => ({ ...f, dealerEmail: e.target.value }))}
                    className="pl-10"
                    data-testid="invite-dealer-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inv-phone"
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={form.dealerPhone}
                    onChange={(e) => setForm((f) => ({ ...f, dealerPhone: e.target.value }))}
                    className="pl-10"
                    data-testid="invite-dealer-phone"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-notes">Internal Notes (optional)</Label>
              <Textarea
                id="inv-notes"
                placeholder="Any context about this dealer..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                data-testid="invite-notes"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.dealerName.trim() || !form.dealerEmail.trim()}
                data-testid="send-invite-btn"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  setForm({ dealerName: "", dealerEmail: "", dealerPhone: "", notes: "" })
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Sent Invitations</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-36" data-testid="invite-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Pending</SelectItem>
                  <SelectItem value="responded">Accepted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchInvites} data-testid="refresh-invites-btn">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading invites...</p>
            </div>
          ) : invites.length === 0 ? (
            <div className="p-8 text-center space-y-3" data-testid="invites-empty-state">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground font-medium">No invitations found</p>
              <p className="text-sm text-muted-foreground">
                Send your first dealer invite to start growing your network.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Viewed</TableHead>
                    <TableHead>Responded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const statusDisplay = getStatusDisplay(invite)
                    const StatusIcon = statusDisplay.icon
                    return (
                      <TableRow key={invite.id} data-testid={`invite-row-${invite.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {invite.dealerName || invite.prospect?.businessName || "—"}
                            </p>
                            {invite.prospect?.businessName && invite.dealerName && (
                              <p className="text-xs text-muted-foreground">
                                Prospect: {invite.prospect.businessName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {invite.dealerEmail && (
                              <p className="text-sm">{invite.dealerEmail}</p>
                            )}
                            {invite.dealerPhone && (
                              <p className="text-xs text-muted-foreground">{invite.dealerPhone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusDisplay.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusDisplay.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(invite.sentAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {invite.tokenExpiresAt ? formatDate(invite.tokenExpiresAt) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {invite.viewedAt ? formatDate(invite.viewedAt) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {invite.respondedAt ? formatDate(invite.respondedAt) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {page} of {Math.ceil(total / 20)}
          </p>
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
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDealerInvitesPage() {
  return (
    <Suspense fallback={null}>
      <AdminDealerInvitesContent />
    </Suspense>
  )
}
