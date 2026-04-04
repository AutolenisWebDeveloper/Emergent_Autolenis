"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePrequalSession } from "@/hooks/usePrequalSession"
import { StepLayout } from "@/components/prequal/StepLayout"
import { step3Schema } from "@/lib/validations/prequal/step3"

export default function PrequalStep3Page() {
  const router = useRouter()
  const { state, updateSession } = usePrequalSession()

  const [form, setForm] = useState({
    employmentType: state.step3.employmentType ?? "EMPLOYED",
    employerName: state.step3.employerName ?? "",
    grossMonthlyIncome: state.step3.grossMonthlyIncome ?? 0,
    monthlyHousingPayment: state.step3.monthlyHousingPayment ?? 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectChange =
    (field: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = step3Schema.safeParse(form)
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
    updateSession({ step3: result.data, currentStep: 4 })
    router.push("/prequal/step-4")
  }

  const formatCents = (cents: number) => (cents / 100).toFixed(2)

  return (
    <StepLayout
      title="Income & Employment"
      description="Tell us about your income and housing situation."
      currentStep={3}
      totalSteps={4}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
          <select
            value={form.employmentType}
            onChange={handleSelectChange("employmentType")}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EMPLOYED">Employed</option>
            <option value="SELF_EMPLOYED">Self-employed</option>
            <option value="RETIRED">Retired</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {(form.employmentType === "EMPLOYED" || form.employmentType === "SELF_EMPLOYED") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer Name (optional)
            </label>
            <input
              type="text"
              value={form.employerName}
              onChange={handleSelectChange("employerName")}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gross Monthly Income (before taxes)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={form.grossMonthlyIncome > 0 ? formatCents(form.grossMonthlyIncome) : ""}
              onChange={(e) => {
                const cents = Math.round(parseFloat(e.target.value || "0") * 100)
                setForm((prev) => ({ ...prev, grossMonthlyIncome: cents }))
                if (errors.grossMonthlyIncome) setErrors((prev) => ({ ...prev, grossMonthlyIncome: "" }))
              }}
              min={0}
              step={0.01}
              className={`block w-full rounded-md border pl-7 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.grossMonthlyIncome ? "border-red-500" : "border-gray-300"}`}
              placeholder="5000.00"
            />
          </div>
          {errors.grossMonthlyIncome && (
            <p className="mt-1 text-xs text-red-600">{errors.grossMonthlyIncome}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Housing Payment (rent/mortgage)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={form.monthlyHousingPayment > 0 ? formatCents(form.monthlyHousingPayment) : ""}
              onChange={(e) => {
                const cents = Math.round(parseFloat(e.target.value || "0") * 100)
                setForm((prev) => ({ ...prev, monthlyHousingPayment: cents }))
                if (errors.monthlyHousingPayment) setErrors((prev) => ({ ...prev, monthlyHousingPayment: "" }))
              }}
              min={0}
              step={0.01}
              className={`block w-full rounded-md border pl-7 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.monthlyHousingPayment ? "border-red-500" : "border-gray-300"}`}
              placeholder="1500.00"
            />
          </div>
          {errors.monthlyHousingPayment && (
            <p className="mt-1 text-xs text-red-600">{errors.monthlyHousingPayment}</p>
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
