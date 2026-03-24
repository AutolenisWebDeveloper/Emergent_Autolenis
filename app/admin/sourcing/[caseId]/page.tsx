"use client"

import { use, useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RefreshCw,
  ArrowLeft,
  Send,
  UserPlus,
  Plus,
  Eye,
  XCircle,
  Mail,
  Clock,
  Car,
  DollarSign,
  ScrollText,
} from "lucide-react"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format"
import { toast } from "sonner"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CaseItem {
  id: string
  year: number | null
  make: string | null
  modelName: string | null
  trim: string | null
  maxMileage: number | null
  maxBudgetCents: number | null
  budgetType: string | null
  maxTotalOtdBudgetCents: number | null
  maxMonthlyPaymentCents: number | null
  desiredDownPaymentCents: number | null
  condition: string | null
  fuelType: string | null
  bodyStyle: string | null
  color: string | null
  notes: string | null
}

interface OutreachLog {
  id: string
  dealerName: string
  contactMethod: string
  outcome: string
  notes: string | null
  createdAt: string
  admin?: { email: string } | null
}

interface Offer {
  id: string
  status: string
  sourceDealerName: string | null
  sourceType: string | null
  year: number | null
  make: string | null
  modelName: string | null
  trim: string | null
  vin: string | null
  mileage: number | null
  condition: string | null
  cashOtdCents: number | null
  taxes: number | null
  fees: number | null
  expiresAt: string | null
  createdAt: string
}

interface CaseEvent {
  id: string
  action: string
  actor: string | null
  beforeValue: string | null
  afterValue: string | null
  notes: string | null
  createdAt: string
}

interface CaseNote {
  id: string
  content: string
  authorUserId: string
  authorRole: string
  isInternal: boolean
  createdAt: string
}

interface SourcingCaseDetail {
  id: string
  status: string
  adminSubStatus: string | null
  assignedAdminId: string | null
  assignedAdmin: { email: string; firstName?: string; lastName?: string } | null
  createdAt: string
  buyer: {
    firstName: string
    lastName: string
    email: string
  } | null
  marketZip: string | null
  marketRadiusMiles: number | null
  prequalSnapshot: Record<string, unknown> | null
  items: CaseItem[]
  outreachLogs: OutreachLog[]
  offers: Offer[]
  events: CaseEvent[]
  notes: CaseNote[]
  dealerInvite: {
    dealerEmail: string
    dealerName: string
    status: string
    sentAt: string
  } | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CASE_STATUSES = [
  "SUBMITTED",
  "SOURCING",
  "OFFERS_READY",
  "OFFER_SELECTED",
  "DEAL_IN_PROGRESS",
  "CLOSED",
  "CANCELLED",
]

const CONTACT_METHODS = ["EMAIL", "PHONE", "IN_PERSON", "OTHER"]
const OUTREACH_OUTCOMES = ["INTERESTED", "DECLINED", "NO_RESPONSE", "FOLLOW_UP"]
const OFFER_CONDITIONS = ["NEW", "USED", "CERTIFIED_PRE_OWNED"]

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = use(params)
  const [caseData, setCaseData] = useState<SourcingCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Status management
  const [newStatus, setNewStatus] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [assignEmail, setAssignEmail] = useState("")
  const [assigningAdmin, setAssigningAdmin] = useState(false)

  // Outreach form
  const [outreachForm, setOutreachForm] = useState({
    dealerName: "",
    contactMethod: "EMAIL",
    outcome: "NO_RESPONSE",
    notes: "",
  })
  const [submittingOutreach, setSubmittingOutreach] = useState(false)

  // Offer form
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerForm, setOfferForm] = useState({
    sourceDealerName: "",
    year: "",
    make: "",
    modelName: "",
    trim: "",
    vin: "",
    mileage: "",
    condition: "USED",
    cashOtdDollars: "",
    taxes: "",
    fees: "",
    expiresAt: "",
  })
  const [submittingOffer, setSubmittingOffer] = useState(false)

  // Dealer invite form
  const [inviteForm, setInviteForm] = useState({ dealerEmail: "", dealerName: "" })
  const [submittingInvite, setSubmittingInvite] = useState(false)

  // Notes
  const [noteContent, setNoteContent] = useState("")
  const [submittingNote, setSubmittingNote] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Fetch                                                            */
  /* ---------------------------------------------------------------- */

  const fetchCase = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}`)
      if (!res.ok) throw new Error("Failed to fetch case")
      const data = await res.json()
      setCaseData(data.data || null)
    } catch (err) {
      console.error("Error fetching sourcing case:", err)
      toast.error("Failed to load sourcing case")
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchCase()
  }, [fetchCase])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleUpdateStatus = async () => {
    if (!newStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/status`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success("Status updated")
      setNewStatus("")
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssign = async () => {
    if (!assignEmail.trim()) return
    setAssigningAdmin(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/assign`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ adminUserId: assignEmail.trim() }),
      })
      if (!res.ok) throw new Error("Failed to assign admin")
      toast.success("Admin assigned")
      setAssignEmail("")
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to assign admin")
    } finally {
      setAssigningAdmin(false)
    }
  }

  const handleAddOutreach = async () => {
    if (!outreachForm.dealerName.trim()) {
      toast.error("Dealer name is required")
      return
    }
    setSubmittingOutreach(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/outreach`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(outreachForm),
      })
      if (!res.ok) throw new Error("Failed to add outreach")
      toast.success("Outreach logged")
      setOutreachForm({ dealerName: "", contactMethod: "EMAIL", outcome: "NO_RESPONSE", notes: "" })
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to add outreach")
    } finally {
      setSubmittingOutreach(false)
    }
  }

  const handleAddOffer = async () => {
    if (!offerForm.make.trim() || !offerForm.modelName.trim()) {
      toast.error("Make and model are required")
      return
    }
    setSubmittingOffer(true)
    try {
      const cashOtdCents = offerForm.cashOtdDollars
        ? Math.round(parseFloat(offerForm.cashOtdDollars) * 100)
        : null
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/offers`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({
          sourceDealerName: offerForm.sourceDealerName || null,
          year: offerForm.year ? parseInt(offerForm.year, 10) : null,
          make: offerForm.make,
          modelName: offerForm.modelName,
          trim: offerForm.trim || null,
          vin: offerForm.vin || null,
          mileage: offerForm.mileage ? parseInt(offerForm.mileage, 10) : null,
          condition: offerForm.condition,
          cashOtdCents,
          taxes: offerForm.taxes ? Math.round(parseFloat(offerForm.taxes) * 100) : null,
          fees: offerForm.fees ? Math.round(parseFloat(offerForm.fees) * 100) : null,
          expiresAt: offerForm.expiresAt || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to add offer")
      toast.success("Offer added")
      setOfferForm({
        sourceDealerName: "",
        year: "",
        make: "",
        modelName: "",
        trim: "",
        vin: "",
        mileage: "",
        condition: "USED",
        cashOtdDollars: "",
        taxes: "",
        fees: "",
        expiresAt: "",
      })
      setShowOfferForm(false)
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to add offer")
    } finally {
      setSubmittingOffer(false)
    }
  }

  const handleOfferAction = async (offerId: string, action: "present" | "withdraw") => {
    try {
      const res = await fetch(
        `/api/admin/sourcing/cases/${caseId}/offers/${offerId}/${action}`,
        { method: "POST", headers: csrfHeaders() },
      )
      if (!res.ok) throw new Error(`Failed to ${action} offer`)
      toast.success(`Offer ${action === "present" ? "presented to buyer" : "withdrawn"}`)
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error(`Failed to ${action} offer`)
    }
  }

  const handleInviteDealer = async () => {
    if (!inviteForm.dealerEmail.trim() || !inviteForm.dealerName.trim()) {
      toast.error("Dealer email and name are required")
      return
    }
    setSubmittingInvite(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/invite-dealer`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify(inviteForm),
      })
      if (!res.ok) throw new Error("Failed to invite dealer")
      toast.success("Dealer invite sent")
      setInviteForm({ dealerEmail: "", dealerName: "" })
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to invite dealer")
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Note content is required")
      return
    }
    setSubmittingNote(true)
    try {
      const res = await fetch(`/api/admin/sourcing/cases/${caseId}/notes`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ content: noteContent.trim(), isInternal: true }),
      })
      if (!res.ok) throw new Error("Failed to add note")
      toast.success("Note added")
      setNoteContent("")
      await fetchCase()
    } catch (err) {
      console.error(err)
      toast.error("Failed to add note")
    } finally {
      setSubmittingNote(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const offerStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: "outline",
      PENDING_PRESENT: "secondary",
      PRESENTED: "default",
      ACCEPTED: "default",
      DECLINED: "destructive",
      WITHDRAWN: "destructive",
      EXPIRED: "outline",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!caseData) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">Case not found</p>
          <Button variant="outline" asChild>
            <Link href="/admin/sourcing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Link>
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const showDealerInvite =
    caseData.status === "OFFER_SELECTED" ||
    caseData.status === "DEAL_IN_PROGRESS" ||
    caseData.status === "CLOSED"

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/sourcing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Sourcing Case</h1>
              <p className="text-sm text-muted-foreground font-mono">{caseId}</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchCase}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* A) Buyer Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Buyer Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">
                  {caseData.buyer
                    ? `${caseData.buyer.firstName} ${caseData.buyer.lastName}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{caseData.buyer?.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Market ZIP / Radius</Label>
                <p className="font-medium">
                  {caseData.marketZip
                    ? `${caseData.marketZip} (${caseData.marketRadiusMiles ?? "—"} mi)`
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">{formatDate(caseData.createdAt)}</p>
              </div>
            </div>
            {caseData.prequalSnapshot && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <Label className="text-muted-foreground text-xs">Prequal Snapshot</Label>
                <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(caseData.prequalSnapshot, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* B) Request Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Request Items
            </CardTitle>
            <CardDescription>
              {caseData.items.length} vehicle{caseData.items.length !== 1 ? "s" : ""} requested
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {caseData.items.map((item, idx) => (
                <Card key={item.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold">
                      Item {idx + 1}:{" "}
                      {[item.year, item.make, item.modelName, item.trim]
                        .filter(Boolean)
                        .join(" ") || "Any Vehicle"}
                    </p>
                    {item.maxMileage && (
                      <p className="text-sm text-muted-foreground">
                        Max mileage: {item.maxMileage.toLocaleString()}
                      </p>
                    )}
                    {item.maxBudgetCents != null && item.maxBudgetCents > 0 && !item.maxTotalOtdBudgetCents && !item.maxMonthlyPaymentCents && (
                      <p className="text-sm text-muted-foreground">
                        Legacy Budget: {formatCurrency(item.maxBudgetCents)}
                      </p>
                    )}
                    {item.budgetType && (
                      <p className="text-sm text-muted-foreground">
                        Budget Type:{" "}
                        {item.budgetType === "TOTAL_PRICE" ? "Total Out-the-Door" :
                         item.budgetType === "MONTHLY_PAYMENT" ? "Monthly Payment" :
                         item.budgetType === "MONTHLY" ? "Monthly" : "Total Price"}
                      </p>
                    )}
                    {item.maxTotalOtdBudgetCents != null && (
                      <p className="text-sm text-muted-foreground">
                        Total OTD Budget: {formatCurrency(item.maxTotalOtdBudgetCents)}
                      </p>
                    )}
                    {item.maxMonthlyPaymentCents != null && (
                      <p className="text-sm text-muted-foreground">
                        Max Monthly Payment: {formatCurrency(item.maxMonthlyPaymentCents)}
                      </p>
                    )}
                    {item.desiredDownPaymentCents != null && (
                      <p className="text-sm text-muted-foreground">
                        Desired Down Payment: {formatCurrency(item.desiredDownPaymentCents)}
                      </p>
                    )}
                    {item.condition && (
                      <p className="text-sm text-muted-foreground">Condition: {item.condition}</p>
                    )}
                    {item.fuelType && (
                      <p className="text-sm text-muted-foreground">Fuel: {item.fuelType}</p>
                    )}
                    {item.bodyStyle && (
                      <p className="text-sm text-muted-foreground">Body: {item.bodyStyle}</p>
                    )}
                    {item.color && (
                      <p className="text-sm text-muted-foreground">Color: {item.color}</p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {caseData.items.length === 0 && (
                <p className="text-muted-foreground col-span-3">No items specified</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C) Status Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <Label className="text-muted-foreground text-xs">Current Status</Label>
                <div className="mt-1">
                  <Badge variant="default">{caseData.status}</Badge>
                </div>
              </div>
              {caseData.adminSubStatus && (
                <div>
                  <Label className="text-muted-foreground text-xs">Sub-Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{caseData.adminSubStatus}</Badge>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Assigned</Label>
                <p className="mt-1 text-sm font-medium">
                  {caseData.assignedAdmin?.email || "Unassigned"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="newStatus">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="newStatus" className="w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleUpdateStatus} disabled={!newStatus || updatingStatus}>
                  {updatingStatus ? "Updating…" : "Update"}
                </Button>
              </div>

              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="assignAdmin">Assign Admin</Label>
                  <Input
                    id="assignAdmin"
                    placeholder="Admin user ID"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    className="w-56"
                    onKeyDown={(e) => e.key === "Enter" && handleAssign()}
                  />
                </div>
                <Button onClick={handleAssign} disabled={!assignEmail.trim() || assigningAdmin}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {assigningAdmin ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* D) Outreach Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Outreach Log
            </CardTitle>
            <CardDescription>
              {caseData.outreachLogs.length} outreach{caseData.outreachLogs.length !== 1 ? " entries" : " entry"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.outreachLogs.length > 0 && (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseData.outreachLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{log.dealerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.contactMethod}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.outcome === "INTERESTED"
                                ? "default"
                                : log.outcome === "DECLINED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.admin?.email || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add Outreach Form */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Add Outreach</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="outDealerName">Dealer Name</Label>
                  <Input
                    id="outDealerName"
                    placeholder="Dealer name"
                    value={outreachForm.dealerName}
                    onChange={(e) =>
                      setOutreachForm((f) => ({ ...f, dealerName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Method</Label>
                  <Select
                    value={outreachForm.contactMethod}
                    onValueChange={(v) =>
                      setOutreachForm((f) => ({ ...f, contactMethod: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Outcome</Label>
                  <Select
                    value={outreachForm.outcome}
                    onValueChange={(v) =>
                      setOutreachForm((f) => ({ ...f, outcome: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTREACH_OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="outNotes">Notes</Label>
                  <Textarea
                    id="outNotes"
                    placeholder="Optional notes…"
                    rows={1}
                    value={outreachForm.notes}
                    onChange={(e) =>
                      setOutreachForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button onClick={handleAddOutreach} disabled={submittingOutreach}>
                <Plus className="h-4 w-4 mr-1" />
                {submittingOutreach ? "Saving…" : "Add Outreach"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* E) Offer Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Offer Management
            </CardTitle>
            <CardDescription>
              {caseData.offers.length} offer{caseData.offers.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.offers.length > 0 && (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Cash OTD</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseData.offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>{offerStatusBadge(offer.status)}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {[offer.year, offer.make, offer.modelName, offer.trim]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {offer.vin || "—"}
                        </TableCell>
                        <TableCell>
                          {offer.mileage != null
                            ? offer.mileage.toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {offer.cashOtdCents != null
                            ? formatCurrency(offer.cashOtdCents)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {offer.sourceType || offer.sourceDealerName || "Admin"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {offer.expiresAt ? formatDate(offer.expiresAt) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(offer.status === "DRAFT" ||
                              offer.status === "PENDING_PRESENT") && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOfferAction(offer.id, "present")}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Present
                              </Button>
                            )}
                            {offer.status === "PRESENTED" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOfferAction(offer.id, "withdraw")}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add Offer Form */}
            {!showOfferForm ? (
              <Button variant="outline" onClick={() => setShowOfferForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Offer (Admin Entered)
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">New Offer</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOfferForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Source Dealer</Label>
                    <Input
                      placeholder="Dealer name"
                      value={offerForm.sourceDealerName}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, sourceDealerName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Year</Label>
                    <Input
                      placeholder="2024"
                      value={offerForm.year}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, year: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Make</Label>
                    <Input
                      placeholder="Toyota"
                      value={offerForm.make}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, make: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Model</Label>
                    <Input
                      placeholder="Camry"
                      value={offerForm.modelName}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, modelName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Trim</Label>
                    <Input
                      placeholder="SE"
                      value={offerForm.trim}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, trim: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>VIN</Label>
                    <Input
                      placeholder="VIN"
                      value={offerForm.vin}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, vin: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Mileage</Label>
                    <Input
                      placeholder="25000"
                      value={offerForm.mileage}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, mileage: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Condition</Label>
                    <Select
                      value={offerForm.condition}
                      onValueChange={(v) =>
                        setOfferForm((f) => ({ ...f, condition: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Cash OTD ($)</Label>
                    <Input
                      placeholder="32000.00"
                      value={offerForm.cashOtdDollars}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, cashOtdDollars: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Taxes ($)</Label>
                    <Input
                      placeholder="2100.00"
                      value={offerForm.taxes}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, taxes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fees ($)</Label>
                    <Input
                      placeholder="500.00"
                      value={offerForm.fees}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, fees: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Expires At</Label>
                    <Input
                      type="date"
                      value={offerForm.expiresAt}
                      onChange={(e) =>
                        setOfferForm((f) => ({ ...f, expiresAt: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleAddOffer} disabled={submittingOffer}>
                  <Plus className="h-4 w-4 mr-1" />
                  {submittingOffer ? "Adding…" : "Add Offer"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* F) Dealer Invite */}
        {showDealerInvite && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Dealer Invite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.dealerInvite ? (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        caseData.dealerInvite.status === "SENT"
                          ? "secondary"
                          : caseData.dealerInvite.status === "ACCEPTED"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {caseData.dealerInvite.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Sent {formatDate(caseData.dealerInvite.sentAt)}
                    </span>
                  </div>
                  <p className="font-medium">{caseData.dealerInvite.dealerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {caseData.dealerInvite.dealerEmail}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="inviteDealerName">Dealer Name</Label>
                    <Input
                      id="inviteDealerName"
                      placeholder="Dealer name"
                      value={inviteForm.dealerName}
                      onChange={(e) =>
                        setInviteForm((f) => ({ ...f, dealerName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="inviteDealerEmail">Dealer Email</Label>
                    <Input
                      id="inviteDealerEmail"
                      placeholder="dealer@example.com"
                      value={inviteForm.dealerEmail}
                      onChange={(e) =>
                        setInviteForm((f) => ({ ...f, dealerEmail: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handleInviteDealer} disabled={submittingInvite}>
                    <Send className="h-4 w-4 mr-1" />
                    {submittingInvite ? "Sending…" : "Invite Dealer"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* G) Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Internal Notes
            </CardTitle>
            <CardDescription>
              {(caseData.notes?.length ?? 0)} note{(caseData.notes?.length ?? 0) !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Add an internal note…"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || submittingNote}
                >
                  {submittingNote ? "Adding…" : "Add Note"}
                </Button>
              </div>
            </div>
            {(caseData.notes?.length ?? 0) > 0 && (
              <div className="space-y-3 border-t pt-4">
                {caseData.notes.map((note) => (
                  <div key={note.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {note.authorRole} &middot; {note.authorUserId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* H) Event Log / Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Event Log
            </CardTitle>
            <CardDescription>
              {caseData.events.length} event{caseData.events.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {caseData.events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No events recorded</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caseData.events.map((evt) => (
                      <TableRow key={evt.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(evt.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">{evt.actor || "System"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{evt.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {evt.beforeValue || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {evt.afterValue || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {evt.notes || "—"}
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
    </ProtectedRoute>
  )
}
