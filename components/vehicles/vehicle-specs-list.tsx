"use client"

import { cn } from "@/lib/utils"
import { Gauge, Fuel, Cog, Truck } from "lucide-react"
import type { ReactNode } from "react"

interface VehicleSpecsListProps {
  mileage?: number | null
  bodyStyle?: string | null
  transmission?: string | null
  drivetrain?: string | null
  fuelType?: string | null
  layout?: "inline" | "grid"
  size?: "sm" | "md"
  className?: string
}

const formatMileage = (miles: number) =>
  new Intl.NumberFormat("en-US").format(miles) + " mi"

interface SpecItem {
  icon: ReactNode
  label: string
  value: string
}

export function VehicleSpecsList({
  mileage,
  bodyStyle,
  transmission,
  drivetrain,
  fuelType,
  layout = "inline",
  size = "sm",
  className,
}: VehicleSpecsListProps) {
  const specs: SpecItem[] = []

  if (mileage != null) {
    specs.push({
      icon: <Gauge className="h-3.5 w-3.5 text-muted-foreground/70" />,
      label: "Mileage",
      value: formatMileage(mileage),
    })
  }

  if (bodyStyle) {
    specs.push({
      icon: <Truck className="h-3.5 w-3.5 text-muted-foreground/70" />,
      label: "Body",
      value: bodyStyle,
    })
  }

  if (transmission) {
    specs.push({
      icon: <Cog className="h-3.5 w-3.5 text-muted-foreground/70" />,
      label: "Transmission",
      value: transmission,
    })
  }

  if (fuelType || drivetrain) {
    specs.push({
      icon: <Fuel className="h-3.5 w-3.5 text-muted-foreground/70" />,
      label: "Powertrain",
      value: [fuelType, drivetrain].filter(Boolean).join(" · "),
    })
  }

  if (specs.length === 0) return null

  const textSize = size === "sm" ? "text-xs" : "text-sm"

  if (layout === "inline") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", textSize, "text-muted-foreground", className)}>
        {specs.map((spec, idx) => (
          <span key={spec.label} className="flex items-center gap-1">
            {spec.icon}
            <span>{spec.value}</span>
            {idx < specs.length - 1 && (
              <span className="text-border ml-2" aria-hidden="true">·</span>
            )}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2", textSize, className)}>
      {specs.map((spec) => (
        <div key={spec.label} className="flex items-center gap-1.5">
          {spec.icon}
          <div>
            <div className="text-muted-foreground/70 text-[10px] uppercase tracking-wider leading-none mb-0.5">
              {spec.label}
            </div>
            <div className="font-medium text-foreground">{spec.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
