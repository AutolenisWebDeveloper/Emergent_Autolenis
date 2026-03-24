"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, DollarSign } from "lucide-react"
import type { PayoutDeal, PayoutWithDeal } from "@/lib/types"

interface PayoutListItemProps {
  payout: {
    id: string
    amount: number
    status: string
    provider?: string
    method?: string
    createdAt: string
    paidAt?: string | null
    transactionId?: string | null
    /** payout_deals mappings when available */
    payoutDeals?: PayoutDeal[]
    /** Legacy dealId from PayoutWithDeal view */
    dealId?: string | null
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" /> Completed
        </Badge>
      )
    case "PROCESSING":
      return (
        <Badge className="bg-amber-500">
          <Clock className="h-3 w-3 mr-1" /> Processing
        </Badge>
      )
    case "PENDING":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

/**
 * Displays a single payout with associated deal allocations.
 * Uses payout_deals for explicit many-to-many mappings when available,
 * falls back to Payout_withDeal.dealId for legacy compatibility.
 */
export function PayoutListItem({ payout }: PayoutListItemProps) {
  const hasPayoutDeals = payout.payoutDeals && payout.payoutDeals.length > 0

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{payout.provider || payout.method || "Transfer"}</p>
          <p className="text-sm text-muted-foreground">
            Requested {new Date(payout.createdAt).toLocaleDateString()}
            {payout.paidAt && ` • Completed ${new Date(payout.paidAt).toLocaleDateString()}`}
          </p>
          {payout.transactionId && (
            <p className="text-xs text-muted-foreground font-mono">{payout.transactionId}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(payout.status)}
          <span className="text-lg font-bold">${payout.amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Deal allocations from payout_deals (many-to-many) */}
      {hasPayoutDeals && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Deal Allocations
          </p>
          <div className="space-y-1">
            {payout.payoutDeals!.map((pd) => (
              <div key={pd.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                <span className="font-mono text-xs">Deal #{pd.selectedDealId.slice(0, 8)}</span>
                <span className="font-medium">${(pd.allocatedAmountCents / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy fallback: single dealId from Payout_withDeal view */}
      {!hasPayoutDeals && payout.dealId && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Associated Deal: <span className="font-mono">#{payout.dealId.slice(0, 8)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
