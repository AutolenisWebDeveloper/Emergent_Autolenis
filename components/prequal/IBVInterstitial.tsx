"use client"

import { Building2, Shield, Clock } from "lucide-react"

interface IBVInterstitialProps {
  onContinue: () => void
  onSkip?: () => void
  isLoading?: boolean
}

export function IBVInterstitial({ onContinue, onSkip, isLoading }: IBVInterstitialProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verify Your Income</h1>
        <p className="mt-2 text-gray-600">
          To improve your estimated shopping range, we can securely verify your bank income
          data in real time.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-800">Takes about 2 minutes</p>
            <p className="text-xs text-gray-500">Securely connect your bank account to verify income</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-800">Bank-level security</p>
            <p className="text-xs text-gray-500">Read-only access — we cannot move money or make transactions</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onContinue}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Connect Bank & Verify Income"}
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
          >
            Skip this step — continue without income verification
          </button>
        )}
      </div>
    </div>
  )
}
