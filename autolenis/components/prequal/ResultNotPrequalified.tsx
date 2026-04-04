import { XCircle } from "lucide-react"

export function ResultNotPrequalified() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Application Not Approved</h1>
        <p className="mt-2 text-gray-600">
          Based on the information provided, we were unable to generate a shopping range at
          this time.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 text-left">
        <p className="font-medium mb-2">What can you do?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Review your credit report for errors at AnnualCreditReport.com</li>
          <li>Work on improving your credit history over time</li>
          <li>Reapply in 90 days once your situation has changed</li>
          <li>Consider a co-applicant or higher down payment</li>
        </ul>
      </div>

      <p className="mt-4 text-xs text-gray-400 italic">
        This result is based on alternative credit data and does not represent a final credit
        decision. It is not a denial of credit under the Equal Credit Opportunity Act.
      </p>
    </div>
  )
}
