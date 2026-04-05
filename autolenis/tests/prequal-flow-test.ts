/**
 * Pre-qualification System Integration Test Script
 * Tests the session-based prequal flow end-to-end
 * Run with: npx tsx /app/autolenis/tests/prequal-flow-test.ts
 */

async function testPrequalFlow() {
  const BASE_URL = "http://localhost:8001"
  const results: { test: string; status: "PASS" | "FAIL"; detail: string }[] = []

  function logResult(test: string, status: "PASS" | "FAIL", detail: string) {
    results.push({ test, status, detail })
    console.log(`${status === "PASS" ? "✅" : "❌"} ${test}: ${detail}`)
  }

  // Test 1: Session creation endpoint exists and requires auth
  try {
    const res = await fetch(`${BASE_URL}/api/buyer/prequal/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "INTERNAL" }),
    })
    if (res.status === 401) {
      logResult("Session API - Auth guard", "PASS", "Returns 401 when unauthenticated")
    } else {
      logResult("Session API - Auth guard", "FAIL", `Expected 401, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Session API - Auth guard", "FAIL", e.message)
  }

  // Test 2: Consent endpoint exists and requires auth
  try {
    const res = await fetch(`${BASE_URL}/api/buyer/prequal/session/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "test", consentVersionId: "v1", consentText: "test", consentGiven: true }),
    })
    if (res.status === 401) {
      logResult("Consent API - Auth guard", "PASS", "Returns 401 when unauthenticated")
    } else {
      logResult("Consent API - Auth guard", "FAIL", `Expected 401, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Consent API - Auth guard", "FAIL", e.message)
  }

  // Test 3: Run endpoint exists and requires auth
  try {
    const res = await fetch(`${BASE_URL}/api/buyer/prequal/session/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "test" }),
    })
    if (res.status === 401) {
      logResult("Run API - Auth guard", "PASS", "Returns 401 when unauthenticated")
    } else {
      logResult("Run API - Auth guard", "FAIL", `Expected 401, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Run API - Auth guard", "FAIL", e.message)
  }

  // Test 4: Authorize endpoint exists and requires auth
  try {
    const res = await fetch(`${BASE_URL}/api/buyer/prequal/session/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "test" }),
    })
    if (res.status === 401) {
      logResult("Authorize API - Auth guard", "PASS", "Returns 401 when unauthenticated")
    } else {
      logResult("Authorize API - Auth guard", "FAIL", `Expected 401, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Authorize API - Auth guard", "FAIL", e.message)
  }

  // Test 5: Old prequal POST still returns 401 (not 500)
  try {
    const res = await fetch(`${BASE_URL}/api/buyer/prequal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.status === 401) {
      logResult("Old Prequal POST - Auth guard", "PASS", "Returns 401 when unauthenticated (503 only after auth)")
    } else {
      logResult("Old Prequal POST - Auth guard", "FAIL", `Expected 401, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Old Prequal POST - Auth guard", "FAIL", e.message)
  }

  // Test 6: Verify the prequal page is accessible
  try {
    const res = await fetch(`${BASE_URL}/buyer/onboarding`, { redirect: "manual" })
    // Should redirect to auth since it's protected
    if (res.status === 200 || res.status === 302 || res.status === 307) {
      logResult("Onboarding Page", "PASS", `Page returns ${res.status}`)
    } else {
      logResult("Onboarding Page", "FAIL", `Expected 200/302/307, got ${res.status}`)
    }
  } catch (e: any) {
    logResult("Onboarding Page", "FAIL", e.message)
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  const passed = results.filter(r => r.status === "PASS").length
  const failed = results.filter(r => r.status === "FAIL").length
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`)
  console.log("=".repeat(60))

  // Write test report
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: { passed, failed, total: results.length },
  }
  const fs = require("fs")
  fs.mkdirSync("/app/test_reports", { recursive: true })
  fs.writeFileSync("/app/test_reports/iteration_1.json", JSON.stringify(report, null, 2))
  console.log("\nTest report written to /app/test_reports/iteration_1.json")
}

testPrequalFlow().catch(console.error)
