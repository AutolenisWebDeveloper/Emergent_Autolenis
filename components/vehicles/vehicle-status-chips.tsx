"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Shield, CheckCircle2, Globe, Clock, Sparkles, AlertTriangle } from "lucide-react"
import type { ReactNode } from "react"

type ChipVariant =
  | "verified"
  | "likely-available"
  | "unconfirmed"
  | "in-budget"
  | "network"
  | "market"
  | "sourcing"
  | "auction-active"
  | "selected"
  | "pending"
  | "available"
  | "stale"
  | "promoted"

interface VehicleStatusChipsProps {
  chips: ChipVariant[]
  size?: "sm" | "md"
  className?: string
}

const CHIP_CONFIG: Record<
  ChipVariant,
  { label: string; icon: ReactNode; className: string }
> = {
  verified: {
    label: "Verified Available",
    icon: <Shield className="h-3 w-3" />,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  "likely-available": {
    label: "Likely Available",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  },
  unconfirmed: {
    label: "Availability Unconfirmed",
    icon: <Globe className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
  "in-budget": {
    label: "In Budget",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-accent text-accent-foreground",
  },
  network: {
    label: "Network Dealer",
    icon: <Shield className="h-3 w-3" />,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  market: {
    label: "Market",
    icon: <Globe className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
  sourcing: {
    label: "Sourcing",
    icon: <Sparkles className="h-3 w-3" />,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  },
  "auction-active": {
    label: "Auction Active",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  },
  selected: {
    label: "Selected",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
  },
  available: {
    label: "Available",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  stale: {
    label: "Stale",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
  },
  promoted: {
    label: "Promoted",
    icon: <Sparkles className="h-3 w-3" />,
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  },
}

export function VehicleStatusChips({
  chips,
  size = "sm",
  className,
}: VehicleStatusChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((variant) => {
        const config = CHIP_CONFIG[variant]
        if (!config) return null
        return (
          <Badge
            key={variant}
            variant="outline"
            className={cn(
              "gap-1 font-medium border",
              size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
              config.className,
            )}
          >
            {config.icon}
            {config.label}
          </Badge>
        )
      })}
    </div>
  )
}

/** Convenience: render a single status chip */
export function VehicleStatusChip({
  variant,
  size = "sm",
  className,
}: {
  variant: ChipVariant
  size?: "sm" | "md"
  className?: string
}) {
  return <VehicleStatusChips chips={[variant]} size={size} className={className} />
}

export type { ChipVariant }
