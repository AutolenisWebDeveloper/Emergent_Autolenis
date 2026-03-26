"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePrequalSession } from "@/hooks/usePrequalSession"
import { StepLayout } from "@/components/prequal/StepLayout"
import { step2Schema } from "@/lib/validations/prequal/step2"

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]

export default function PrequalStep2Page() {
  const router = useRouter()
  const { state, updateSession } = usePrequalSession()

  const [form, setForm] = useState({
    addressLine1: state.step2.addressLine1 ?? "",
    addressLine2: state.step2.addressLine2 ?? "",
    city: state.step2.city ?? "",
    state: state.step2.state ?? "",
    zipCode: state.step2.zipCode ?? "",
    residenceType: state.step2.residenceType ?? "RENT",
    monthsAtAddress: state.step2.monthsAtAddress ?? 12,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "number" ? parseInt(e.target.value, 10) || 0 : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = step2Schema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string
        if (field) fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    updateSession({ step2: result.data, currentStep: 3 })
    router.push("/prequal/step-3")
  }

  return (
    <StepLayout
      title="Your Address"
      description="Where do you currently live?"
      currentStep={2}
      totalSteps={4}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            type="text"
            value={form.addressLine1}
            onChange={handleChange("addressLine1")}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.addressLine1 ? "border-red-500" : "border-gray-300"}`}
            placeholder="123 Main Street"
          />
          {errors.addressLine1 && <p className="mt-1 text-xs text-red-600">{errors.addressLine1}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apt/Suite (optional)</label>
          <input
            type="text"
            value={form.addressLine2}
            onChange={handleChange("addressLine2")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Apt 4B"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={handleChange("city")}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.city ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              value={form.state}
              onChange={handleChange("state")}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.state ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">Select</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
          <input
            type="text"
            value={form.zipCode}
            onChange={handleChange("zipCode")}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.zipCode ? "border-red-500" : "border-gray-300"}`}
            placeholder="90210"
            maxLength={10}
          />
          {errors.zipCode && <p className="mt-1 text-xs text-red-600">{errors.zipCode}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Residence Type</label>
          <select
            value={form.residenceType}
            onChange={handleChange("residenceType")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OWN">Own</option>
            <option value="RENT">Rent</option>
            <option value="LIVE_WITH_FAMILY">Live with family</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How long at this address (months)?
          </label>
          <input
            type="number"
            value={form.monthsAtAddress}
            onChange={handleChange("monthsAtAddress")}
            min={0}
            max={600}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.monthsAtAddress ? "border-red-500" : "border-gray-300"}`}
          />
          {errors.monthsAtAddress && (
            <p className="mt-1 text-xs text-red-600">{errors.monthsAtAddress}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      </form>
    </StepLayout>
  )
}
