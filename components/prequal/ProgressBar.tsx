interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
}

export function ProgressBar({ currentStep, totalSteps, stepLabels }: ProgressBarProps) {
  const progress = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 text-xs text-gray-500">
        {stepLabels?.map((label, i) => (
          <span key={i} className={i + 1 <= currentStep ? "text-blue-600 font-medium" : ""}>
            {label}
          </span>
        ))}
        {!stepLabels && (
          <span className="ml-auto text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
    </div>
  )
}
