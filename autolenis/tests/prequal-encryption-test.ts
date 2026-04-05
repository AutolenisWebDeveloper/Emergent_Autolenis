/**
 * SSN Encryption Module Tests
 * Run with: npx tsx /app/autolenis/tests/prequal-encryption-test.ts
 */

import { encryptSsn, decryptSsn } from "../lib/prequal/encryption"

function testEncryption() {
  const results: { test: string; status: "PASS" | "FAIL"; detail: string }[] = []

  function logResult(test: string, status: "PASS" | "FAIL", detail: string) {
    results.push({ test, status, detail })
    console.log(`${status === "PASS" ? "✅" : "❌"} ${test}: ${detail}`)
  }

  // Test 1: Encrypt and decrypt SSN
  try {
    const ssn = "123456789"
    const encrypted = encryptSsn(ssn)
    const decrypted = decryptSsn(encrypted)
    if (decrypted === ssn) {
      logResult("Encrypt/Decrypt roundtrip", "PASS", `SSN recovered correctly, encrypted length: ${encrypted.length}`)
    } else {
      logResult("Encrypt/Decrypt roundtrip", "FAIL", `Expected "${ssn}", got "${decrypted}"`)
    }
  } catch (e: any) {
    logResult("Encrypt/Decrypt roundtrip", "FAIL", e.message)
  }

  // Test 2: Different SSNs produce different encrypted values
  try {
    const e1 = encryptSsn("123456789")
    const e2 = encryptSsn("987654321")
    if (e1 !== e2) {
      logResult("Different SSNs → different ciphertext", "PASS", "Encryption is non-deterministic for different inputs")
    } else {
      logResult("Different SSNs → different ciphertext", "FAIL", "Same ciphertext for different SSNs!")
    }
  } catch (e: any) {
    logResult("Different SSNs → different ciphertext", "FAIL", e.message)
  }

  // Test 3: Same SSN encrypted twice produces different ciphertexts (AES-GCM uses random IV)
  try {
    const e1 = encryptSsn("123456789")
    const e2 = encryptSsn("123456789")
    if (e1 !== e2) {
      logResult("AES-GCM random IV (same input → different output)", "PASS", "Correctly uses random IV")
    } else {
      logResult("AES-GCM random IV", "FAIL", "Deterministic encryption detected - IV may be static")
    }
  } catch (e: any) {
    logResult("AES-GCM random IV", "FAIL", e.message)
  }

  // Test 4: Encrypted value is base64 or hex encoded
  try {
    const encrypted = encryptSsn("123456789")
    // Should be a base64 or hex string that doesn't contain the raw SSN
    if (!encrypted.includes("123456789") && encrypted.length > 20) {
      logResult("Ciphertext doesn't contain raw SSN", "PASS", `Encrypted length: ${encrypted.length}`)
    } else {
      logResult("Ciphertext doesn't contain raw SSN", "FAIL", "Raw SSN found in ciphertext!")
    }
  } catch (e: any) {
    logResult("Ciphertext doesn't contain raw SSN", "FAIL", e.message)
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
    testSuite: "prequal-encryption",
    results,
    summary: { passed, failed, total: results.length },
  }
  fs.writeFileSync("/app/test_reports/iteration_4.json", JSON.stringify(report, null, 2))
  console.log("\nTest report written to /app/test_reports/iteration_4.json")
}

testEncryption()
