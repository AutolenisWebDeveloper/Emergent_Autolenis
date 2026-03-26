import { Clock } from "lucide-react"

export function ResultManualReview() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Clock className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Application Under Review</h1>
        <p className="mt-2 text-gray-600">
          Your application is being reviewed by our team. This typically takes 1–2 business
          days. You&apos;ll receive an email update when a decision is available.
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">What happens next?</p>
        <ul className="text-left space-y-1 list-disc list-inside">
          <li>Our team reviews your application</li>
          <li>You may be contacted to provide additional information</li>
          <li>You&apos;ll receive an email with the decision</li>
        </ul>
      </div>
    </div>
  )
}
