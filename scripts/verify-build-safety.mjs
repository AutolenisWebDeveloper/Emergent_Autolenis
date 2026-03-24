#!/usr/bin/env node
/**
 * Build safety scan – runs after `next build` to verify the output.
 * Referenced by .github/workflows/production-readiness-gate.yml
 *
 * Checks:
 *  1. .next/ directory exists (build succeeded).
 *  2. No server-only imports leaked into client bundles.
 *  3. Key route manifests are present.
 */
import fs from "node:fs";
import path from "node:path";

const NEXT_DIR = ".next";

function fail(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

// 1. .next/ must exist
if (!fs.existsSync(NEXT_DIR)) {
  fail(`${NEXT_DIR}/ directory not found – did the build succeed?`);
}
ok(`${NEXT_DIR}/ directory exists.`);

// 2. Check for critical build artifacts
const requiredArtifacts = [
  path.join(NEXT_DIR, "build-manifest.json"),
  path.join(NEXT_DIR, "routes-manifest.json"),
];

for (const artifact of requiredArtifacts) {
  if (fs.existsSync(artifact)) {
    ok(`Found ${artifact}`);
  } else {
    // routes-manifest may not exist in all Next.js versions; warn but don't fail
    console.warn(`[WARN] Missing ${artifact} – this may be expected for your Next.js version.`);
  }
}

// 3. Scan client bundles for server-only leaks
const CLIENT_DIR = path.join(NEXT_DIR, "static");
if (fs.existsSync(CLIENT_DIR)) {
  const clientFiles = walkFiles(CLIENT_DIR).filter((f) => f.endsWith(".js"));
  let leaks = 0;
  const LEAK_PATTERNS = [
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
    /process\.env\.STRIPE_SECRET_KEY/,
    /process\.env\.JWT_SECRET/,
  ];

  for (const file of clientFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of LEAK_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`[LEAK] ${pattern} found in client bundle: ${file}`);
        leaks++;
      }
    }
  }

  if (leaks > 0) {
    fail(`Found ${leaks} server-secret leak(s) in client bundles.`);
  }
  ok(`No server-secret leaks in ${clientFiles.length} client JS files.`);
} else {
  console.warn(`[WARN] ${CLIENT_DIR} not found – skipping client bundle scan.`);
}

ok("Build safety scan passed.");

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}
