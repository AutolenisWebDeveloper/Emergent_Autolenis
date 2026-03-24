"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Heart, MapPin } from "lucide-react"
import { VehicleImageFrame } from "./vehicle-image-frame"
import { VehiclePriceBlock } from "./vehicle-price-block"
import { VehicleSpecsList } from "./vehicle-specs-list"
import { VehicleStatusChips, type ChipVariant } from "./vehicle-status-chips"
import type { ReactNode } from "react"

interface VehicleCardProps {
  /** Vehicle identity */
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  /** Primary image URL */
  imageSrc?: string | null
  /** Key specs */
  mileage?: number | null
  bodyStyle?: string | null
  transmission?: string | null
  fuelType?: string | null
  /** Price */
  price?: number | null
  priceLabel?: string
  priceVerified?: boolean
  /** Dealer / location context */
  dealerName?: string | null
  dealerLocation?: string | null
  /** Status chips */
  chips?: ChipVariant[]
  /** Actions */
  onAddToShortlist?: () => void
  isInShortlist?: boolean
  /** Custom action area (replaces default shortlist button) */
  actions?: ReactNode
  /** Priority image loading */
  imagePriority?: boolean
  /** Click handler for card-level navigation */
  onClick?: () => void
  className?: string
}

export function VehicleCard({
  year,
  make,
  model,
  trim,
  imageSrc,
  mileage,
  bodyStyle,
  transmission,
  fuelType,
  price,
  priceLabel,
  priceVerified,
  dealerName,
  dealerLocation,
  chips = [],
  onAddToShortlist,
  isInShortlist,
  actions,
  imagePriority = false,
  onClick,
  className,
}: VehicleCardProps) {
  const title = [year, make, model].filter(Boolean).join(" ")
  const alt = trim ? `${title} ${trim}` : title
  const location = [dealerName, dealerLocation].filter(Boolean).join(" — ")

  const CardWrapper = onClick ? "button" : "div"

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        "border-border/60 hover:border-border",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <CardWrapper
        onClick={onClick}
        className={cn(onClick && "w-full text-left")}
        {...(onClick ? { type: "button" as const } : {})}
      >
        {/* Image */}
        <VehicleImageFrame
          src={imageSrc}
          alt={alt}
          aspectRatio="video"
          priority={imagePriority}
          overlay={
            chips.length > 0 ? (
              <div className="absolute top-2.5 left-2.5">
                <VehicleStatusChips chips={chips} />
              </div>
            ) : undefined
          }
        />

        {/* Content */}
        <CardContent className="p-4 space-y-3">
          {/* Vehicle identity */}
          <div>
            <h3 className="font-semibold text-base leading-tight tracking-tight text-foreground">
              {title || "Vehicle"}
            </h3>
            {trim && (
              <p className="text-sm text-muted-foreground mt-0.5">{trim}</p>
            )}
          </div>

          {/* Specs */}
          <VehicleSpecsList
            mileage={mileage}
            bodyStyle={bodyStyle}
            transmission={transmission}
            fuelType={fuelType}
          />

          {/* Dealer/Location */}
          {location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Price + Actions */}
          <div className="flex items-end justify-between gap-3 pt-1 border-t border-border/40">
            <VehiclePriceBlock
              price={price}
              label={priceLabel}
              verified={priceVerified}
              size="md"
            />

            {actions || (onAddToShortlist && (
              <Button
                variant={isInShortlist ? "secondary" : "default"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddToShortlist()
                }}
                disabled={isInShortlist}
                className="flex-shrink-0"
              >
                <Heart
                  className={cn(
                    "h-4 w-4 mr-1.5",
                    isInShortlist && "fill-current",
                  )}
                />
                {isInShortlist ? "Saved" : "Save"}
              </Button>
            ))}
          </div>
        </CardContent>
      </CardWrapper>
    </Card>
  )
}
