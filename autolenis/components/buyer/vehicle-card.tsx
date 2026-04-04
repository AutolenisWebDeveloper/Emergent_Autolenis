"use client"

import { VehicleCard as CanonicalVehicleCard, type ChipVariant } from "@/components/vehicles"

interface VehicleCardProps {
  vehicle: any
  inventoryItem: any
  dealer: any
  onAddToShortlist?: () => void
  isInShortlist?: boolean
  showInBudget?: boolean
}

/**
 * Legacy adapter — maps the old { vehicle, inventoryItem, dealer } shape
 * to the canonical VehicleCard props so existing consumers continue to work.
 */
export function VehicleCard({
  vehicle,
  inventoryItem,
  dealer,
  onAddToShortlist,
  isInShortlist,
  showInBudget,
}: VehicleCardProps) {
  const chips: ChipVariant[] = []
  if (showInBudget) chips.push("in-budget")

  const dealerLocation = [dealer?.city, dealer?.state].filter(Boolean).join(", ")

  return (
    <CanonicalVehicleCard
      year={inventoryItem?.year ?? vehicle?.year}
      make={inventoryItem?.make ?? vehicle?.make}
      model={inventoryItem?.model ?? vehicle?.model}
      trim={inventoryItem?.trim ?? vehicle?.trim}
      imageSrc={inventoryItem?.photosJson?.[0] || vehicle?.images?.[0] || null}
      mileage={inventoryItem?.mileage ?? vehicle?.mileage}
      bodyStyle={inventoryItem?.bodyStyle ?? vehicle?.bodyStyle}
      price={inventoryItem?.priceCents ? inventoryItem.priceCents / 100 : undefined}
      priceLabel="Est. OTD Price"
      dealerName={dealer?.businessName}
      dealerLocation={dealerLocation}
      chips={chips}
      onAddToShortlist={onAddToShortlist}
      isInShortlist={isInShortlist}
    />
  )
}
