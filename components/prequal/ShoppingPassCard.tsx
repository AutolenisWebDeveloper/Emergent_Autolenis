import { CheckCircle2, Calendar, DollarSign } from "lucide-react"

interface ShoppingPassCardProps {
  shoppingRangeMinCents: number
  shoppingRangeMaxCents: number
  expiresAt: string
  isConditional?: boolean
}

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function ShoppingPassCard({
  shoppingRangeMinCents,
  shoppingRangeMaxCents,
  expiresAt,
  isConditional,
}: ShoppingPassCardProps) {
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className={`rounded-xl border-2 p-6 ${isConditional ? "border-amber-400 bg-amber-50" : "border-green-400 bg-green-50"}`}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className={`h-6 w-6 ${isConditional ? "text-amber-600" : "text-green-600"}`} />
        <span className={`font-semibold text-lg ${isConditional ? "text-amber-800" : "text-green-800"}`}>
          {isConditional ? "Conditional Shopping Pass" : "Shopping Pass Issued"}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Estimated Shopping Range</p>
        <div className="flex items-center gap-1">
          <DollarSign className="h-5 w-5 text-gray-600" />
          <span className="text-3xl font-bold text-gray-900">
            {formatDollars(shoppingRangeMinCents)} – {formatDollars(shoppingRangeMaxCents)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar className="h-4 w-4" />
        <span>Valid until {expiryDate}</span>
      </div>

      <p className="mt-4 text-xs text-gray-400 italic">
        This is an estimated shopping range based on the information you provided and a soft
        inquiry. It is not a loan offer, financing approval, or guarantee of credit. Final
        terms are determined by the dealership and any applicable lender at time of purchase.
      </p>
    </div>
  )
}
