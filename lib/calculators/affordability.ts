/**
 * Affordability Calculator — shared pure deterministic logic.
 *
 * Used by BOTH the UI component (QualificationEstimateStrip)
 * and the Lenis Concierge estimateAffordability tool.
 *
 * NEVER duplicate this logic — always import from here.
 */

// ---------------------------------------------------------------------------
// Constants (same as the UI component)
// ---------------------------------------------------------------------------

export const APR_BANDS: Record<string, { apr: number; label: string }> = {
  "760+": { apr: 5.99, label: "Excellent" },
  "720-759": { apr: 7.49, label: "Very Good" },
  "680-719": { apr: 9.99, label: "Good" },
  "640-679": { apr: 12.99, label: "Fair" },
  "600-639": { apr: 16.99, label: "Below Average" },
  "<600": { apr: 21.99, label: "Needs Work" },
}

/** Maps user-friendly credit tier names to APR band keys. */
const CREDIT_TIER_MAP: Record<string, string> = {
  excellent: "760+",
  "very good": "720-759",
  good: "680-719",
  fair: "640-679",
  "below average": "600-639",
  rebuilding: "<600",
}

export const DEFAULT_TERM_MONTHS = 60
export const TAX_FEES_PERCENT = 0.1
export const PTI_CAP = 0.12
export const HOUSING_PRESSURE_THRESHOLD = 0.3
export const INSURANCE_MAINTENANCE_BUFFER = 275

// ---------------------------------------------------------------------------
// Core math (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Reverse-calculate the loan principal that a given monthly payment can
 * support at the specified annual interest rate and term.
 */
export function calculatePrincipal(
  payment: number,
  annualRate: number,
  termMonths: number,
): number {
  if (payment <= 0 || termMonths <= 0) return 0
  if (annualRate === 0) return payment * termMonths

  const monthlyRate = annualRate / 100 / 12
  const principal =
    (payment * (Math.pow(1 + monthlyRate, termMonths) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths))

  return Math.max(0, principal)
}

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface AffordabilityInput {
  /** Target monthly payment amount in dollars. */
  monthlyPayment: number
  /** Down payment amount in dollars. */
  downPayment: number
  /** Credit tier key (e.g. "excellent", "good", "fair", "rebuilding") or APR band key. */
  creditTier: string
  /** US state abbreviation (used for informational purposes). */
  state: string
  /** Desired loan term in months (default: 60). */
  loanTermMonths?: number
  /** Monthly housing cost — optional, used for housing pressure adjustment. */
  monthlyHousing?: number
  /** Monthly gross income — optional, used for PTI cap calculation. */
  monthlyIncome?: number
}

export interface AffordabilityBreakdown {
  paymentRange: { min: number; max: number }
  vehicleRange: { min: number; max: number }
  otdRange: { min: number; max: number }
  apr: number
  aprLabel: string
  loanTermMonths: number
  showWarning: boolean
}

export interface AffordabilityAssumptions {
  termMonths: number
  aprUsed: number
  aprLabel: string
  taxFeesPercent: string
  insuranceMaintenanceBuffer: string
  ptiCap: string
  housingPressureThreshold: string
  state: string
}

export interface AffordabilityResult {
  success: true
  breakdown: AffordabilityBreakdown
  assumptions: AffordabilityAssumptions
  warnings: string[]
}

export interface AffordabilityError {
  success: false
  error: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateAffordabilityInput(
  raw: Record<string, unknown>,
): AffordabilityInput | { error: string } {
  const monthlyPayment = Number(raw.monthlyPayment)
  const downPayment = Number(raw.downPayment)
  const creditTier = String(raw.creditTier ?? "good").toLowerCase()
  const state = String(raw.state ?? "").toUpperCase()
  const loanTermMonths = raw.loanTermMonths ? Number(raw.loanTermMonths) : DEFAULT_TERM_MONTHS
  const monthlyHousing = raw.monthlyHousing != null ? Number(raw.monthlyHousing) : undefined
  const monthlyIncome = raw.monthlyIncome != null ? Number(raw.monthlyIncome) : undefined

  if (Number.isNaN(monthlyPayment) || monthlyPayment < 0) {
    return { error: "monthlyPayment must be a non-negative number." }
  }
  if (Number.isNaN(downPayment) || downPayment < 0) {
    return { error: "downPayment must be a non-negative number." }
  }
  if (!state || state.length !== 2) {
    return { error: "state must be a 2-letter US state abbreviation." }
  }
  if (Number.isNaN(loanTermMonths) || loanTermMonths < 12 || loanTermMonths > 84) {
    return { error: "loanTermMonths must be between 12 and 84." }
  }

  return {
    monthlyPayment,
    downPayment,
    creditTier,
    state,
    loanTermMonths,
    monthlyHousing,
    monthlyIncome,
  }
}

// ---------------------------------------------------------------------------
// Calculator (pure function — NO side effects)
// ---------------------------------------------------------------------------

function resolveApr(creditTier: string): { apr: number; label: string } {
  // Try mapped tier name first, then raw APR band key
  const bandKey = CREDIT_TIER_MAP[creditTier] ?? creditTier
  return APR_BANDS[bandKey] ?? APR_BANDS["680-719"]
}

export function estimateAffordability(
  input: AffordabilityInput,
): AffordabilityResult | AffordabilityError {
  const {
    monthlyPayment,
    downPayment,
    creditTier,
    state,
    loanTermMonths = DEFAULT_TERM_MONTHS,
    monthlyHousing,
    monthlyIncome,
  } = input

  // Validate numeric constraints
  if (monthlyPayment < 0) {
    return { success: false, error: "monthlyPayment must be a non-negative number." }
  }
  if (downPayment < 0) {
    return { success: false, error: "downPayment must be a non-negative number." }
  }
  if (!state || state.length !== 2) {
    return { success: false, error: "state must be a 2-letter US state abbreviation." }
  }
  if (loanTermMonths < 12 || loanTermMonths > 84) {
    return { success: false, error: "loanTermMonths must be between 12 and 84." }
  }

  const aprData = resolveApr(creditTier)
  const warnings: string[] = []

  // ── Payment calculation ──────────────────────────────────────────────
  let maxPayment = monthlyPayment

  // If income is provided, apply PTI cap
  if (monthlyIncome != null && monthlyIncome > 0) {
    const ptiMax = monthlyIncome * PTI_CAP
    if (maxPayment > ptiMax) {
      maxPayment = ptiMax
      warnings.push(
        `Target payment exceeds ${PTI_CAP * 100}% PTI guideline ($${Math.round(ptiMax)}/mo). Estimate capped to guideline.`,
      )
    }

    // Housing pressure adjustment
    if (monthlyHousing != null && monthlyHousing > 0) {
      const housingRatio = monthlyHousing / monthlyIncome
      if (housingRatio > HOUSING_PRESSURE_THRESHOLD) {
        const pressureFactor = Math.max(0.3, 1 - (housingRatio - HOUSING_PRESSURE_THRESHOLD) * 2)
        maxPayment = maxPayment * pressureFactor
        warnings.push("High housing-to-income ratio detected — estimate adjusted downward.")
      }
    }
  }

  // Insurance/maintenance buffer
  maxPayment = maxPayment - INSURANCE_MAINTENANCE_BUFFER
  maxPayment = Math.max(0, maxPayment)

  const minPayment = Math.max(0, maxPayment * 0.8)

  // ── Loan & vehicle price ────────────────────────────────────────────
  const maxLoan = calculatePrincipal(maxPayment, aprData.apr, loanTermMonths)
  const minLoan = calculatePrincipal(minPayment, aprData.apr, loanTermMonths)

  const maxVehiclePrice = maxLoan + downPayment
  const minVehiclePrice = minLoan + downPayment

  const maxOTD = maxVehiclePrice * (1 + TAX_FEES_PERCENT)
  const minOTD = minVehiclePrice * (1 + TAX_FEES_PERCENT)

  const showWarning = maxPayment < 50 && monthlyPayment > 0
  if (showWarning) {
    warnings.push(
      "Based on these inputs, a vehicle payment may not be recommended. Consider reducing housing costs or increasing income first.",
    )
  }

  warnings.push("Estimate only — not a credit decision or loan offer. Final terms depend on lender approval.")

  return {
    success: true,
    breakdown: {
      paymentRange: { min: Math.round(minPayment), max: Math.round(maxPayment) },
      vehicleRange: { min: Math.round(minVehiclePrice), max: Math.round(maxVehiclePrice) },
      otdRange: { min: Math.round(minOTD), max: Math.round(maxOTD) },
      apr: aprData.apr,
      aprLabel: aprData.label,
      loanTermMonths,
      showWarning,
    },
    assumptions: {
      termMonths: loanTermMonths,
      aprUsed: aprData.apr,
      aprLabel: aprData.label,
      taxFeesPercent: `${TAX_FEES_PERCENT * 100}%`,
      insuranceMaintenanceBuffer: `$${INSURANCE_MAINTENANCE_BUFFER}/mo`,
      ptiCap: `${PTI_CAP * 100}% of gross income`,
      housingPressureThreshold: `${HOUSING_PRESSURE_THRESHOLD * 100}% of income`,
      state,
    },
    warnings,
  }
}
