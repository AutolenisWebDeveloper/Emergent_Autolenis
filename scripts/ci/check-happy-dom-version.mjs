#!/usr/bin/env node
/**
 * CI gate: verify happy-dom >= 20.0.0 (CVE-2024-xxx RCE fix).
 * Referenced by .github/workflows/production-readiness-gate.yml
 */
import { execSync } from "node:child_process";

const MIN_VERSION = "20.0.0";

function fail(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function semverGte(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return true; // equal
}

let version;
try {
  const json = JSON.parse(
    execSync("pnpm list happy-dom --json --depth=0", { encoding: "utf8" })
  );
  version =
    json[0]?.devDependencies?.["happy-dom"]?.version ??
    json[0]?.dependencies?.["happy-dom"]?.version;
} catch {
  fail("Could not read happy-dom version via pnpm list.");
}

if (!version) fail("happy-dom is not installed.");

if (semverGte(version, MIN_VERSION)) {
  console.log(`[OK] happy-dom ${version} >= ${MIN_VERSION}`);
} else {
  fail(`happy-dom ${version} is vulnerable (< ${MIN_VERSION}). Please upgrade.`);
}
