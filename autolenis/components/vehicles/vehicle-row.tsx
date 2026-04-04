"use client"

import { cn } from "@/lib/utils"
import { VehiclePriceBlock } from "./vehicle-price-block"
import type { ChipVariant } from "./vehicle-status-chips"
import type { ReactNode } from "react"

interface VehicleRowProps {
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  vin?: string | null
  stockNumber?: string | null
  mileage?: number | null
  price?: number | null
  /** Price in cents (used in admin contexts) */
  priceCents?: number | null
  status?: string | null
  statusVariant?: ChipVariant
  extraColumns?: ReactNode
  actions?: ReactNode
  onClick?: () => void
  className?: string
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  VERIFIED: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300",
  STALE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SOLD: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  PROMOTED: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  DUPLICATE: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
}

const formatMileage = (miles: number) =>
  new Intl.NumberFormat("en-US").format(miles) + " mi"

/** Table-row style vehicle display for admin/dealer inventory tables */
export function VehicleRow({
  year,
  make,
  model,
  trim,
  vin,
  stockNumber,
  mileage,
  price,
  priceCents,
  status,
  extraColumns,
  actions,
  onClick,
  className,
}: VehicleRowProps) {
  const title = [year, make, model].filter(Boolean).join(" ")
  const displayPrice = priceCents != null ? priceCents / 100 : price

  return (
    <tr
      className={cn(
        "border-b border-border/40 transition-colors",
        "hover:bg-muted/40",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {/* Vehicle identity */}
      <td className="py-3.5 px-4">
        <div className="font-medium text-sm text-foreground">{title}</div>
        {trim && (
          <div className="text-xs text-muted-foreground mt-0.5">{trim}</div>
        )}
      </td>

      {/* VIN */}
      {vin !== undefined && (
        <td className="py-3.5 px-4">
          <span className="text-xs font-mono text-muted-foreground tracking-wide">
            {vin || "—"}
          </span>
        </td>
      )}

      {/* Stock # */}
      {stockNumber !== undefined && (
        <td className="py-3.5 px-4 text-sm text-muted-foreground">
          {stockNumber || "—"}
        </td>
      )}

      {/* Mileage */}
      {mileage !== undefined && (
        <td className="py-3.5 px-4 text-sm text-muted-foreground">
          {mileage != null ? formatMileage(mileage) : "—"}
        </td>
      )}

      {/* Price */}
      <td className="py-3.5 px-4">
        {displayPrice != null && displayPrice > 0 ? (
          <span className="text-sm font-semibold tabular-nums">
            ${displayPrice.toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      {/* Status */}
      {status !== undefined && (
        <td className="py-3.5 px-4">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase",
              STATUS_COLORS[(status || "").toUpperCase()] || "bg-muted text-muted-foreground",
            )}
          >
            {status || "—"}
          </span>
        </td>
      )}

      {/* Extra columns */}
      {extraColumns}

      {/* Actions */}
      {actions && (
        <td className="py-3.5 px-4 text-right">
          <div onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </td>
      )}
    </tr>
  )
}
