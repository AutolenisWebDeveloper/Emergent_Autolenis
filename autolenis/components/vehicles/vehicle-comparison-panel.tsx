"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VehicleImageFrame } from "./vehicle-image-frame"
import { VehiclePriceBlock } from "./vehicle-price-block"
import { VehicleSpecsList } from "./vehicle-specs-list"
import { MapPin, Star, CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

interface ComparisonOption {
  /** Unique identifier */
  id: string
  /** Display label (e.g. "Best Cash Price") */
  label: string
  /** Description text */
  description?: string
  /** Whether this is the recommended / top option */
  recommended?: boolean
  /** Score out of 100 */
  score?: number
  /** Accent color class for the option's theme, e.g. "text-green-600" */
  accentColor?: string
  /** Background color class for the option's card, e.g. "bg-green-50 border-green-200" */
  bgColor?: string
  /** Icon element for the option type */
  icon?: ReactNode
  /** Vehicle identity */
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  imageSrc?: string | null
  mileage?: number | null
  /** Pricing */
  cashOtd?: number | null
  monthlyPayment?: number | null
  /** Dealer context */
  dealerName?: string | null
  dealerCity?: string | null
  dealerState?: string | null
  dealerScore?: number | null
  /** Financing badges */
  financingOptions?: Array<{
    apr: number
    termMonths: number
    monthlyPayment: number
  }>
  /** Primary action */
  onSelect?: () => void
  selectLabel?: string
  selectDisabled?: boolean
  /** Secondary action */
  onDecline?: () => void
  /** Fully custom action area */
  actions?: ReactNode
}

interface VehicleComparisonPanelProps {
  options: ComparisonOption[]
  className?: string
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)

/** Side-by-side or stacked comparison panel for best-price / offer comparison views */
export function VehicleComparisonPanel({
  options,
  className,
}: VehicleComparisonPanelProps) {
  if (options.length === 0) return null

  return (
    <div className={cn("space-y-6", className)}>
      {options.map((option, index) => {
        const title = [option.year, option.make, option.model]
          .filter(Boolean)
          .join(" ")
        const dealerLocation = [option.dealerCity, option.dealerState]
          .filter(Boolean)
          .join(", ")

        return (
          <Card
            key={option.id}
            className={cn(
              "overflow-hidden border-2 transition-shadow hover:shadow-md",
              option.bgColor || "border-border",
            )}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {option.icon && (
                    <div className="p-3 rounded-xl bg-white shadow-sm dark:bg-card flex-shrink-0">
                      {option.icon}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                      {option.label}
                      {option.recommended && (
                        <Badge className="bg-green-600 text-white hover:bg-green-700">
                          Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
                {option.score != null && (
                  <Badge variant="outline" className="text-sm flex-shrink-0">
                    Score: {Math.round(option.score)}/100
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Vehicle info */}
              <div className="flex items-start gap-4 p-4 bg-white dark:bg-card rounded-xl border border-border/40">
                <div className="w-36 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <VehicleImageFrame
                    src={option.imageSrc}
                    alt={title || "Vehicle"}
                    aspectRatio="video"
                    size="sm"
                    className="h-full w-full rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight">
                    {title || "Vehicle"}
                  </h3>
                  <VehicleSpecsList
                    mileage={option.mileage}
                    className="mt-1"
                  />
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {dealerLocation && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {dealerLocation}
                      </span>
                    )}
                    {option.dealerScore != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        {option.dealerScore}/100
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing row */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-border/40 text-center">
                  <VehiclePriceBlock
                    price={option.cashOtd}
                    label="Cash OTD Price"
                    size="md"
                    className="items-center"
                    verified
                  />
                </div>
                {option.monthlyPayment != null && (
                  <div className="bg-white dark:bg-card p-4 rounded-xl border border-border/40 text-center">
                    <VehiclePriceBlock
                      price={option.monthlyPayment}
                      label="Monthly Payment"
                      size="md"
                      className="items-center"
                    />
                  </div>
                )}
                {option.dealerName && (
                  <div className="bg-white dark:bg-card p-4 rounded-xl border border-border/40 text-center">
                    <div className="text-sm font-medium truncate">{option.dealerName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Dealer</div>
                  </div>
                )}
              </div>

              {/* Financing options */}
              {option.financingOptions && option.financingOptions.length > 0 && (
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-border/40">
                  <h4 className="font-medium text-sm mb-2.5">Available Financing</h4>
                  <div className="flex gap-2 flex-wrap">
                    {option.financingOptions.map((fin, i) => (
                      <Badge key={i} variant="outline" className="py-1.5 text-xs">
                        {fin.apr}% APR · {fin.termMonths}mo · {formatCurrency(fin.monthlyPayment)}/mo
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {option.actions || (
                <div className="flex gap-3">
                  {option.onSelect && (
                    <Button
                      onClick={option.onSelect}
                      disabled={option.selectDisabled}
                      className="flex-1"
                      size="lg"
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      {option.selectLabel || "Select This Deal"}
                    </Button>
                  )}
                  {option.onDecline && (
                    <Button
                      variant="outline"
                      onClick={option.onDecline}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                      Decline
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
