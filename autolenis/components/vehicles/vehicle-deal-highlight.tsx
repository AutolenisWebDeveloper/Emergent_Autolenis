"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VehiclePriceBlock } from "./vehicle-price-block"
import { VehicleSpecsList } from "./vehicle-specs-list"
import { Car, Building2, ArrowRight, CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

interface VehicleDealHighlightProps {
  /** Vehicle identity */
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  vin?: string | null
  mileage?: number | null
  color?: string | null
  /** Pricing */
  otdPrice?: number | null
  monthlyPayment?: number | null
  /** Deal status */
  status?: string | null
  statusLabel?: string | null
  statusVariant?: "default" | "secondary" | "outline" | "destructive"
  /** Dealer context */
  dealerName?: string | null
  dealerLocation?: string | null
  /** Next step */
  nextStepLabel?: string | null
  nextStepHref?: string | null
  onNextStep?: () => void
  /** Additional content below the main block */
  footer?: ReactNode
  className?: string
}

/** Prominent deal highlight card for selected deal / offer acceptance / summary workflows */
export function VehicleDealHighlight({
  year,
  make,
  model,
  trim,
  vin,
  mileage,
  color,
  otdPrice,
  monthlyPayment,
  status,
  statusLabel,
  statusVariant = "default",
  dealerName,
  dealerLocation,
  nextStepLabel,
  nextStepHref,
  onNextStep,
  footer,
  className,
}: VehicleDealHighlightProps) {
  const title = [year, make, model].filter(Boolean).join(" ")

  return (
    <Card
      className={cn(
        "overflow-hidden border-0 shadow-lg",
        className,
      )}
    >
      {/* Header with gradient */}
      <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Selected Deal
          </CardTitle>
          {(statusLabel || status) && (
            <Badge variant={statusVariant} className="text-xs">
              {statusLabel || status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        {/* Vehicle identity + specs */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/80 flex items-center justify-center flex-shrink-0">
            <Car className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold tracking-tight leading-tight">
              {title || "Vehicle"}
            </h3>
            {trim && (
              <p className="text-sm text-muted-foreground mt-0.5">{trim}</p>
            )}
            <VehicleSpecsList
              mileage={mileage}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Pricing summary */}
        <div className="grid sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border/40">
          <VehiclePriceBlock
            price={otdPrice}
            label="Out-the-Door Price"
            size="lg"
            verified
          />
          {monthlyPayment != null && (
            <VehiclePriceBlock
              price={monthlyPayment}
              label="Est. Monthly"
              size="md"
            />
          )}
        </div>

        {/* Dealer context */}
        {dealerName && (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div>
              <div className="font-medium">{dealerName}</div>
              {dealerLocation && (
                <div className="text-xs text-muted-foreground">{dealerLocation}</div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle details */}
        {(vin || color) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {vin && (
              <div>
                <span className="text-muted-foreground text-xs">VIN</span>
                <div className="font-mono text-xs tracking-wide text-muted-foreground mt-0.5">{vin}</div>
              </div>
            )}
            {color && (
              <div>
                <span className="text-muted-foreground text-xs">Color</span>
                <div className="font-medium text-sm mt-0.5">{color}</div>
              </div>
            )}
          </div>
        )}

        {/* Next step CTA */}
        {(nextStepLabel || onNextStep) && (
          <Button
            onClick={onNextStep || undefined}
            className="w-full"
            size="lg"
            {...(nextStepHref && !onNextStep ? { asChild: true } : {})}
          >
            {nextStepHref && !onNextStep ? (
              <a href={nextStepHref}>
                {nextStepLabel || "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            ) : (
              <>
                {nextStepLabel || "Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}

        {footer}
      </CardContent>
    </Card>
  )
}
