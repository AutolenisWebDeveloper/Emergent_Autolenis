"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { CreditCard, Loader2, Save, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface AdminPrequalManagerProps {
  buyerId: string
  preQual: any
  onUpdate: () => void
}

const CREDIT_TIERS = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"] as const
const PREQUAL_STATUSES = ["ACTIVE", "EXPIRED", "REVOKED", "FAILED", "PENDING"] as const

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active (Shopping Enabled)", color: "bg-green-100 text-green-800" },
  EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-800" },
  REVOKED: { label: "Revoked", color: "bg-red-100 text-red-800" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-800" },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
}

export function AdminPrequalManager({ buyerId, preQual, onUpdate }: AdminPrequalManagerProps) {
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Form state
  const [creditTier, setCreditTier] = useState(preQual?.creditTier || "GOOD")
  const [maxOtdDollars, setMaxOtdDollars] = useState(
    preQual?.maxOtdAmountCents ? String(preQual.maxOtdAmountCents / 100) : preQual?.maxOtd ? String(preQual.maxOtd) : ""
  )
  const [minMonthlyDollars, setMinMonthlyDollars] = useState(
    preQual?.minMonthlyPaymentCents ? String(preQual.minMonthlyPaymentCents / 100) : preQual?.estimatedMonthlyMin ? String(preQual.estimatedMonthlyMin) : ""
  )
  const [maxMonthlyDollars, setMaxMonthlyDollars] = useState(
    preQual?.maxMonthlyPaymentCents ? String(preQual.maxMonthlyPaymentCents / 100) : preQual?.estimatedMonthlyMax ? String(preQual.estimatedMonthlyMax) : ""
  )
  const [dtiRatio, setDtiRatio] = useState(preQual?.dtiRatio != null ? String(preQual.dtiRatio) : "")
  const [creditScore, setCreditScore] = useState(preQual?.creditScore != null ? String(preQual.creditScore) : "")
  const [note, setNote] = useState("")

  // Status override state
  const [statusOverride, setStatusOverride] = useState(preQual?.status || "ACTIVE")
  const [statusNote, setStatusNote] = useState("")

  // Sync form when preQual changes externally
  useEffect(() => {
    if (preQual) {
      setCreditTier(preQual.creditTier || "GOOD")
      setMaxOtdDollars(preQual.maxOtdAmountCents ? String(preQual.maxOtdAmountCents / 100) : preQual.maxOtd ? String(preQual.maxOtd) : "")
      setMinMonthlyDollars(preQual.minMonthlyPaymentCents ? String(preQual.minMonthlyPaymentCents / 100) : preQual.estimatedMonthlyMin ? String(preQual.estimatedMonthlyMin) : "")
      setMaxMonthlyDollars(preQual.maxMonthlyPaymentCents ? String(preQual.maxMonthlyPaymentCents / 100) : preQual.estimatedMonthlyMax ? String(preQual.estimatedMonthlyMax) : "")
      setDtiRatio(preQual.dtiRatio != null ? String(preQual.dtiRatio) : "")
      setCreditScore(preQual.creditScore != null ? String(preQual.creditScore) : "")
      setStatusOverride(preQual.status || "ACTIVE")
    }
  }, [preQual])

  // Load audit events
  const loadAuditEvents = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res = await fetch(`/api/admin/buyers/${buyerId}/prequal`)
      const json = await res.json()
      if (json.success && json.data?.auditEvents) {
        setAuditEvents(json.data.auditEvents)
      }
    } catch {
      // silent
    } finally {
      setAuditLoading(false)
    }
  }, [buyerId])

  useEffect(() => {
    loadAuditEvents()
  }, [loadAuditEvents])

  const handleSavePrequal = async () => {
    setMessage(null)
    if (!note.trim()) {
      setMessage({ type: "error", text: "Admin note/reason is required" })
      return
    }
    const maxOtdCents = Math.round(parseFloat(maxOtdDollars || "0") * 100)
    if (maxOtdCents <= 0) {
      setMessage({ type: "error", text: "Max OTD Amount must be greater than $0" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/buyers/${buyerId}/prequal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          creditTier,
          maxOtdAmountCents: maxOtdCents,
          minMonthlyPaymentCents: minMonthlyDollars ? Math.round(parseFloat(minMonthlyDollars) * 100) : null,
          maxMonthlyPaymentCents: maxMonthlyDollars ? Math.round(parseFloat(maxMonthlyDollars) * 100) : null,
          dtiRatio: dtiRatio ? parseFloat(dtiRatio) : null,
          creditScore: creditScore ? parseInt(creditScore, 10) : null,
          status: "ACTIVE",
          note: note.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage({ type: "success", text: `Prequal ${json.action === "CREATED" ? "created" : "updated"} successfully` })
        setNote("")
        onUpdate()
        loadAuditEvents()
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save prequal" })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    setMessage(null)
    if (!statusNote.trim()) {
      setMessage({ type: "error", text: "Admin note/reason is required for status changes" })
      return
    }

    setStatusLoading(true)
    try {
      const res = await fetch(`/api/admin/buyers/${buyerId}/prequal/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          status: statusOverride,
          note: statusNote.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage({ type: "success", text: `Status changed to ${statusOverride}` })
        setStatusNote("")
        onUpdate()
        loadAuditEvents()
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to update status" })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error" })
    } finally {
      setStatusLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

  return (
    <div className="space-y-6" data-testid="admin-prequal-manager">
      {/* Status banner */}
      {message && (
        <div
          data-testid="prequal-message"
          className={`flex items-center gap-2 p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Pre-Qualification State
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preQual ? (
            <div className="grid gap-6 md:grid-cols-2">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd>
                    <span
                      data-testid="prequal-current-status"
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        STATUS_LABELS[preQual.status]?.color || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[preQual.status]?.label || preQual.status || "UNKNOWN"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Max OTD (Shopping Budget)</dt>
                  <dd data-testid="prequal-current-maxotd" className="text-xl font-bold text-green-600">
                    {formatCurrency(preQual.maxOtd || (preQual.maxOtdAmountCents || 0) / 100)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Credit Tier</dt>
                  <dd className="font-medium">{preQual.creditTier || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">DTI Ratio</dt>
                  <dd className="font-medium">
                    {preQual.dtiRatio != null ? `${preQual.dtiRatio}%` : preQual.dti ? `${(preQual.dti * 100).toFixed(1)}%` : "-"}
                  </dd>
                </div>
              </dl>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Monthly Payment Range</dt>
                  <dd className="font-medium">
                    {formatCurrency(preQual.estimatedMonthlyMin || (preQual.minMonthlyPaymentCents || 0) / 100)} –{" "}
                    {formatCurrency(preQual.estimatedMonthlyMax || (preQual.maxMonthlyPaymentCents || 0) / 100)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Source</dt>
                  <dd className="font-medium">{preQual.providerName || preQual.source || "INTERNAL"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Expires</dt>
                  <dd className="font-medium">{preQual.expiresAt ? formatDate(preQual.expiresAt) : "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Last Updated</dt>
                  <dd className="font-medium">{preQual.updatedAt ? formatDate(preQual.updatedAt) : preQual.createdAt ? formatDate(preQual.createdAt) : "-"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-muted-foreground">No pre-qualification record exists for this buyer.</p>
          )}
        </CardContent>
      </Card>

      {/* Admin Manual Prequal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {preQual ? "Update Pre-Qualification" : "Create Pre-Qualification"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="creditTier">Credit Tier</Label>
                <Select value={creditTier} onValueChange={setCreditTier}>
                  <SelectTrigger id="creditTier" data-testid="prequal-credit-tier-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_TIERS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxOtd">Max OTD Amount (Shopping Budget) $</Label>
                <Input
                  id="maxOtd"
                  data-testid="prequal-max-otd-input"
                  type="number"
                  min="0"
                  step="100"
                  value={maxOtdDollars}
                  onChange={(e) => setMaxOtdDollars(e.target.value)}
                  placeholder="e.g. 35000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minMonthly">Min Monthly Payment $</Label>
                <Input
                  id="minMonthly"
                  data-testid="prequal-min-monthly-input"
                  type="number"
                  min="0"
                  step="10"
                  value={minMonthlyDollars}
                  onChange={(e) => setMinMonthlyDollars(e.target.value)}
                  placeholder="e.g. 350"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMonthly">Max Monthly Payment $</Label>
                <Input
                  id="maxMonthly"
                  data-testid="prequal-max-monthly-input"
                  type="number"
                  min="0"
                  step="10"
                  value={maxMonthlyDollars}
                  onChange={(e) => setMaxMonthlyDollars(e.target.value)}
                  placeholder="e.g. 650"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dtiRatio">DTI Ratio (%)</Label>
                <Input
                  id="dtiRatio"
                  data-testid="prequal-dti-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dtiRatio}
                  onChange={(e) => setDtiRatio(e.target.value)}
                  placeholder="e.g. 32.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditScore">Credit Score (optional)</Label>
                <Input
                  id="creditScore"
                  data-testid="prequal-credit-score-input"
                  type="number"
                  min="300"
                  max="850"
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  placeholder="e.g. 720"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Admin Note / Reason (required)</Label>
              <Textarea
                id="note"
                data-testid="prequal-admin-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for creating/updating this prequal..."
                rows={3}
              />
            </div>

            <Button
              data-testid="prequal-save-button"
              onClick={handleSavePrequal}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {preQual ? "Update Pre-Qualification" : "Create Pre-Qualification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Override */}
      {preQual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Change Pre-Qualification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="statusOverride">New Status</Label>
                  <Select value={statusOverride} onValueChange={setStatusOverride}>
                    <SelectTrigger id="statusOverride" data-testid="prequal-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREQUAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]?.label || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusNote">Reason for Status Change (required)</Label>
                <Textarea
                  id="statusNote"
                  data-testid="prequal-status-note"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Reason for changing status..."
                  rows={2}
                />
              </div>
              <Button
                data-testid="prequal-status-save-button"
                variant="outline"
                onClick={handleStatusChange}
                disabled={statusLoading || statusOverride === preQual.status}
              >
                {statusLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Prequal Audit Trail
            {auditLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditEvents.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {auditEvents.map((evt: any) => (
                <div key={evt.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{evt.eventType}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(evt.createdAt)}</span>
                  </div>
                  {evt.details?.note && (
                    <p className="text-muted-foreground mt-1">Note: {evt.details.note}</p>
                  )}
                  {evt.details?.previousStatus && evt.details?.newStatus && (
                    <p className="text-xs mt-1">
                      Status: {evt.details.previousStatus} → {evt.details.newStatus}
                    </p>
                  )}
                  {evt.details?.action && (
                    <p className="text-xs mt-1">Action: {evt.details.action}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No audit events yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
