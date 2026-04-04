import Link from "next/link"
import { Shield, Clock, Car } from "lucide-react"

export function WelcomeScreen() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Car className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">See What You Can Shop</h1>
        <p className="mt-3 text-gray-600">
          Get your personalized vehicle shopping range in minutes — no impact to your credit
          score.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-gray-700">Takes about 5 minutes to complete</p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-gray-700">Soft inquiry only — no credit score impact</p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
          <Car className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <p className="text-sm text-gray-700">Start shopping immediately with your estimated range</p>
        </div>
      </div>

      <Link
        href="/prequal/step-1"
        className="block w-full text-center bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
      >
        Check My Shopping Range
      </Link>

      <p className="mt-4 text-xs text-center text-gray-400">
        This prequalification uses alternative credit data (soft pull) and is not a loan
        offer, financing approval, or guarantee of credit.
      </p>
    </div>
  )
}
