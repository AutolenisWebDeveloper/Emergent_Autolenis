"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Calculator, DollarSign, Users, AlertCircle } from "lucide-react"

const COMMISSION_RATES = [0.15, 0.03, 0.02]
const LEVEL_NAMES = ["Direct Referral", "2nd Level", "3rd Level"]
const LEVEL_COLORS = ["#7ED321", "#00D9FF", "#0066FF"]
const PACKAGE_PRICES = [499]

const SLIDER_MAX = 250
const INPUT_MAX = 10000

// Default income distribution
const DEFAULT_GOAL_CONTRIBUTION = [50, 30, 20]

/** Clamp an integer value to [0, max] and reject non-integers */
function sanitizeInt(raw: string, max: number): { value: number; error: string | null } {
  if (raw === "") return { value: 0, error: null }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { value: 0, error: "Enter a whole number" }
  if (n < 0) return { value: 0, error: "Must be 0 or greater" }
  if (n > max) return { value: max, error: `Max value is ${max.toLocaleString()}` }
  return { value: n, error: null }
}

export default function AffiliateIncomePlanner() {
  const [calculatorTab, setCalculatorTab] = useState("estimate")

  // ── Package price (V2: single $499 Premium fee) ──
  const [packageMix] = useState([100]) // 100% of $499

  const weightedPackagePrice = PACKAGE_PRICES[0] // $499

  // ── Estimate My Income state ──
  const getDefaultSales = () => {
    const targetIncome = 2500
    const dist = [0.75, 0.15, 0.10]
    return dist.map((d, i) => {
      const commissionPerSale = weightedPackagePrice * (COMMISSION_RATES[i] || 0)
      return Math.round((targetIncome * d) / commissionPerSale)
    })
  }

  const [salesByLevel, setSalesByLevel] = useState(getDefaultSales())
  const [salesErrors, setSalesErrors] = useState<(string | null)[]>(Array(COMMISSION_RATES.length).fill(null))

  const handleSalesInput = (index: number, raw: string) => {
    const { value, error } = sanitizeInt(raw, INPUT_MAX)
    const newSales = [...salesByLevel]
    newSales[index] = value
    setSalesByLevel(newSales)
    const newErrors = [...salesErrors]
    newErrors[index] = error
    setSalesErrors(newErrors)
  }

  // ── Hit My Income Goal state ──
  const [goalIncome, setGoalIncome] = useState(5000)
  const [goalContribution, setGoalContribution] = useState(DEFAULT_GOAL_CONTRIBUTION)

  const goalContributionTotal = goalContribution.reduce((s, v) => s + v, 0)

  const updateGoalContribution = (index: number, raw: string) => {
    const { value } = sanitizeInt(raw, 100)
    const next = [...goalContribution]
    next[index] = value
    setGoalContribution(next)
  }

  // ── Calculations ──
  const calculateIncome = () =>
    salesByLevel.reduce(
      (total, sales, i) => total + sales * weightedPackagePrice * (COMMISSION_RATES[i] || 0),
      0,
    )

  const calculateSalesForGoal = () => {
    // Normalize contributions so they sum to 100
    const total = goalContributionTotal || 1
    return goalContribution.map((pct, i) => {
      const normalizedPct = pct / total
      const levelIncome = goalIncome * normalizedPct
      const commissionPerSale = weightedPackagePrice * (COMMISSION_RATES[i] || 0)
      return commissionPerSale > 0 ? Math.ceil(levelIncome / commissionPerSale) : 0
    })
  }

  const totalIncome = calculateIncome()
  const salesForGoal = calculateSalesForGoal()

  // ── Package info (reused in both tabs) ──
  const packageMixUI = (
    <div className="space-y-4 p-4 rounded-lg border bg-[#f9f9fb]">
      <h4 className="font-semibold text-[#3d2066] text-sm">Premium Plan Fee</h4>
      <p className="text-sm text-[#666]">
        Commission is calculated on the <span className="font-semibold">${PACKAGE_PRICES[0]}</span> Premium concierge fee.
      </p>
    </div>
  )

  return (
    <Card className="border-2 border-[#3d2066]/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-[#7ED321]/20 to-[#00D9FF]/20">
            <Calculator className="h-6 w-6 text-[#3d2066]" />
          </div>
          <div>
            <CardTitle className="text-2xl">Income Calculator</CardTitle>
            <CardDescription>
              Estimate your potential earnings or calculate what it takes to hit your income goal
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Package Mix Controls */}
        {packageMixUI}

        <Tabs value={calculatorTab} onValueChange={setCalculatorTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="estimate" className="text-base">
              Estimate My Income
            </TabsTrigger>
            <TabsTrigger value="goal" className="text-base">
              Hit My Income Goal
            </TabsTrigger>
          </TabsList>

          {/* ── ESTIMATE TAB ── */}
          <TabsContent value="estimate">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="font-semibold text-[#3d2066] text-lg">Adjust Car Sales by Origin</h3>
                {salesByLevel.map((sales, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium" style={{ color: LEVEL_COLORS[index] || "#000" }}>
                        {LEVEL_NAMES[index] || `Level ${index + 1}`} ({((COMMISSION_RATES[index] || 0) * 100).toFixed(0)}%)
                      </span>
                      <span className="text-sm text-[#666]">
                        ${(sales * weightedPackagePrice * (COMMISSION_RATES[index] || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[Math.min(sales, SLIDER_MAX)]}
                        onValueChange={(value) => {
                          const newSales = [...salesByLevel]
                          newSales[index] = value[0]
                          setSalesByLevel(newSales)
                          const newErrors = [...salesErrors]
                          newErrors[index] = null
                          setSalesErrors(newErrors)
                        }}
                        max={SLIDER_MAX}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={INPUT_MAX}
                        value={sales}
                        onChange={(e) => handleSalesInput(index, e.target.value)}
                        className="w-20 h-8 text-sm text-right"
                        aria-label={`${LEVEL_NAMES[index]} sales count`}
                      />
                    </div>
                    {salesErrors[index] && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {salesErrors[index]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[#3d2066] text-lg">Your Income Breakdown</h3>
                <div className="space-y-3">
                  {salesByLevel.map((sales, index) => {
                    const earnings = sales * weightedPackagePrice * (COMMISSION_RATES[index] || 0)
                    const percentage = totalIncome > 0 ? (earnings / totalIncome) * 100 : 0
                    return (
                      <div
                        key={index}
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: (LEVEL_COLORS[index] || "#eee") + "10" }}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium" style={{ color: LEVEL_COLORS[index] }}>
                            {LEVEL_NAMES[index]}
                          </span>
                          <span className="font-bold" style={{ color: LEVEL_COLORS[index] }}>
                            ${earnings.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, backgroundColor: LEVEL_COLORS[index] }}
                          />
                        </div>
                        <div className="text-xs text-[#666] mt-1">{percentage.toFixed(1)}% of total</div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666]">Estimated Monthly Income</span>
                    <span className="text-3xl font-bold text-[#3d2066]">${totalIncome.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-[#999] text-right">${(totalIncome * 12).toLocaleString()} per year</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── GOAL TAB ── */}
          <TabsContent value="goal">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Target Monthly Income</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#666]" />
                  <Input
                    type="number"
                    value={goalIncome}
                    onChange={(e) => setGoalIncome(Math.max(0, Number.parseInt(e.target.value) || 0))}
                    className="pl-10 text-lg font-semibold"
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* Goal Contribution % per tier */}
              <div className="space-y-4 p-4 rounded-lg border bg-[#f9f9fb]">
                <h4 className="font-semibold text-[#3d2066] text-sm">Goal Contribution % by Tier</h4>
                {LEVEL_NAMES.map((name, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium" style={{ color: LEVEL_COLORS[idx] }}>
                        {name} ({((COMMISSION_RATES[idx] || 0) * 100).toFixed(0)}%)
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={goalContribution[idx]}
                          onChange={(e) => updateGoalContribution(idx, e.target.value)}
                          className="w-20 h-8 text-sm text-right"
                          aria-label={`${name} goal contribution percent`}
                        />
                        <span className="text-xs text-[#666] w-4">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[goalContribution[idx]]}
                      onValueChange={(v) => updateGoalContribution(idx, String(v[0]))}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
                {goalContributionTotal !== 100 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Total is {goalContributionTotal}% — values will be normalized to 100% for calculation.
                  </p>
                )}
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-[#3d2066]/5 to-[#7ED321]/5 border-2 border-[#3d2066]/20">
                <h3 className="text-lg font-semibold mb-4">
                  To earn <span className="text-[#7ED321]">${goalIncome.toLocaleString()}/month</span>, you need:
                </h3>

                <div className="space-y-4">
                  {salesForGoal.map((sales, index) => {
                    const normalizedPct =
                      goalContributionTotal > 0
                        ? ((goalContribution[index] / goalContributionTotal) * 100).toFixed(0)
                        : "0"
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border-2"
                        style={{ borderColor: (LEVEL_COLORS[index] || "#ccc") + "40" }}
                      >
                        <div>
                          <div className="font-semibold" style={{ color: LEVEL_COLORS[index] || "#000" }}>
                            {LEVEL_NAMES[index] || `Level ${index + 1}`}
                          </div>
                          <div className="text-xs text-[#666]">
                            ${(weightedPackagePrice * (COMMISSION_RATES[index] || 0)).toFixed(2)} per sale · {normalizedPct}% of goal
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: LEVEL_COLORS[index] || "#000" }}>
                            {sales}
                          </div>
                          <div className="text-xs text-[#666]">sales/month</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-4 bg-[#7ED321]/10 rounded-lg border border-[#7ED321]/20">
                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-[#7ED321] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#666]">
                      <span className="font-medium text-[#3d2066]">Note:</span> You need{" "}
                      <strong>{salesForGoal.reduce((s, v) => s + v, 0)}</strong> total sales/month
                      ({salesForGoal.map((s, i) => `${s} ${LEVEL_NAMES[i]}`).join(", ")}).
                      Adjust the contribution sliders above to model different scenarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
