"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePrequalSession } from "@/hooks/usePrequalSession"
import { StepLayout } from "@/components/prequal/StepLayout"
import { SSNInput } from "@/components/prequal/SSNInput"
import { TrustBadges } from "@/components/prequal/TrustBadges"
import { step1Schema } from "@/lib/validations/prequal/step1"

export default function PrequalStep1Page() {
  const router = useRouter()
  const { state, updateSession } = usePrequalSession()

  const [form, setForm] = useState({
    firstName: state.step1.firstName ?? "",
    lastName: state.step1.lastName ?? "",
    email: state.step1.email ?? "",
    phone: state.step1.phone ?? "",
    dateOfBirth: state.step1.dateOfBirth ?? "",
    ssn: state.step1.ssn ?? "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = step1Schema.safeParse(form)
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
    updateSession({ step1: result.data, currentStep: 2 })
    router.push("/prequal/step-2")
  }

  return (
    <StepLayout
      title="Basic Information"
      description="We need a few details to get started."
      currentStep={1}
      totalSteps={4}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={handleChange("firstName")}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
              placeholder="Jane"
            />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={handleChange("lastName")}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? "border-red-500" : "border-gray-300"}`}
              placeholder="Doe"
            />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
            placeholder="jane@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={handleChange("phone")}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? "border-red-500" : "border-gray-300"}`}
            placeholder="5555551234"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange("dateOfBirth")}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dateOfBirth ? "border-red-500" : "border-gray-300"}`}
          />
          {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>}
        </div>

        <SSNInput
          value={form.ssn}
          onChange={(val) => {
            setForm((prev) => ({ ...prev, ssn: val }))
            if (errors.ssn) setErrors((prev) => ({ ...prev, ssn: "" }))
          }}
          error={errors.ssn}
        />

        <TrustBadges />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Continue →
        </button>
      </form>
    </StepLayout>
  )
}
