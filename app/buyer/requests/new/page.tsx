"use client"

import { useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Car,
  SlidersHorizontal,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { csrfHeaders } from "@/lib/csrf-client"
import { US_STATES } from "@/lib/data/us-states"
import { VEHICLE_MAKE_LIST, getModelsForMake } from "@/lib/data/vehicle-makes"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestItem {
  vehicleType: string
  condition: string
  yearMin: string
  yearMax: string
  make: string
  model: string
  openToSimilar: boolean
  trim: string
  budgetType: string
  maxTotalOtdBudgetDollars: string
  maxMonthlyPaymentDollars: string
  desiredDownPaymentDollars: string
  mileageMax: string
  mustHaveFeatures: string
  colors: string
  distancePreference: string
  maxDistanceMiles: string
  timeline: string
  vin: string
  notes: string
}

function emptyItem(): RequestItem {
  return {
    vehicleType: "CAR",
    condition: "EITHER",
    yearMin: "",
    yearMax: "",
    make: "",
    model: "",
    openToSimilar: false,
    trim: "",
    budgetType: "TOTAL_PRICE",
    maxTotalOtdBudgetDollars: "",
    maxMonthlyPaymentDollars: "",
    desiredDownPaymentDollars: "",
    mileageMax: "",
    mustHaveFeatures: "",
    colors: "",
    distancePreference: "EITHER",
    maxDistanceMiles: "",
    timeline: "FIFTEEN_30_DAYS",
    vin: "",
    notes: "",
  }
}

// ---------------------------------------------------------------------------
// Step labels & helpers
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Location", icon: MapPin },
  { label: "Vehicle", icon: Car },
  { label: "Preferences", icon: SlidersHorizontal },
  { label: "Review", icon: ClipboardCheck },
] as const

const TIMELINE_LABELS: Record<string, string> = {
  ZERO_7_DAYS: "ASAP (0–7 days)",
  EIGHT_14_DAYS: "1–2 weeks",
  FIFTEEN_30_DAYS: "15–30 days",
  THIRTY_PLUS_DAYS: "Flexible (30+ days)",
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  USED: "Used",
  EITHER: "Either",
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: "Car",
  SUV: "SUV",
  TRUCK: "Truck",
  VAN: "Van",
}

const DELIVERY_LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  EITHER: "Either",
}

function formatCurrency(val: string): string {
  const num = Number(val)
  return isNaN(num) ? val : `$${num.toLocaleString()}`
}

/** Extract the user-facing error message from the backend's JSON response. */
function extractErrorMessage(data: Record<string, unknown>): string | null {
  if (typeof data.error === "object" && data.error !== null) {
    return (data.error as { message?: string }).message ?? null
  }
  if (typeof data.error === "string") {
    return data.error
  }
  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewBuyerRequestPage() {
  const { toast } = useToast()

  // Wizard state
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null)

  // Step 1: Location
  const [state, setState] = useState("")
  const [marketZip, setMarketZip] = useState("")
  const [city, setCity] = useState("")
  const [radiusMiles, setRadiusMiles] = useState("50")

  // Step 2: Vehicle items
  const [items, setItems] = useState<RequestItem[]>([emptyItem()])

  // Step 3: Preferences (per item - but for simplicity we apply to first item)
  // These are already part of each item

  // Step 4: Consent
  const [consentChecked, setConsentChecked] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Make filter for typeahead
  const [makeSearch, setMakeSearch] = useState<Record<number, string>>({})

  function updateItem(index: number, field: keyof RequestItem, value: string | boolean) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Reset model when make changes
      if (field === "make") {
        next[index].model = ""
      }
      return next
    })
  }

  function addItem() {
    if (items.length >= 3) return
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validateStep(s: number): string | null {
    switch (s) {
      case 0: {
        if (!state) return "Please select a state."
        if (!marketZip.trim()) return "ZIP code is required."
        if (!/^\d{5}(-\d{4})?$/.test(marketZip.trim())) return "Enter a valid 5-digit ZIP code."
        return null
      }
      case 1: {
        for (let i = 0; i < items.length; i++) {
          const it = items[i]
          if (!it.make.trim()) return `Vehicle ${i + 1}: Make is required.`
          if (it.yearMin && it.yearMax && Number(it.yearMin) > Number(it.yearMax)) {
            return `Vehicle ${i + 1}: Min year cannot exceed max year.`
          }
          if (it.condition === "USED" && !it.mileageMax) {
            return `Vehicle ${i + 1}: Max mileage is required for used vehicles.`
          }
          // Budget validation for new budget types
          if (it.budgetType === "TOTAL_PRICE") {
            if (!it.maxTotalOtdBudgetDollars || Number(it.maxTotalOtdBudgetDollars) <= 0) {
              return `Vehicle ${i + 1}: Total Out-the-Door Budget is required and must be greater than $0.`
            }
            if (!it.desiredDownPaymentDollars || Number(it.desiredDownPaymentDollars) < 0) {
              return `Vehicle ${i + 1}: Desired Down Payment is required.`
            }
          }
          if (it.budgetType === "MONTHLY_PAYMENT") {
            if (!it.maxMonthlyPaymentDollars || Number(it.maxMonthlyPaymentDollars) <= 0) {
              return `Vehicle ${i + 1}: Maximum Monthly Payment is required and must be greater than $0.`
            }
            if (!it.desiredDownPaymentDollars || Number(it.desiredDownPaymentDollars) < 0) {
              return `Vehicle ${i + 1}: Desired Down Payment is required.`
            }
          }
        }
        return null
      }
      case 2:
        return null // Preferences are optional
      case 3: {
        if (!consentChecked)
          return "You must consent to our data use and contact policy to continue."
        return null
      }
      default:
        return null
    }
  }

  function goNext() {
    const err = validateStep(step)
    if (err) {
      toast({ variant: "destructive", title: "Validation Error", description: err })
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit() {
    const err = validateStep(3)
    if (err) {
      toast({ variant: "destructive", title: "Validation Error", description: err })
      return
    }

    const payload = {
      marketZip: marketZip.trim(),
      radiusMiles: Number(radiusMiles) || 50,
      items: items.map((it) => ({
        vehicleType: it.vehicleType,
        condition: it.condition,
        yearMin: it.yearMin ? Number(it.yearMin) : undefined,
        yearMax: it.yearMax ? Number(it.yearMax) : undefined,
        make: it.make.trim(),
        model: it.model.trim() || undefined,
        openToSimilar: it.openToSimilar,
        trim: it.trim.trim() || undefined,
        budgetType: it.budgetType,
        maxTotalOtdBudgetCents: it.budgetType === "TOTAL_PRICE" && it.maxTotalOtdBudgetDollars
          ? Math.round(Number(it.maxTotalOtdBudgetDollars) * 100)
          : undefined,
        maxMonthlyPaymentCents: it.budgetType === "MONTHLY_PAYMENT" && it.maxMonthlyPaymentDollars
          ? Math.round(Number(it.maxMonthlyPaymentDollars) * 100)
          : undefined,
        desiredDownPaymentCents: it.desiredDownPaymentDollars
          ? Math.round(Number(it.desiredDownPaymentDollars) * 100)
          : undefined,
        mileageMax: it.mileageMax ? Number(it.mileageMax) : undefined,
        mustHaveFeatures: it.mustHaveFeatures
          ? it.mustHaveFeatures
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : [],
        colors: it.colors
          ? it.colors
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        distancePreference: it.distancePreference,
        maxDistanceMiles: it.maxDistanceMiles ? Number(it.maxDistanceMiles) : undefined,
        timeline: it.timeline,
        vin: it.vin.trim() || undefined,
        notes: it.notes.trim() || undefined,
      })),
      location: {
        state,
        zip: marketZip.trim(),
        city: city.trim() || undefined,
      },
    }

    setSubmitting(true)
    setServerError(null)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for submission

      // Generate idempotency key to prevent duplicate submissions
      const idempotencyKey = crypto.randomUUID()
      
      const res = await fetch("/api/buyer/requests", {
        method: "POST",
        headers: {
          ...csrfHeaders(),
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const responseData = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        // Extract the server's error message from the response body.
        // Supports both {error: {message}} and {error: "string"} shapes.
        const serverMsg = extractErrorMessage(responseData)

        // Handle specific HTTP status codes with appropriate messaging
        if (res.status === 401 || res.status === 403) {
          throw new Error(serverMsg || "Your session has expired. Please refresh the page and sign in again.")
        }
        if (res.status === 422) {
          throw new Error(serverMsg || "Please check your input and try again.")
        }
        if (res.status === 409) {
          throw new Error(serverMsg || "A duplicate request already exists. Please refresh and try again.")
        }
        if (res.status === 503) {
          // Genuine transient infrastructure issue — use server message or default
          throw new Error(serverMsg || "Service temporarily unavailable. Please wait a moment and try again.")
        }
        // For 500 and other errors, use the server's specific message
        throw new Error(serverMsg || "Unable to submit your request. Please try again.")
      }

      const caseId = responseData.data?.id ?? responseData.case?.id ?? responseData.id
      setCreatedCaseId(caseId ?? null)
      
      // Show warning if partial success
      if (responseData.warning) {
        toast({
          variant: "default",
          title: "Request Created",
          description: responseData.warning,
        })
      }
      
      setSubmitted(true)
    } catch (err) {
      let msg: string
      if (err instanceof Error && err.name === "AbortError") {
        msg = "Request timed out. Please check your connection and try again."
      } else {
        msg = err instanceof Error ? err.message : "Unable to submit your request. Please try again."
      }
      setServerError(msg)
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <ProtectedRoute allowedRoles={["BUYER"]}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Request Submitted</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Your vehicle request has been received. Our sourcing team will review it and
                  begin matching you with dealers in your area.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-left space-y-1">
                <p className="font-medium">What happens next?</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Our team reviews your request within 1 business day</li>
                  <li>We source offers from trusted dealers near you</li>
                  <li>You&apos;ll receive email notifications as offers arrive</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {createdCaseId && (
                  <Button asChild>
                    <Link href={`/buyer/requests/${createdCaseId}`}>View Request</Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href="/buyer/requests">All Requests</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  // ---------------------------------------------------------------------------
  // Stepper indicator
  // ---------------------------------------------------------------------------

  function StepIndicator() {
    return (
      <nav aria-label="Form progress" className="mb-8">
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <li
                key={s.label}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isActive ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${isDone ? "border-primary bg-primary/10 text-primary" : ""}
                    ${!isActive && !isDone ? "border-muted-foreground/30 text-muted-foreground" : ""}
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 1: Location
  // ---------------------------------------------------------------------------

  function renderStep0() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Location</CardTitle>
          <CardDescription>
            Where should we search for vehicles? This helps us find dealers near you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketZip">ZIP Code *</Label>
              <Input
                id="marketZip"
                placeholder="e.g. 90210"
                value={marketZip}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9-]/g, "")
                  setMarketZip(val)
                }}
                maxLength={10}
                aria-describedby="zip-hint"
              />
              {marketZip && !/^\d{5}(-\d{4})?$/.test(marketZip) && (
                <p id="zip-hint" className="text-sm text-destructive" role="alert">
                  Enter a valid 5-digit ZIP code.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City (optional)</Label>
              <Input
                id="city"
                placeholder="e.g. Beverly Hills"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radiusMiles">Search Radius (miles)</Label>
              <Select value={radiusMiles} onValueChange={setRadiusMiles}>
                <SelectTrigger id="radiusMiles" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                  <SelectItem value="200">200 miles</SelectItem>
                  <SelectItem value="500">500 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 2: Vehicle(s)
  // ---------------------------------------------------------------------------

  function renderStep1() {
    return (
      <div className="space-y-6">
        {items.map((item, idx) => {
          const filteredMakes = makeSearch[idx]
            ? VEHICLE_MAKE_LIST.filter((m) =>
                m.toLowerCase().includes((makeSearch[idx] ?? "").toLowerCase()),
              )
            : VEHICLE_MAKE_LIST
          const models = getModelsForMake(item.make)

          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Vehicle {items.length > 1 ? `#${idx + 1}` : "Details"}
                  </CardTitle>
                  <CardDescription>Describe the vehicle you&apos;re looking for.</CardDescription>
                </div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    className="text-destructive hover:text-destructive"
                    aria-label={`Remove vehicle ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Vehicle Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`type-${idx}`}>Vehicle Type</Label>
                    <Select
                      value={item.vehicleType}
                      onValueChange={(v) => updateItem(idx, "vehicleType", v)}
                    >
                      <SelectTrigger id={`type-${idx}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAR">Car</SelectItem>
                        <SelectItem value="SUV">SUV</SelectItem>
                        <SelectItem value="TRUCK">Truck</SelectItem>
                        <SelectItem value="VAN">Van</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition */}
                  <div className="space-y-2">
                    <Label htmlFor={`cond-${idx}`}>Condition</Label>
                    <Select
                      value={item.condition}
                      onValueChange={(v) => updateItem(idx, "condition", v)}
                    >
                      <SelectTrigger id={`cond-${idx}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="USED">Used</SelectItem>
                        <SelectItem value="EITHER">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Make - searchable dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor={`make-${idx}`}>Make *</Label>
                    <Select
                      value={item.make}
                      onValueChange={(v) => {
                        updateItem(idx, "make", v)
                        setMakeSearch((prev) => ({ ...prev, [idx]: "" }))
                      }}
                    >
                      <SelectTrigger id={`make-${idx}`} className="w-full">
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search makes..."
                            value={makeSearch[idx] ?? ""}
                            onChange={(e) =>
                              setMakeSearch((prev) => ({ ...prev, [idx]: e.target.value }))
                            }
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredMakes.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                        {filteredMakes.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No makes found.
                          </p>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model - dynamic based on make */}
                  <div className="space-y-2">
                    <Label htmlFor={`model-${idx}`}>Model</Label>
                    {models.length > 0 ? (
                      <Select
                        value={item.model || "__any__"}
                        onValueChange={(v) => updateItem(idx, "model", v === "__any__" ? "" : v)}
                      >
                        <SelectTrigger id={`model-${idx}`} className="w-full">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any model</SelectItem>
                          {models.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`model-${idx}`}
                        placeholder="e.g. Camry"
                        value={item.model}
                        onChange={(e) => updateItem(idx, "model", e.target.value)}
                      />
                    )}
                  </div>

                  {/* Year Min */}
                  <div className="space-y-2">
                    <Label htmlFor={`yearMin-${idx}`}>Year Min</Label>
                    <Input
                      id={`yearMin-${idx}`}
                      type="number"
                      placeholder="e.g. 2020"
                      min={1900}
                      max={2040}
                      value={item.yearMin}
                      onChange={(e) => updateItem(idx, "yearMin", e.target.value)}
                    />
                  </div>

                  {/* Year Max */}
                  <div className="space-y-2">
                    <Label htmlFor={`yearMax-${idx}`}>Year Max</Label>
                    <Input
                      id={`yearMax-${idx}`}
                      type="number"
                      placeholder="e.g. 2025"
                      min={1900}
                      max={2040}
                      value={item.yearMax}
                      onChange={(e) => updateItem(idx, "yearMax", e.target.value)}
                    />
                  </div>

                  {/* Trim */}
                  <div className="space-y-2">
                    <Label htmlFor={`trim-${idx}`}>Trim (optional)</Label>
                    <Input
                      id={`trim-${idx}`}
                      placeholder="e.g. XLE"
                      value={item.trim}
                      onChange={(e) => updateItem(idx, "trim", e.target.value)}
                    />
                  </div>

                  {/* Budget Type */}
                  <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor={`budgetType-${idx}`}>Budget Type *</Label>
                    <Select
                      value={item.budgetType}
                      onValueChange={(v) => updateItem(idx, "budgetType", v)}
                    >
                      <SelectTrigger id={`budgetType-${idx}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOTAL_PRICE">Total Out-the-Door Budget</SelectItem>
                        <SelectItem value="MONTHLY_PAYMENT">Monthly Payment Budget</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {item.budgetType === "TOTAL_PRICE"
                        ? "You'll enter the maximum all-in amount you want to spend."
                        : "You'll enter the highest monthly payment you are comfortable paying."}
                    </p>
                  </div>

                  {/* Conditional: Total OTD Budget (shown for TOTAL_PRICE) */}
                  {item.budgetType === "TOTAL_PRICE" && (
                    <div className="space-y-2">
                      <Label htmlFor={`otdBudget-${idx}`}>Total Out-the-Door Budget ($) *</Label>
                      <Input
                        id={`otdBudget-${idx}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 35000"
                        value={item.maxTotalOtdBudgetDollars}
                        onChange={(e) => updateItem(idx, "maxTotalOtdBudgetDollars", e.target.value)}
                        aria-required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the maximum all-in amount you want to spend, including taxes and fees.
                      </p>
                    </div>
                  )}

                  {/* Conditional: Max Monthly Payment (shown for MONTHLY_PAYMENT) */}
                  {item.budgetType === "MONTHLY_PAYMENT" && (
                    <div className="space-y-2">
                      <Label htmlFor={`monthlyPayment-${idx}`}>Maximum Monthly Payment ($) *</Label>
                      <Input
                        id={`monthlyPayment-${idx}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 500"
                        value={item.maxMonthlyPaymentDollars}
                        onChange={(e) => updateItem(idx, "maxMonthlyPaymentDollars", e.target.value)}
                        aria-required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the highest monthly payment you are comfortable paying.
                      </p>
                    </div>
                  )}

                  {/* Desired Down Payment (always shown — required for both budget types) */}
                  <div className="space-y-2">
                    <Label htmlFor={`downPayment-${idx}`}>Desired Down Payment ($) *</Label>
                    <Input
                      id={`downPayment-${idx}`}
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 5000"
                      value={item.desiredDownPaymentDollars}
                      onChange={(e) => updateItem(idx, "desiredDownPaymentDollars", e.target.value)}
                      aria-required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter how much you plan to put down toward the vehicle purchase.
                    </p>
                  </div>

                  {/* Mileage Max (for USED or EITHER) */}
                  {(item.condition === "USED" || item.condition === "EITHER") && (
                    <div className="space-y-2">
                      <Label htmlFor={`mileage-${idx}`}>
                        Max Mileage{item.condition === "USED" ? " *" : " (optional)"}
                      </Label>
                      <Input
                        id={`mileage-${idx}`}
                        type="number"
                        min={0}
                        placeholder="e.g. 50000"
                        value={item.mileageMax}
                        onChange={(e) => updateItem(idx, "mileageMax", e.target.value)}
                        aria-required={item.condition === "USED"}
                      />
                    </div>
                  )}

                  {/* VIN */}
                  <div className="space-y-2">
                    <Label htmlFor={`vin-${idx}`}>VIN (optional)</Label>
                    <Input
                      id={`vin-${idx}`}
                      placeholder="17-character VIN"
                      maxLength={17}
                      value={item.vin}
                      onChange={(e) => updateItem(idx, "vin", e.target.value)}
                    />
                  </div>
                </div>

                {/* Open to similar */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`similar-${idx}`}
                    checked={item.openToSimilar}
                    onCheckedChange={(checked) =>
                      updateItem(idx, "openToSimilar", checked === true)
                    }
                  />
                  <Label htmlFor={`similar-${idx}`} className="cursor-pointer">
                    Open to similar vehicles
                  </Label>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {items.length < 3 && (
          <Button type="button" variant="outline" onClick={addItem} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Vehicle ({items.length}/3)
          </Button>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 3: Preferences
  // ---------------------------------------------------------------------------

  function renderStep2() {
    const item = items[0]
    const idx = 0

    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Optional preferences to help us find the best match for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delivery preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-pref">Delivery Preference</Label>
              <Select
                value={item.distancePreference}
                onValueChange={(v) => updateItem(idx, "distancePreference", v)}
              >
                <SelectTrigger id="delivery-pref" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="PICKUP">Pickup</SelectItem>
                  <SelectItem value="EITHER">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Distance (shown for PICKUP or EITHER) */}
            {(item.distancePreference === "PICKUP" || item.distancePreference === "EITHER") && (
              <div className="space-y-2">
                <Label htmlFor={`maxDist-${idx}`}>Distance Willing to Travel (miles)</Label>
                <Input
                  id={`maxDist-${idx}`}
                  type="number"
                  min={0}
                  placeholder="e.g. 100"
                  value={item.maxDistanceMiles}
                  onChange={(e) => updateItem(idx, "maxDistanceMiles", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <Label htmlFor="timeline">Timeline</Label>
            <Select
              value={item.timeline}
              onValueChange={(v) => updateItem(idx, "timeline", v)}
            >
              <SelectTrigger id="timeline" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ZERO_7_DAYS">ASAP (0–7 days)</SelectItem>
                <SelectItem value="EIGHT_14_DAYS">1–2 weeks</SelectItem>
                <SelectItem value="FIFTEEN_30_DAYS">15–30 days</SelectItem>
                <SelectItem value="THIRTY_PLUS_DAYS">Flexible (30+ days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label htmlFor={`colors-${idx}`}>Color Preferences (comma-separated, optional)</Label>
            <Input
              id={`colors-${idx}`}
              placeholder="e.g. White, Black, Silver"
              value={item.colors}
              onChange={(e) => updateItem(idx, "colors", e.target.value)}
            />
            {item.colors && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.colors
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Must-have features */}
          <div className="space-y-2">
            <Label htmlFor={`features-${idx}`}>Must-Have Features (comma-separated)</Label>
            <Input
              id={`features-${idx}`}
              placeholder="e.g. Leather seats, Sunroof, Apple CarPlay"
              value={item.mustHaveFeatures}
              onChange={(e) => updateItem(idx, "mustHaveFeatures", e.target.value)}
            />
            {item.mustHaveFeatures && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.mustHaveFeatures
                  .split(",")
                  .map((f) => f.trim())
                  .filter(Boolean)
                  .map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor={`notes-${idx}`}>Additional Notes (optional)</Label>
            <Textarea
              id={`notes-${idx}`}
              placeholder="Any other preferences or requirements..."
              rows={3}
              value={item.notes}
              onChange={(e) => updateItem(idx, "notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 4: Review & Consent
  // ---------------------------------------------------------------------------

  function renderStep3() {
    const stateLabel = US_STATES.find((s) => s.value === state)?.label ?? state

    return (
      <div className="space-y-6">
        {/* Location summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Vehicle Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">State</dt>
                <dd className="font-medium">{stateLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ZIP</dt>
                <dd className="font-medium">{marketZip}</dd>
              </div>
              {city && (
                <div>
                  <dt className="text-muted-foreground">City</dt>
                  <dd className="font-medium">{city}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Radius</dt>
                <dd className="font-medium">{radiusMiles} miles</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Vehicle summary */}
        {items.map((item, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" /> Vehicle {items.length > 1 ? `#${idx + 1}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">{VEHICLE_TYPE_LABELS[item.vehicleType] ?? item.vehicleType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Condition</dt>
                  <dd className="font-medium">{CONDITION_LABELS[item.condition] ?? item.condition}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Make / Model</dt>
                  <dd className="font-medium">
                    {item.make}
                    {item.model ? ` ${item.model}` : ""}
                    {item.trim ? ` (${item.trim})` : ""}
                  </dd>
                </div>
                {(item.yearMin || item.yearMax) && (
                  <div>
                    <dt className="text-muted-foreground">Year Range</dt>
                    <dd className="font-medium">
                      {item.yearMin || "Any"} – {item.yearMax || "Any"}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Budget Type</dt>
                  <dd className="font-medium">
                    {item.budgetType === "TOTAL_PRICE" ? "Total Out-the-Door" : "Monthly Payment"}
                  </dd>
                </div>
                {item.budgetType === "TOTAL_PRICE" && item.maxTotalOtdBudgetDollars && (
                  <div>
                    <dt className="text-muted-foreground">Total OTD Budget</dt>
                    <dd className="font-medium">{formatCurrency(item.maxTotalOtdBudgetDollars)}</dd>
                  </div>
                )}
                {item.budgetType === "MONTHLY_PAYMENT" && item.maxMonthlyPaymentDollars && (
                  <div>
                    <dt className="text-muted-foreground">Max Monthly Payment</dt>
                    <dd className="font-medium">{formatCurrency(item.maxMonthlyPaymentDollars)}</dd>
                  </div>
                )}
                {item.desiredDownPaymentDollars && (
                  <div>
                    <dt className="text-muted-foreground">Desired Down Payment</dt>
                    <dd className="font-medium">{formatCurrency(item.desiredDownPaymentDollars)}</dd>
                  </div>
                )}
                {item.mileageMax && (
                  <div>
                    <dt className="text-muted-foreground">Max Mileage</dt>
                    <dd className="font-medium">{Number(item.mileageMax).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        ))}

        {/* Preferences summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium">{DELIVERY_LABELS[items[0].distancePreference] ?? items[0].distancePreference}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timeline</dt>
                <dd className="font-medium">{TIMELINE_LABELS[items[0].timeline] ?? items[0].timeline}</dd>
              </div>
              {items[0].maxDistanceMiles && (
                <div>
                  <dt className="text-muted-foreground">Max Travel</dt>
                  <dd className="font-medium">{items[0].maxDistanceMiles} miles</dd>
                </div>
              )}
            </dl>
            {items[0].colors && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Colors</p>
                <div className="flex flex-wrap gap-1">
                  {items[0].colors
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {items[0].mustHaveFeatures && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Must-Haves</p>
                <div className="flex flex-wrap gap-1">
                  {items[0].mustHaveFeatures
                    .split(",")
                    .map((f) => f.trim())
                    .filter(Boolean)
                    .map((f) => (
                      <Badge key={f} variant="outline" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {items[0].notes && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{items[0].notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consent */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consentChecked}
                onCheckedChange={(checked) => setConsentChecked(checked === true)}
                aria-describedby="consent-desc"
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="cursor-pointer leading-relaxed">
                  I consent to AutoLenis using the information provided to source vehicle offers
                  and to contact me regarding this request.
                </Label>
                <p id="consent-desc" className="text-xs text-muted-foreground">
                  By checking this box you agree to our{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    Privacy Policy
                  </a>
                  . Your data is handled securely and never sold.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server error display */}
        {serverError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            {serverError}
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ProtectedRoute allowedRoles={["BUYER"]}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/buyer/requests">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Request a Vehicle</h1>
            <p className="text-muted-foreground text-sm">
              Tell us what you&apos;re looking for and we&apos;ll source offers from our dealer network.
            </p>
          </div>
        </div>

        <StepIndicator />

        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link href="/buyer/requests">Cancel</Link>
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !consentChecked}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
