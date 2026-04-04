"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, RefreshCw, XCircle, CheckCircle, AlertCircle } from "lucide-react"

interface DealerAgreementActionsProps {
  dealerId: string
  agreementStatus: string
  onActionComplete?: () => void
}

export function DealerAgreementActions({
  dealerId,
  agreementStatus,
  onActionComplete,
}: DealerAgreementActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [manualNote, setManualNote] = useState("")
  const [voidReason, setVoidReason] = useState("")

  const canResend = ["SENT", "DELIVERED", "VIEWED", "REQUIRED", "VOIDED", "DECLINED", "EXPIRED"].includes(agreementStatus)
  const canVoid = ["SENT", "DELIVERED", "VIEWED", "SIGNED"].includes(agreementStatus)
  const canManualComplete = agreementStatus !== "COMPLETED"

  const handleAction = async (action: "resend" | "void" | "manual-complete", body?: Record<string, string>) => {
    setLoading(action)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/dealers/${dealerId}/agreement/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message || `Failed to ${action}`)
      }

      setSuccess(`Agreement ${action} completed successfully.`)
      onActionComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Admin Actions</h4>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Resend */}
        {canResend && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null}
            onClick={() => handleAction("resend")}
          >
            {loading === "resend" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Resend Agreement
          </Button>
        )}

        {/* Void */}
        {canVoid && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={loading !== null}>
                <XCircle className="mr-2 h-4 w-4" />
                Void Agreement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Void Agreement</DialogTitle>
                <DialogDescription>
                  This will void the current agreement and block the dealer until a new
                  agreement is sent. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Reason for voiding (optional)"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={loading !== null}
                  onClick={() => handleAction("void", { reason: voidReason })}
                >
                  {loading === "void" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm Void
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Manual Complete */}
        {canManualComplete && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" disabled={loading !== null}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Manual Complete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Complete (Emergency Override)</DialogTitle>
                <DialogDescription>
                  Manually mark this agreement as completed. This should only be used for
                  DocuSign outages or legal exceptions. A note is required for the audit trail.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Admin note (required) — explain the reason for manual completion"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
              />
              <DialogFooter>
                <Button
                  disabled={loading !== null || !manualNote.trim()}
                  onClick={() => handleAction("manual-complete", { note: manualNote })}
                >
                  {loading === "manual-complete" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm Manual Complete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
