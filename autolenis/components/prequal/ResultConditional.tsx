import { ShoppingPassCard } from "./ShoppingPassCard"
import { AlertCircle } from "lucide-react"

interface ResultConditionalProps {
  shoppingRangeMinCents: number
  shoppingRangeMaxCents: number
  expiresAt: string
}

export function ResultConditional({ shoppingRangeMinCents, shoppingRangeMaxCents, expiresAt }: ResultConditionalProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-amber-700">Conditionally Prequalified</h1>
        <p className="mt-2 text-gray-600">
          You may be eligible to shop in this range. Additional income verification may be
          requested before finalizing a purchase.
        </p>
      </div>

      <ShoppingPassCard
        shoppingRangeMinCents={shoppingRangeMinCents}
        shoppingRangeMaxCents={shoppingRangeMaxCents}
        expiresAt={expiresAt}
        isConditional={true}
      />

      <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          A conditional shopping pass means income documentation or bank verification may be
          required before a purchase can be completed. This is not a guarantee of vehicle
          financing.
        </p>
      </div>

      <div className="mt-6 text-center">
        <a
          href="/inventory"
          className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
        >
          Browse Vehicles
        </a>
      </div>
    </div>
  )
}
