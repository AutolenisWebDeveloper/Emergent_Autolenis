#!/usr/bin/env tsx
/**
 * Standards Enforcement Summary
 *
 * Counts ESLint warning violations by rule to track staged enforcement progress.
 * Run via: pnpm check:standards-summary
 *
 * This script runs ESLint in JSON output mode, aggregates warnings by rule,
 * and reports counts. It allows tracking whether violation counts are
 * decreasing over time as the codebase is cleaned up.
 *
 * The script also enforces a maximum warning budget: if the total count of
 * warnings for enforced rules exceeds the budget, it fails.
 */

import { execSync } from "child_process";

// ── Warning budgets per rule ──────────────────────────────────────────────
// Set these to the current violation count. As violations are fixed, reduce
// the budget. When a rule reaches 0, promote it to "error" in eslint.config.mjs.
const WARNING_BUDGETS: Record<string, number> = {
  "@typescript-eslint/no-explicit-any": 1200,
  "@typescript-eslint/no-floating-promises": 300,
  "@typescript-eslint/no-misused-promises": 50,
  "@typescript-eslint/require-await": 500,
  "@typescript-eslint/no-unsafe-assignment": 5000,
  "@typescript-eslint/no-unsafe-member-access": 5000,
  "@typescript-eslint/no-unsafe-call": 2000,
  "@typescript-eslint/no-unsafe-return": 1000,
  "@typescript-eslint/no-unsafe-argument": 2000,
};

interface LintMessage {
  ruleId: string | null;
  severity: number; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
}

interface LintResult {
  filePath: string;
  messages: LintMessage[];
  errorCount: number;
  warningCount: number;
}

function main(): void {
  console.log("📊 Standards Enforcement Summary\n");

  // Run ESLint with JSON output
  let lintOutput: string;
  try {
    lintOutput = execSync(
      "pnpm eslint . --no-error-on-unmatched-pattern --format json",
      {
        encoding: "utf-8",
        maxBuffer: 20 * 1024 * 1024, // 20MB
        timeout: 300000, // 5 min
      }
    );
  } catch (err: unknown) {
    // ESLint exits with code 1 when there are warnings/errors
    const execError = err as { stdout?: string; stderr?: string; status?: number };
    lintOutput = execError.stdout || "";
    if (!lintOutput) {
      console.error("Failed to run ESLint:", execError.stderr || "unknown error");
      process.exit(1);
    }
  }

  let results: LintResult[];
  try {
    results = JSON.parse(lintOutput) as LintResult[];
  } catch {
    console.error("Failed to parse ESLint JSON output");
    process.exit(1);
  }

  // Aggregate by rule
  const warningsByRule = new Map<string, number>();
  const errorsByRule = new Map<string, number>();

  for (const result of results) {
    for (const msg of result.messages) {
      if (!msg.ruleId) continue;
      const map = msg.severity === 2 ? errorsByRule : warningsByRule;
      map.set(msg.ruleId, (map.get(msg.ruleId) || 0) + 1);
    }
  }

  // Report errors (these fail CI)
  if (errorsByRule.size > 0) {
    console.log("🚫 ENFORCED RULES (errors — these fail CI):");
    for (const [rule, count] of [...errorsByRule.entries()].sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ❌ ${rule}: ${count}`);
    }
    console.log();
  }

  // Report warnings with budget tracking
  console.log("⚠️  STAGED RULES (warnings — tracked for cleanup):");
  let budgetExceeded = false;

  for (const [rule, count] of [...warningsByRule.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    const budget = WARNING_BUDGETS[rule];
    if (budget !== undefined) {
      const status = count <= budget ? "📉" : "📈";
      if (count > budget) budgetExceeded = true;
      console.log(
        `  ${status} ${rule}: ${count} (budget: ${budget})${count > budget ? " — OVER BUDGET" : ""}`
      );
    } else {
      console.log(`  ⚠️  ${rule}: ${count}`);
    }
  }

  // Summary
  const totalErrors = [...errorsByRule.values()].reduce((a, b) => a + b, 0);
  const totalWarnings = [...warningsByRule.values()].reduce((a, b) => a + b, 0);
  console.log(`\n📊 Total: ${totalErrors} errors, ${totalWarnings} warnings`);

  if (totalErrors > 0) {
    console.log("🚫 FAILED — fix ESLint errors above.");
    process.exit(1);
  }

  if (budgetExceeded) {
    console.log(
      "🚫 FAILED — warning budget exceeded. Fix violations or update budgets in check-standards-summary.ts."
    );
    process.exit(1);
  }

  console.log("✅ Standards check PASSED.");
}

main();
