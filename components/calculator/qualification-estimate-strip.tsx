"use client"

import { useState, useMemo } from "react"
import { Calculator, Info, DollarSign, Car, CreditCard, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// APR bands by credit score (realistic midpoints)
const APR_BANDS: Record<string, { apr: number; label: string }> = {
  "760+": { apr: 5.99, label: "Excellent" },
  "720-759": { apr: 7.49, label: "Very Good" },
  "680-719": { apr: 9.99, label: "Good" },
  "640-679": { apr: 12.99, label: "Fair" },
  "600-639": { apr: 16.99, label: "Below Average" },
  "<600": { apr: 21.99, label: "Needs Work" },
}

// Configuration constants
const DEFAULT_TERM_MONTHS = 60
const TAX_FEES_PERCENT = 0.1 // 10% for TTL + fees
const PTI_CAP = 0.12 // 12% Payment-to-Income cap
const HOUSING_PRESSURE_THRESHOLD = 0.3 // If housing > 30% of income, reduce affordability
const INSURANCE_MAINTENANCE_BUFFER = 275 // Monthly buffer for insurance/maintenance

// Reverse: calculate principal from payment
function calculatePrincipal(payment: number, annualRate: number, termMonths: number): number {
  if (payment <= 0 || termMonths <= 0) return 0
  if (annualRate === 0) return payment * termMonths

  const monthlyRate = annualRate / 100 / 12
  const principal =
    (payment * (Math.pow(1 + monthlyRate, termMonths) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, termMonths))

  return Math.max(0, principal)
}

export function QualificationEstimateStrip() {
  const [monthlyIncome, setMonthlyIncome] = useState<string>("")
  const [monthlyHousing, setMonthlyHousing] = useState<string>("")
  const [downPayment, setDownPayment] = useState<string>("")
  const [creditScore, setCreditScore] = useState<string>("680-719")

  const results = useMemo(() => {
    const income = Math.max(0, Number.parseFloat(monthlyIncome) || 0)
    const housing = Math.max(0, Number.parseFloat(monthlyHousing) || 0)
    const down = Math.max(0, Number.parseFloat(downPayment) || 0)
    const aprData = APR_BANDS[creditScore] || APR_BANDS["680-719"]

    // Step 1: Calculate base max payment from PTI cap
    let maxPayment = income * PTI_CAP

    // Step 2: Apply housing pressure - if housing is high, reduce available payment
    const housingRatio = income > 0 ? housing / income : 0
    if (housingRatio > HOUSING_PRESSURE_THRESHOLD) {
      // Progressive reduction: the higher the housing ratio, the more we reduce
      const pressureFactor = Math.max(0.3, 1 - (housingRatio - HOUSING_PRESSURE_THRESHOLD) * 2)
      maxPayment = maxPayment * pressureFactor
    }

    // Step 3: Subtract insurance/maintenance buffer
    maxPayment = maxPayment - INSURANCE_MAINTENANCE_BUFFER

    // Step 4: Clamp to non-negative
    maxPayment = Math.max(0, maxPayment)

    // Step 5: Calculate comfortable range (80%-100% of max)
    const minPayment = Math.max(0, maxPayment * 0.8)

    // Step 6: Calculate vehicle price from payment (before down payment)
    const maxLoanAmount = calculatePrincipal(maxPayment, aprData?.apr || 8, DEFAULT_TERM_MONTHS)
    const minLoanAmount = calculatePrincipal(minPayment, aprData?.apr || 8, DEFAULT_TERM_MONTHS)

    // Step 7: Add down payment to get vehicle price
    const maxVehiclePrice = maxLoanAmount + down
    const minVehiclePrice = minLoanAmount + down

    // Step 8: Calculate out-the-door budget (vehicle price + TTL)
    const maxOTD = maxVehiclePrice * (1 + TAX_FEES_PERCENT)
    const minOTD = minVehiclePrice * (1 + TAX_FEES_PERCENT)

    // Step 9: Check if inputs make affordability effectively zero
    const showWarning = maxPayment < 50 && income > 0

    return {
      paymentRange: { min: Math.round(minPayment), max: Math.round(maxPayment) },
      vehicleRange: { min: Math.round(minVehiclePrice), max: Math.round(maxVehiclePrice) },
      otdRange: { min: Math.round(minOTD), max: Math.round(maxOTD) },
      apr: aprData?.apr || 8,
      aprLabel: aprData?.label || "Good Credit",
      showWarning,
      hasInputs: income > 0,
    }
  }, [monthlyIncome, monthlyHousing, downPayment, creditScore])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <section className="py-8 sm:py-10 bg-surface-elevated border-y border-border">
      <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-background border border-border shadow-sm">
          <CardContent className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-brand-green" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">Qualification Estimate</h3>
                <p className="text-xs text-muted-foreground">See what you might afford in 30 seconds</p>
              </div>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {/* Monthly Income */}
              <div className="space-y-1.5">
                <Label htmlFor="income" className="text-xs font-medium text-foreground/70 flex items-center gap-1">
                  Monthly Income (gross)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Your total monthly income before taxes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="income"
                    type="number"
                    placeholder="5,000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Monthly Housing */}
              <div className="space-y-1.5">
                <Label htmlFor="housing" className="text-xs font-medium text-foreground/70 flex items-center gap-1">
                  Monthly Housing
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Rent or mortgage payment</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="housing"
                    type="number"
                    placeholder="1,500"
                    value={monthlyHousing}
                    onChange={(e) => setMonthlyHousing(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Down Payment */}
              <div className="space-y-1.5">
                <Label htmlFor="down" className="text-xs font-medium text-foreground/70 flex items-center gap-1">
                  Down Payment
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Cash you can put towards the purchase</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="down"
                    type="number"
                    placeholder="3,000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Credit Score */}
              <div className="space-y-1.5">
                <Label htmlFor="credit" className="text-xs font-medium text-foreground/70">
                  Estimated Credit Score
                </Label>
                <Select value={creditScore} onValueChange={setCreditScore}>
                  <SelectTrigger id="credit" className="h-9 text-sm">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="760+">760+ (Excellent)</SelectItem>
                    <SelectItem value="720-759">720–759 (Very Good)</SelectItem>
                    <SelectItem value="680-719">680–719 (Good)</SelectItem>
                    <SelectItem value="640-679">640–679 (Fair)</SelectItem>
                    <SelectItem value="600-639">600–639 (Below Avg)</SelectItem>
                    <SelectItem value="<600">Under 600</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-surface-elevated rounded-lg border border-border">
              {/* Payment Range */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-brand-purple" />
                  <span className="text-xs font-medium text-muted-foreground">Est. Payment</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-brand-purple">
                  {results.hasInputs
                    ? `${formatCurrency(results.paymentRange.min)}–${formatCurrency(results.paymentRange.max)}`
                    : "—"}
                </div>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>

              {/* Vehicle Price Range */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Car className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-xs font-medium text-muted-foreground">Vehicle Price</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-brand-green">
                  {results.hasInputs
                    ? `${formatCurrency(results.vehicleRange.min)}–${formatCurrency(results.vehicleRange.max)}`
                    : "—"}
                </div>
                <span className="text-xs text-muted-foreground">before tax/fees</span>
              </div>

              {/* OTD Budget */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-brand-cyan" />
                  <span className="text-xs font-medium text-muted-foreground">Out-the-Door</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-brand-cyan">
                  {results.hasInputs
                    ? `${formatCurrency(results.otdRange.min)}–${formatCurrency(results.otdRange.max)}`
                    : "—"}
                </div>
                <span className="text-xs text-muted-foreground">total budget</span>
              </div>

              {/* APR Estimate */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-blue" />
                  <span className="text-xs font-medium text-muted-foreground">Est. APR</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-brand-blue">{results.apr}%</div>
                <span className="text-xs text-muted-foreground">{results.aprLabel}</span>
              </div>
            </div>

            {/* Warning message if affordability is too low */}
            {results.showWarning && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 text-center">
                  Based on these inputs, a vehicle payment may not be recommended. Consider reducing housing costs or
                  increasing income first.
                </p>
              </div>
            )}

            {/* Disclaimer and assumptions */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-muted-foreground italic">
                  Estimate only. Not a credit decision or loan offer.
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-xs text-brand-purple font-medium hover:underline cursor-help">
                      View assumptions
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <p>
                          <strong>Term:</strong> 60 months
                        </p>
                        <p>
                          <strong>Tax/fees:</strong> ~10% added to vehicle price
                        </p>
                        <p>
                          <strong>Insurance/maintenance:</strong> $275/mo buffer
                        </p>
                        <p>
                          <strong>Payment cap:</strong> 12% of gross income
                        </p>
                        <p>
                          <strong>Housing pressure:</strong> Applied if housing {">"}30% of income
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default QualificationEstimateStrip
