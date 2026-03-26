import { ShoppingPassCard } from "./ShoppingPassCard"
import { TrustBadges } from "./TrustBadges"

interface ResultPrequalifiedProps {
  shoppingRangeMinCents: number
  shoppingRangeMaxCents: number
  expiresAt: string
}

export function ResultPrequalified({ shoppingRangeMinCents, shoppingRangeMaxCents, expiresAt }: ResultPrequalifiedProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-green-700">You&apos;re Prequalified to Shop!</h1>
        <p className="mt-2 text-gray-600">
          Based on the information you provided, here&apos;s your estimated vehicle shopping range.
        </p>
      </div>

      <ShoppingPassCard
        shoppingRangeMinCents={shoppingRangeMinCents}
        shoppingRangeMaxCents={shoppingRangeMaxCents}
        expiresAt={expiresAt}
        isConditional={false}
      />

      <div className="mt-6 text-center">
        <a
          href="/inventory"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Browse Vehicles
        </a>
      </div>

      <TrustBadges />
    </div>
  )
}
