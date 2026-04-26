"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Car, Clock, CheckCircle2, XCircle, Search, ChevronRight } from "lucide-react"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { csrfHeaders } from "@/lib/csrf-client"

interface VehicleRequest {
  id: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  maxBudget: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  offersCount?: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  OPEN: { label: "Open", variant: "default" },
  IN_REVIEW: { label: "In Review", variant: "secondary" },
  MATCHED: { label: "Matched", variant: "default" },
  FULFILLED: { label: "Fulfilled", variant: "default" },
  CLOSED: { label: "Closed", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

export default function VehicleRequestsPage() {
  const [requests, setRequests] = useState<VehicleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ year: "", make: "", model: "", trim: "", maxBudget: "", notes: "" })
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/buyer/vehicle-requests")
      const data = await res.json()
      setRequests(data?.data?.requests || data?.requests || [])
    } catch {
      // Empty state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch("/api/buyer/vehicle-requests", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          year: form.year ? Number(form.year) : null,
          make: form.make || null,
          model: form.model || null,
          trim: form.trim || null,
          maxBudget: form.maxBudget ? Number(form.maxBudget) * 100 : null,
          notes: form.notes || null,
        }),
      })
      setShowForm(false)
      setForm({ year: "", make: "", model: "", trim: "", maxBudget: "", notes: "" })
      fetchRequests()
    } catch {
      // Handle error
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" data-testid="vehicle-requests-loading">
        <h1 className="text-2xl font-semibold tracking-tight">Vehicle Requests</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
    <div className="space-y-6" data-testid="vehicle-requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicle Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us what you&apos;re looking for and we&apos;ll find it for you.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="new-request-btn">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {showForm && (
        <Card data-testid="new-request-form">
          <CardHeader>
            <CardTitle className="text-lg">Describe the vehicle you want</CardTitle>
            <CardDescription>Provide as much detail as you can. Our team will source matching vehicles for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Year (e.g. 2025)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} data-testid="request-year" />
              <Input placeholder="Make (e.g. Toyota)" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} data-testid="request-make" />
              <Input placeholder="Model (e.g. Camry)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} data-testid="request-model" />
              <Input placeholder="Trim (e.g. XSE)" value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} data-testid="request-trim" />
            </div>
            <Input placeholder="Max budget ($)" value={form.maxBudget} onChange={(e) => setForm({ ...form, maxBudget: e.target.value })} data-testid="request-budget" />
            <Textarea placeholder="Additional notes (color preference, features, etc.)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="request-notes" />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting} data-testid="submit-request-btn">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card className="border-dashed" data-testid="no-requests-empty">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No vehicle requests yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Can&apos;t find what you&apos;re looking for in our inventory? Submit a request and our team will source it for you.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" data-testid="requests-list">
          {requests.map((req) => {
            const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.OPEN
            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Car className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {[req.year, req.make, req.model, req.trim].filter(Boolean).join(" ") || "Any Vehicle"}
                      </p>
                      {req.maxBudget && (
                        <p className="text-sm text-muted-foreground">
                          Budget: ${(req.maxBudget / 100).toLocaleString()}
                        </p>
                      )}
                      {req.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {req.offersCount && req.offersCount > 0 && (
                      <Badge variant="outline">{req.offersCount} offer{req.offersCount > 1 ? "s" : ""}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
    </ProtectedRoute>
  )
}
