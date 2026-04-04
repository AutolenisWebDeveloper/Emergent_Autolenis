"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, TrendingUp, Calendar, Car, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface ResultStepProps {
  preQual: {
    maxOtdAmountCents?: number
    minMonthlyPaymentCents?: number
    maxMonthlyPaymentCents?: number
    creditTier: string
    expiresAt: Date | string
  }
}

export function ResultStep({ preQual }: ResultStepProps) {
  const router = useRouter()

  const getMaxOtd = () => {
    return (preQual.maxOtdAmountCents || 0) / 100
  }

  const getMinMonthly = () => {
    return (preQual.minMonthlyPaymentCents || 0) / 100
  }

  const getMaxMonthly = () => {
    return (preQual.maxMonthlyPaymentCents || 0) / 100
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date))
  }

  const getTierDisplay = (tier: string) => {
    const tiers: Record<string, { label: string; color: string; bgColor: string }> = {
      EXCELLENT: { label: "Excellent", color: "text-green-700", bgColor: "bg-green-100" },
      PRIME: { label: "Prime", color: "text-blue-700", bgColor: "bg-blue-100" },
      NEAR_PRIME: { label: "Near Prime", color: "text-yellow-700", bgColor: "bg-yellow-100" },
      SUBPRIME: { label: "Subprime", color: "text-orange-700", bgColor: "bg-orange-100" },
      GOOD: { label: "Good", color: "text-blue-700", bgColor: "bg-blue-100" },
      FAIR: { label: "Fair", color: "text-yellow-700", bgColor: "bg-yellow-100" },
      POOR: { label: "Fair", color: "text-orange-700", bgColor: "bg-orange-100" },
    }
    return tiers[tier] || { label: tier, color: "text-gray-700", bgColor: "bg-muted" }
  }

  const tierInfo = getTierDisplay(preQual.creditTier)

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-900 dark:text-green-100">You're pre-qualified!</CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300 text-base">
                Great news! You're approved to start shopping for your next vehicle.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Approval Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Approval Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Amount */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Approved up to</div>
            <div className="text-5xl font-bold text-primary mb-2">{formatCurrency(getMaxOtd())}</div>
            <div className="text-sm text-muted-foreground">Out-the-door price (includes taxes & fees)</div>
          </div>

          {/* Details Grid */}
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estimated Monthly</span>
              </div>
              <div className="text-xl font-semibold">
                {formatCurrency(getMinMonthly())} - {formatCurrency(getMaxMonthly())}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Based on 60-month term</div>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Credit Tier</span>
              </div>
              <Badge className={`${tierInfo.bgColor} ${tierInfo.color} border-0 text-sm px-3 py-1`}>
                {tierInfo.label}
              </Badge>
            </div>
          </div>

          {/* Expiry Info */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Pre-qualification valid until</div>
              <div className="text-sm text-muted-foreground">{formatDate(preQual.expiresAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">1</span>
              </div>
              <div>
                <div className="font-medium">Browse vehicles in your budget</div>
                <div className="text-sm text-muted-foreground">
                  We'll only show you vehicles within your approved amount
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">2</span>
              </div>
              <div>
                <div className="font-medium">Add favorites to your shortlist</div>
                <div className="text-sm text-muted-foreground">
                  Save vehicles you like to compare and start an auction
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">3</span>
              </div>
              <div>
                <div className="font-medium">Start an auction</div>
                <div className="text-sm text-muted-foreground">Let dealers compete to give you the best price</div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* CTA Button */}
      <Button onClick={() => router.push("/buyer/search")} className="w-full" size="lg">
        <Car className="h-5 w-5 mr-2" />
        Start Shopping for Vehicles
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  )
}
