/**
 * Active pipeline statuses that dealers are allowed to view for SelectedDeal.
 * Dealers can only see deals where their dealerId matches AND the status is in this list.
 * This mirrors the server-side RLS policy for SelectedDeal dealer visibility.
 */
export const DEALER_ACTIVE_PIPELINE_STATUSES = [
  "SELECTED",
  "FINANCING_PENDING",
  "FINANCING_APPROVED",
  "FEE_PENDING",
  "FEE_PAID",
  "INSURANCE_PENDING",
  "INSURANCE_COMPLETE",
  "CONTRACT_PENDING",
  "CONTRACT_REVIEW",
  "CONTRACT_APPROVED",
  "SIGNING_PENDING",
  "SIGNED",
  "PICKUP_SCHEDULED",
] as const

export type DealerVisibleDealStatus = (typeof DEALER_ACTIVE_PIPELINE_STATUSES)[number]

/**
 * Check if a deal status is visible to a dealer in the active pipeline.
 */
export function isDealerVisibleStatus(status: string): boolean {
  return (DEALER_ACTIVE_PIPELINE_STATUSES as readonly string[]).includes(status)
}
