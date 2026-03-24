"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileStepProps {
  onNext: (data: any) => void
  initialData?: any
}

export function ProfileStep({ onNext, initialData }: ProfileStepProps) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zip: initialData?.zip || "",
    employment: initialData?.employment || "",
    employer: initialData?.employer || "",
    annualIncome: initialData?.annualIncome || "",
    housingStatus: initialData?.housingStatus || "RENT",
    monthlyHousing: initialData?.monthlyHousing || "",
  })
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [draftLoaded, setDraftLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load draft on mount
  useEffect(() => {
    if (initialData) {
      setDraftLoaded(true)
      return
    }
    const loadDraft = async () => {
      try {
        const res = await fetch("/api/buyer/prequal/draft")
        const data = await res.json()
        if (data.success && data.data?.draft) {
          const draft = data.data.draft
          setFormData((prev) => ({
            firstName: draft.firstName || prev.firstName,
            lastName: draft.lastName || prev.lastName,
            phone: draft.phone || prev.phone,
            address: draft.address || prev.address,
            city: draft.city || prev.city,
            state: draft.state || prev.state,
            zip: draft.zip || prev.zip,
            employment: draft.employment || prev.employment,
            employer: draft.employer || prev.employer,
            annualIncome: draft.annualIncome || prev.annualIncome,
            housingStatus: draft.housingStatus || prev.housingStatus,
            monthlyHousing: draft.monthlyHousing || prev.monthlyHousing,
          }))
        }
      } catch (err) {
        console.error("[ProfileStep] Failed to load draft:", err)
      } finally {
        setDraftLoaded(true)
      }
    }
    loadDraft()
  }, [initialData])

  // Auto-save with debounce
  const saveDraft = useCallback(async (data: typeof formData) => {
    setSaveStatus("saving")
    try {
      await fetch("/api/buyer/prequal/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      setSaveStatus("saved")
    } catch {
      setSaveStatus("idle")
    }
  }, [])

  const updateField = useCallback((field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => saveDraft(next), 1000)
      return next
    })
  }, [saveDraft])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext({
      ...formData,
      annualIncome: Number.parseFloat(formData.annualIncome),
      monthlyHousing: Number.parseFloat(formData.monthlyHousing),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tell us about yourself</CardTitle>
            <CardDescription>We need some basic information to get you pre-qualified</CardDescription>
          </div>
          {draftLoaded && saveStatus !== "idle" && (
            <span className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "Saving…" : "Saved ✓"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="1234567890"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Input
              id="address"
              required
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                required
                maxLength={2}
                placeholder="CA"
                value={formData.state}
                onChange={(e) => updateField("state", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP code</Label>
            <Input
              id="zip"
              required
              pattern="\d{5}"
              placeholder="12345"
              value={formData.zip}
              onChange={(e) => updateField("zip", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employment">Employment status</Label>
            <select
              id="employment"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.employment}
              onChange={(e) => updateField("employment", e.target.value)}
            >
              <option value="">Select...</option>
              <option value="EMPLOYED_FULL_TIME">Employed full-time</option>
              <option value="EMPLOYED_PART_TIME">Employed part-time</option>
              <option value="SELF_EMPLOYED">Self-employed</option>
              <option value="RETIRED">Retired</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employer">Employer</Label>
            <Input
              id="employer"
              required
              value={formData.employer}
              onChange={(e) => updateField("employer", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualIncome">Annual income</Label>
            <Input
              id="annualIncome"
              type="number"
              required
              min="0"
              step="1000"
              placeholder="50000"
              value={formData.annualIncome}
              onChange={(e) => updateField("annualIncome", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="housingStatus">Housing status</Label>
            <select
              id="housingStatus"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.housingStatus}
              onChange={(e) => updateField("housingStatus", e.target.value)}
            >
              <option value="RENT">Rent</option>
              <option value="OWN">Own</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyHousing">Monthly housing payment</Label>
            <Input
              id="monthlyHousing"
              type="number"
              required
              min="0"
              step="50"
              placeholder="1200"
              value={formData.monthlyHousing}
              onChange={(e) => updateField("monthlyHousing", e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
