import { ProgressBar } from "./ProgressBar"

interface StepLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  currentStep: number
  totalSteps: number
}

export function StepLayout({ children, title, description, currentStep, totalSteps }: StepLayoutProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
      </div>
      {children}
    </div>
  )
}
