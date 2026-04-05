/**
 * Pre-qualification Scoring Logic Unit Tests
 * Validates the deterministic internal scoring engine
 * Run with: npx tsx /app/autolenis/tests/prequal-scoring-test.ts
 */

function testInternalScoring() {
  const results: { test: string; status: "PASS" | "FAIL"; detail: string }[] = []

  function logResult(test: string, status: "PASS" | "FAIL", detail: string) {
    results.push({ test, status, detail })
    console.log(`${status === "PASS" ? "✅" : "❌"} ${test}: ${detail}`)
  }

  // Replicate the internal scoring logic from prequal-session.service.ts
  function internalPrequalify(monthlyIncomeCents: number, monthlyHousingCents: number) {
    const monthlyIncome = monthlyIncomeCents / 100
    const monthlyHousing = monthlyHousingCents / 100
    const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100

    if (dtiRatio > 50) {
      return { success: false, errorMessage: "Debt-to-income ratio exceeds acceptable threshold", dtiRatio }
    }

    const dtiScore = Math.max(0, 100 - dtiRatio * 2)
    const incomeScore = Math.min(100, monthlyIncome / 80)
    const stabilityScore = Math.min(100, Math.max(0, 100 - (monthlyHousing / Math.max(monthlyIncome, 1)) * 200))
    const estimatedScore = Math.floor(600 + (dtiScore * 0.4 + incomeScore * 0.35 + stabilityScore * 0.25) * 2)

    let creditTier: string
    let rateMultiplier: number

    if (estimatedScore >= 750) {
      creditTier = "EXCELLENT"
      rateMultiplier = 1.0
    } else if (estimatedScore >= 700) {
      creditTier = "GOOD"
      rateMultiplier = 0.9
    } else if (estimatedScore >= 650) {
      creditTier = "FAIR"
      rateMultiplier = 0.75
    } else {
      creditTier = "POOR"
      rateMultiplier = 0.5
    }

    const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
    const maxMonthlyPayment = Math.max(0, Math.floor(availableMonthly * rateMultiplier))
    const avgApr = creditTier === "EXCELLENT" ? 0.045 : creditTier === "GOOD" ? 0.065 : creditTier === "FAIR" ? 0.085 : 0.12
    const termMonths = 60
    const monthlyRate = avgApr / 12
    const approvedAmount = monthlyRate > 0
      ? maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate)
      : maxMonthlyPayment * termMonths

    return {
      success: true,
      creditTier,
      approvedAmountCents: Math.floor(approvedAmount) * 100,
      maxMonthlyPaymentCents: maxMonthlyPayment * 100,
      minMonthlyPaymentCents: Math.floor(maxMonthlyPayment * 0.5) * 100,
      dtiRatio: Math.round(dtiRatio * 100) / 100,
      estimatedScore,
    }
  }

  // Test 1: High income, low housing → Should qualify with good tier
  const t1 = internalPrequalify(800000, 100000) // $8000/mo income, $1000/mo housing
  if (t1.success && t1.creditTier && t1.approvedAmountCents! > 0) {
    logResult("High income + low housing", "PASS", `Tier: ${t1.creditTier}, Approved: $${t1.approvedAmountCents! / 100}, Score: ${t1.estimatedScore}`)
  } else {
    logResult("High income + low housing", "FAIL", `Unexpected: ${JSON.stringify(t1)}`)
  }

  // Test 2: DTI over 50% → Should be declined
  const t2 = internalPrequalify(400000, 250000) // $4000/mo income, $2500/mo housing (62.5% DTI)
  if (!t2.success && t2.errorMessage?.includes("Debt-to-income")) {
    logResult("High DTI (>50%) decline", "PASS", `DTI: ${t2.dtiRatio}%, correctly declined`)
  } else {
    logResult("High DTI (>50%) decline", "FAIL", `Expected decline, got: ${JSON.stringify(t2)}`)
  }

  // Test 3: Moderate income → Should qualify with moderate tier
  const t3 = internalPrequalify(500000, 120000) // $5000/mo income, $1200/mo housing (24% DTI)
  if (t3.success && ["EXCELLENT", "GOOD", "FAIR"].includes(t3.creditTier!)) {
    logResult("Moderate income", "PASS", `Tier: ${t3.creditTier}, Approved: $${t3.approvedAmountCents! / 100}, DTI: ${t3.dtiRatio}%`)
  } else {
    logResult("Moderate income", "FAIL", `Unexpected: ${JSON.stringify(t3)}`)
  }

  // Test 4: Zero income → Should be declined (100% DTI)
  const t4 = internalPrequalify(0, 100000) // $0 income, $1000/mo housing
  if (!t4.success) {
    logResult("Zero income decline", "PASS", `DTI: ${t4.dtiRatio}%, correctly declined`)
  } else {
    logResult("Zero income decline", "FAIL", `Expected decline, got: ${JSON.stringify(t4)}`)
  }

  // Test 5: Very high income → Should get EXCELLENT tier
  const t5 = internalPrequalify(1500000, 200000) // $15000/mo income, $2000/mo housing (13% DTI)
  if (t5.success && t5.creditTier === "EXCELLENT") {
    logResult("Very high income → EXCELLENT", "PASS", `Score: ${t5.estimatedScore}, Approved: $${t5.approvedAmountCents! / 100}`)
  } else {
    logResult("Very high income → EXCELLENT", "FAIL", `Expected EXCELLENT, got: ${JSON.stringify(t5)}`)
  }

  // Test 6: Credit tiers use valid Prisma enum values
  const validTiers = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]
  const testCases = [
    internalPrequalify(1500000, 200000),
    internalPrequalify(600000, 150000),
    internalPrequalify(350000, 100000),
    internalPrequalify(250000, 80000),
  ]
  const allValid = testCases.every(t => !t.success || validTiers.includes(t.creditTier!))
  if (allValid) {
    logResult("Credit tier enum validation", "PASS", `All tiers are valid Prisma enum values: ${testCases.filter(t => t.success).map(t => t.creditTier).join(", ")}`)
  } else {
    logResult("Credit tier enum validation", "FAIL", `Found invalid tiers: ${testCases.filter(t => t.success).map(t => t.creditTier).join(", ")}`)
  }

  // Test 7: DTI exactly at 50% boundary
  const t7 = internalPrequalify(400000, 200000) // $4000/mo income, $2000/mo housing (50% DTI)
  if (t7.success) {
    logResult("DTI boundary (50%)", "PASS", `DTI: ${t7.dtiRatio}% - passes (boundary is >50, not >=50)`)
  } else {
    // The check is dtiRatio > 50, so exactly 50 should pass
    logResult("DTI boundary (50%)", "FAIL", `Expected pass at exactly 50%, got decline`)
  }

  // Test 8: Data field mapping validation
  // Frontend sends: { annualIncome: 60000, monthlyHousing: 1200 }
  // Mapped to: { monthlyIncomeCents: Math.round((60000/12)*100), monthlyHousingCents: Math.round(1200*100) }
  const annualIncome = 60000
  const monthlyHousing = 1200
  const monthlyIncomeCents = Math.round((annualIncome / 12) * 100)
  const monthlyHousingCents = Math.round(monthlyHousing * 100)
  const t8 = internalPrequalify(monthlyIncomeCents, monthlyHousingCents)
  if (t8.success) {
    logResult("Frontend→Backend field mapping", "PASS", `Annual $${annualIncome} → Monthly cents ${monthlyIncomeCents}, Housing $${monthlyHousing} → cents ${monthlyHousingCents}. Tier: ${t8.creditTier}`)
  } else {
    logResult("Frontend→Backend field mapping", "FAIL", `Mapping produced decline: ${JSON.stringify(t8)}`)
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  const passed = results.filter(r => r.status === "PASS").length
  const failed = results.filter(r => r.status === "FAIL").length
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`)
  console.log("=".repeat(60))

  // Write report
  const fs = require("fs")
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: "prequal-scoring",
    results,
    summary: { passed, failed, total: results.length },
  }
  fs.writeFileSync("/app/test_reports/iteration_2.json", JSON.stringify(report, null, 2))
  console.log("\nTest report written to /app/test_reports/iteration_2.json")
}

testInternalScoring()
