"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { VehicleLoadingSkeleton, VehicleEmptyState } from "@/components/vehicles"
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface OfferContext {
  inviteId: string
  dealerName: string | null
  vehicleSpecs: Array<{
    yearMin: number
    yearMax: number
    make: string
    model: string | null
    trim: string | null
    budgetTargetCents: number
    mileageMax: number | null
  }> | null
  expiresAt: string
}

type TokenState = "loading" | "valid" | "expired" | "consumed" | "invalid" | "submitted"

export default function DealerQuickOfferPage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<TokenState>("loading")
  const [context, setContext] = useState<OfferContext | null>(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    vin: "",
    year: "",
    make: "",
    model: "",
    trim: "",
    mileage: "",
    priceCents: "",
    conditionNotes: "",
    availableDate: "",
    notes: "",
  })

  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch(`/api/dealer/quick-offer/${token}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          setState(data.state ?? "invalid")
          setError(data.error ?? "Invalid invitation")
          return
        }

        setContext(data.data)
        setState("valid")
      } catch {
        setState("invalid")
        setError("Failed to load invitation")
      }
    }

    if (token) loadContext()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dealer/quick-offer/${token}/submit`, {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: form.year ? Number(form.year) : undefined,
          mileage: form.mileage ? Number(form.mileage) : undefined,
          priceCents: form.priceCents ? Math.round(Number(form.priceCents) * 100) : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to submit")
        return
      }

      setState("submitted")
    } catch {
      setError("Failed to submit offer")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Error/status states ──
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <VehicleLoadingSkeleton variant="compact" count={1} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6 space-y-4">
            <Clock className="mx-auto h-12 w-12 text-yellow-500" />
            <h2 className="text-xl font-semibold">Invitation Expired</h2>
            <p className="text-muted-foreground">
              This invitation link has expired. Contact AutoLenis to request a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "consumed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-blue-500" />
            <h2 className="text-xl font-semibold">Already Responded</h2>
            <p className="text-muted-foreground">
              You have already submitted a response to this invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6 space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">Invalid Invitation</h2>
            <p className="text-muted-foreground">{error || "This invitation link is not valid."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6 space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Offer Submitted!</h2>
            <p className="text-muted-foreground">
              Your provisional offer has been submitted. The AutoLenis team will review it and contact you with next steps.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Interested in becoming an AutoLenis partner dealer?{" "}
              <a href="/dealer-application" className="text-blue-600 underline">
                Apply here
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Valid state: show form ──
  const specs = context?.vehicleSpecs
  const expiresAt = context?.expiresAt ? new Date(context.expiresAt) : null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit a Quick Offer</CardTitle>
            <CardDescription>
              {context?.dealerName
                ? `Welcome, ${context.dealerName}. `
                : ""}
              A buyer on AutoLenis is looking for a vehicle that you may have in stock.
              Submit your best offer below.
            </CardDescription>
            {expiresAt && (
              <p className="text-sm text-muted-foreground">
                This invitation expires on {expiresAt.toLocaleDateString()}.
              </p>
            )}
          </CardHeader>
        </Card>

        {specs && specs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buyer is Looking For</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specs.map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {s.yearMin}–{s.yearMax} {s.make} {s.model || "Any Model"}
                    </Badge>
                    {s.trim && <Badge variant="secondary">{s.trim}</Badge>}
                    <Badge variant="secondary">
                      Budget: ${(s.budgetTargetCents / 100).toLocaleString()}
                    </Badge>
                    {s.mileageMax && (
                      <Badge variant="secondary">
                        Max {s.mileageMax.toLocaleString()} mi
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <AlertCircle className="inline h-3 w-3 mr-1" />
                Buyer identity is kept anonymous until a deal is committed.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Vehicle Offer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={form.vin}
                    onChange={(e) => setForm({ ...form, vin: e.target.value })}
                    placeholder="17-character VIN"
                    maxLength={17}
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trim">Trim</Label>
                  <Input
                    id="trim"
                    value={form.trim}
                    onChange={(e) => setForm({ ...form, trim: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Asking Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.priceCents}
                    onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="availableDate">Available Date</Label>
                  <Input
                    id="availableDate"
                    type="date"
                    value={form.availableDate}
                    onChange={(e) => setForm({ ...form, availableDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="conditionNotes">Condition Notes</Label>
                <Input
                  id="conditionNotes"
                  value={form.conditionNotes}
                  onChange={(e) => setForm({ ...form, conditionNotes: e.target.value })}
                  placeholder="e.g., Excellent condition, no accidents"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any other details"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Offer"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to AutoLenis{" "}
                <a href="/terms" className="underline">Terms of Service</a>.
                This is a provisional offer subject to further review.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
