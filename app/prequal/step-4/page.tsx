"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePrequalSession } from "@/hooks/usePrequalSession"
import { StepLayout } from "@/components/prequal/StepLayout"
import { ConsentCheckbox } from "@/components/prequal/ConsentCheckbox"

const CONSENT_VERSION_ID =
  process.env["NEXT_PUBLIC_PREQUAL_CONSENT_VERSION_ID"] ?? "default-v1"

export default function PrequalStep4Page() {
  const router = useRouter()
  const { state, updateSession } = usePrequalSession()

  const [form, setForm] = useState({
    downPayment: state.step4.downPayment ?? 0,
    targetMonthlyPayment: state.step4.targetMonthlyPayment ?? 0,
    consentGiven: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.consentGiven) {
      setErrors({ consentGiven: "You must consent to continue" })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const payload = {
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        step4: {
          downPayment: form.downPayment,
          targetMonthlyPayment: form.targetMonthlyPayment,
          consentGiven: true,
          consentVersionId: CONSENT_VERSION_ID,
        },
      }

      const response = await fetch("/api/prequal/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrors({ submit: data.error ?? "Failed to submit. Please try again." })
        setIsSubmitting(false)
        return
      }

      updateSession({ applicationId: data.applicationId, sessionToken: data.sessionToken })
      router.push(`/prequal/processing?id=${data.applicationId}`)
    } catch {
      setErrors({ submit: "Network error. Please try again." })
      setIsSubmitting(false)
    }
  }

  const formatCents = (cents: number) => (cents / 100).toFixed(2)

  return (
    <StepLayout
      title="Shopping Preferences"
      description="Almost done! Tell us about your shopping goals."
      currentStep={4}
      totalSteps={4}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment (optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={form.downPayment > 0 ? formatCents(form.downPayment) : ""}
              onChange={(e) => {
                const cents = Math.round(parseFloat(e.target.value || "0") * 100)
                setForm((prev) => ({ ...prev, downPayment: cents }))
              }}
              min={0}
              step={0.01}
              className="block w-full rounded-md border border-gray-300 pl-7 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="2500.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Monthly Payment (optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={form.targetMonthlyPayment > 0 ? formatCents(form.targetMonthlyPayment) : ""}
              onChange={(e) => {
                const cents = Math.round(parseFloat(e.target.value || "0") * 100)
                setForm((prev) => ({ ...prev, targetMonthlyPayment: cents }))
              }}
              min={0}
              step={0.01}
              className="block w-full rounded-md border border-gray-300 pl-7 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="400.00"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <ConsentCheckbox
            checked={form.consentGiven}
            onChange={(checked) => {
              setForm((prev) => ({ ...prev, consentGiven: checked }))
              if (errors.consentGiven) setErrors((prev) => ({ ...prev, consentGiven: "" }))
            }}
            error={errors.consentGiven}
            label={
              <span>
                I authorize AutoLenis to obtain alternative credit data (soft pull) to generate
                my estimated shopping range. I understand this does not impact my credit score
                and is not an application for credit.{" "}
                <a
                  href="/legal/prequal-consent"
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noopener"
                >
                  View full consent terms
                </a>
              </span>
            }
          />
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !form.consentGiven}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </StepLayout>
  )
}
