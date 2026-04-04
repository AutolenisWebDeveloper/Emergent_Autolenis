"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Car, Building2, DollarSign } from "lucide-react"
import type { ReactNode } from "react"

interface VehicleSummaryPanelProps {
  /** Vehicle identity */
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  vin?: string | null
  mileage?: number | null
  color?: string | null
  /** Price data */
  otdPrice?: number | null
  vehiclePrice?: number | null
  taxesAndFees?: number | null
  monthlyEstimate?: number | null
  priceLabel?: string
  /** Dealer context */
  dealerName?: string | null
  dealerCity?: string | null
  dealerState?: string | null
  /** Additional content slots */
  headerAction?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Premium vehicle + deal summary for deal pages, offer detail, and confirmation flows */
export function VehicleSummaryPanel({
  year,
  make,
  model,
  trim,
  vin,
  mileage,
  color,
  otdPrice,
  vehiclePrice,
  taxesAndFees,
  monthlyEstimate,
  priceLabel,
  dealerName,
  dealerCity,
  dealerState,
  headerAction,
  footer,
  className,
}: VehicleSummaryPanelProps) {
  const title = [year, make, model].filter(Boolean).join(" ")
  const dealerLocation = [dealerCity, dealerState].filter(Boolean).join(", ")

  const specs: { label: string; value: string | undefined | null }[] = [
    { label: "Trim", value: trim },
    { label: "Mileage", value: mileage != null ? `${mileage.toLocaleString()} mi` : null },
    { label: "Color", value: color || null },
    { label: "VIN", value: vin },
  ].filter((s) => s.value != null && s.value !== "")

  return (
    <Card className={cn("overflow-hidden border-0 shadow-md", className)}>
      {/* Vehicle header */}
      <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Car className="h-5 w-5 text-white/70" />
            Selected Vehicle
          </CardTitle>
          {headerAction}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Vehicle details */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-4">
              {title || "Vehicle"}
            </h3>
            <div className="space-y-2.5">
              {specs.map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      "font-medium",
                      row.label === "VIN" && "font-mono text-xs tracking-wide text-muted-foreground",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dealer + pricing */}
          <div className="md:border-l md:pl-6 space-y-6">
            {/* Dealer block */}
            {dealerName && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Dealer
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{dealerName}</span>
                  </div>
                  {dealerLocation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{dealerLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing */}
            {(otdPrice != null || vehiclePrice != null) && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  Price Breakdown
                </h4>
                <div className="space-y-2.5">
                  {vehiclePrice != null && (
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="text-muted-foreground">Vehicle Price</span>
                      <span className="font-semibold tabular-nums">
                        ${Number(vehiclePrice).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {taxesAndFees != null && (
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="text-muted-foreground">Taxes &amp; Fees</span>
                      <span className="text-sm font-medium tabular-nums">
                        ${taxesAndFees.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {otdPrice != null && (
                    <div className="border-t pt-2.5 flex justify-between items-baseline">
                      <span className="font-semibold text-sm">Total Out-the-Door</span>
                      <span className="text-xl font-bold tabular-nums text-primary">
                        ${Number(otdPrice).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {monthlyEstimate != null && (
                    <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                      <span>Est. Monthly</span>
                      <span className="font-medium">${monthlyEstimate.toLocaleString()}/mo</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {footer && (
        <div className="px-6 pb-6 pt-2">
          {footer}
        </div>
      )}
    </Card>
  )
}
