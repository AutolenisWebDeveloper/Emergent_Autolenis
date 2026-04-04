"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

interface ProcessingStep {
  id: string
  label: string
  sublabel?: string
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: "submit", label: "Submitting your information", sublabel: "Securely encrypted" },
  { id: "verify", label: "Verifying your identity", sublabel: "Soft inquiry — no credit impact" },
  { id: "assess", label: "Assessing shopping readiness", sublabel: "Based on the information provided" },
  { id: "range", label: "Calculating your shopping range", sublabel: "Estimated vehicle price range" },
]

interface ProcessingScreenProps {
  currentStep?: number
}

export function ProcessingScreen({ currentStep = 0 }: ProcessingScreenProps) {
  const [animStep, setAnimStep] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    PROCESSING_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setAnimStep(i + 1), (i + 1) * 1800))
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  const displayStep = Math.max(animStep, currentStep)

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <div className="mb-8">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Processing Your Application</h2>
        <p className="mt-2 text-gray-500 text-sm">
          This usually takes less than a minute. Please keep this page open.
        </p>
      </div>

      <div className="space-y-4 text-left">
        {PROCESSING_STEPS.map((step, i) => {
          const isDone = i + 1 < displayStep
          const isCurrent = i + 1 === displayStep
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDone ? "text-gray-700" : isCurrent ? "text-blue-700" : "text-gray-400"}`}>
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="text-xs text-gray-400">{step.sublabel}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
