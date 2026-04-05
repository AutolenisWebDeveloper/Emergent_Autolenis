/**
 * Pre-qualification Response Normalizer Tests
 * Run with: npx tsx /app/autolenis/tests/prequal-normalizer-test.ts
 */

// Import the normalizer
import { PrequalResponseNormalizer } from "../lib/services/providers/prequal-response-normalizer"

function testNormalizer() {
  const results: { test: string; status: "PASS" | "FAIL"; detail: string }[] = []

  function logResult(test: string, status: "PASS" | "FAIL", detail: string) {
    results.push({ test, status, detail })
    console.log(`${status === "PASS" ? "✅" : "❌"} ${test}: ${detail}`)
  }

  // Test tier normalization
  const validPrismaTiers = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]

  // Standard tiers
  const standardTests: [string | null | undefined, string][] = [
    ["EXCELLENT", "EXCELLENT"],
    ["GOOD", "GOOD"],
    ["FAIR", "FAIR"],
    ["POOR", "POOR"],
    ["DECLINED", "DECLINED"],
    // Non-standard tiers from provider
    ["PRIME", "GOOD"],
    ["NEAR_PRIME", "FAIR"],
    ["SUBPRIME", "POOR"],
    // Edge cases
    [null, "POOR"],
    [undefined, "POOR"],
    ["UNKNOWN_TIER", "POOR"],
    // Case sensitivity
    ["excellent", "EXCELLENT"],
    ["prime", "GOOD"],
  ]

  for (const [input, expected] of standardTests) {
    const result = PrequalResponseNormalizer.normalizeCreditTier(input)
    if (result === expected) {
      logResult(`normalizeCreditTier("${input}")`, "PASS", `→ "${result}"`)
    } else {
      logResult(`normalizeCreditTier("${input}")`, "FAIL", `Expected "${expected}", got "${result}"`)
    }
  }

  // Verify all outputs are valid Prisma enum values
  const allOutputs = standardTests.map(([input]) => PrequalResponseNormalizer.normalizeCreditTier(input))
  const allValid = allOutputs.every(o => validPrismaTiers.includes(o))
  if (allValid) {
    logResult("All outputs are valid Prisma CreditTier", "PASS", `${allOutputs.length} outputs checked`)
  } else {
    const invalid = allOutputs.filter(o => !validPrismaTiers.includes(o))
    logResult("All outputs are valid Prisma CreditTier", "FAIL", `Invalid: ${invalid.join(", ")}`)
  }

  // Test assertNotHeuristicInLive
  try {
    PrequalResponseNormalizer.assertNotHeuristicInLive("INTERNAL", "AutoLenisPrequal", "TEST")
    logResult("INTERNAL allowed in TEST mode", "PASS", "No error thrown")
  } catch {
    logResult("INTERNAL allowed in TEST mode", "FAIL", "Error thrown in TEST mode")
  }

  try {
    PrequalResponseNormalizer.assertNotHeuristicInLive("INTERNAL", "AutoLenisPrequal", null)
    logResult("INTERNAL allowed with null workspace", "PASS", "No error thrown")
  } catch {
    logResult("INTERNAL allowed with null workspace", "FAIL", "Error thrown with null workspace")
  }

  try {
    PrequalResponseNormalizer.assertNotHeuristicInLive("INTERNAL", "AutoLenisPrequal", "LIVE")
    logResult("INTERNAL blocked in LIVE mode", "FAIL", "No error thrown in LIVE mode")
  } catch (e: any) {
    if (e.message.includes("COMPLIANCE_VIOLATION")) {
      logResult("INTERNAL blocked in LIVE mode", "PASS", "COMPLIANCE_VIOLATION thrown")
    } else {
      logResult("INTERNAL blocked in LIVE mode", "FAIL", `Wrong error: ${e.message}`)
    }
  }

  try {
    PrequalResponseNormalizer.assertNotHeuristicInLive("IPREDICT", "MicroBilt", "LIVE")
    logResult("IPREDICT allowed in LIVE mode", "PASS", "No error thrown")
  } catch {
    logResult("IPREDICT allowed in LIVE mode", "FAIL", "Error thrown for provider-backed in LIVE mode")
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  const passed = results.filter(r => r.status === "PASS").length
  const failed = results.filter(r => r.status === "FAIL").length
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`)
  console.log("=".repeat(60))

  const fs = require("fs")
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: "prequal-normalizer",
    results,
    summary: { passed, failed, total: results.length },
  }
  fs.writeFileSync("/app/test_reports/iteration_3.json", JSON.stringify(report, null, 2))
  console.log("\nTest report written to /app/test_reports/iteration_3.json")
}

testNormalizer()
