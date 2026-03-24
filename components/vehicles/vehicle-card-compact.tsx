"use client"

import { cn } from "@/lib/utils"
import { VehicleImageFrame } from "./vehicle-image-frame"
import { VehiclePriceBlock } from "./vehicle-price-block"
import { VehicleSpecsList } from "./vehicle-specs-list"
import { VehicleStatusChips, type ChipVariant } from "./vehicle-status-chips"
import type { ReactNode } from "react"

interface VehicleCardCompactProps {
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  imageSrc?: string | null
  mileage?: number | null
  bodyStyle?: string | null
  price?: number | null
  priceLabel?: string
  chips?: ChipVariant[]
  actions?: ReactNode
  onClick?: () => void
  className?: string
}

/** Compact horizontal card for dense listings, shortlists, and auction rows */
export function VehicleCardCompact({
  year,
  make,
  model,
  trim,
  imageSrc,
  mileage,
  bodyStyle,
  price,
  priceLabel,
  chips = [],
  actions,
  onClick,
  className,
}: VehicleCardCompactProps) {
  const title = [year, make, model].filter(Boolean).join(" ")
  const alt = trim ? `${title} ${trim}` : title

  const Wrapper = onClick ? "button" : "div"

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl border border-border/60",
        "bg-card hover:bg-muted/40 transition-colors",
        "hover:border-border hover:shadow-sm",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <Wrapper
        onClick={onClick}
        className={cn("flex items-center gap-4 flex-1 min-w-0", onClick && "text-left")}
        {...(onClick ? { type: "button" as const } : {})}
      >
        {/* Thumbnail */}
        <div className="w-28 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <VehicleImageFrame
            src={imageSrc}
            alt={alt}
            aspectRatio="video"
            size="sm"
            className="h-full w-full rounded-lg"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="font-semibold text-sm leading-tight tracking-tight truncate">
            {title || "Vehicle"}
          </h4>
          {trim && (
            <p className="text-xs text-muted-foreground truncate">{trim}</p>
          )}
          <VehicleSpecsList
            mileage={mileage}
            bodyStyle={bodyStyle}
            layout="inline"
            size="sm"
          />
          {chips.length > 0 && (
            <VehicleStatusChips chips={chips} size="sm" />
          )}
        </div>

        {/* Price */}
        <div className="flex-shrink-0 text-right">
          <VehiclePriceBlock price={price} label={priceLabel} size="sm" />
        </div>
      </Wrapper>

      {/* Actions */}
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {actions}
        </div>
      )}
    </div>
  )
}
