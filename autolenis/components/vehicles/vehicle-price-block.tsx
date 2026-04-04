"use client"

import { cn } from "@/lib/utils"

interface VehiclePriceBlockProps {
  price: number | null | undefined
  label?: string
  size?: "sm" | "md" | "lg"
  className?: string
  /** Whether the price is verified / exact vs estimated */
  verified?: boolean
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

export function VehiclePriceBlock({
  price,
  label = "Est. OTD Price",
  size = "md",
  className,
  verified,
}: VehiclePriceBlockProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  const labelSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      <div
        className={cn(
          "font-bold tracking-tight tabular-nums",
          textSizes[size],
          price != null ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {price != null && price > 0 ? formatCurrency(price) : "Contact for price"}
      </div>
      <div
        className={cn(
          "text-muted-foreground leading-none",
          labelSizes[size],
          verified && "text-green-600 dark:text-green-400 font-medium",
        )}
      >
        {verified ? "✓ Verified Price" : label}
      </div>
    </div>
  )
}
