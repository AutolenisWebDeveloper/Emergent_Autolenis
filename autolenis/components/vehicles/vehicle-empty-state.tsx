"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Car, Search, Plus } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

interface VehicleEmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function VehicleEmptyState({
  title = "No vehicles found",
  description = "Try adjusting your search or filters.",
  icon,
  primaryAction,
  secondaryAction,
  className,
}: VehicleEmptyStateProps) {
  return (
    <Card className={cn("border-dashed border-2 border-border/50", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
          {icon || <Car className="h-8 w-8 text-muted-foreground/50" />}
        </div>
        <h3 className="text-lg font-semibold mb-1.5 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                asChild={!!primaryAction.href}
              >
                {primaryAction.href ? (
                  <Link href={primaryAction.href}>{primaryAction.label}</Link>
                ) : (
                  primaryAction.label
                )}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
                asChild={!!secondaryAction.href}
              >
                {secondaryAction.href ? (
                  <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
                ) : (
                  secondaryAction.label
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
