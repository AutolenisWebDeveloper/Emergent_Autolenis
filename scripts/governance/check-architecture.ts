#!/usr/bin/env tsx
/**
 * Architecture Governance Checker
 *
 * Validates architectural constraints that cannot be enforced by ESLint alone.
 * Run via: pnpm check:architecture
 *
 * Checks:
 * 1. API route handler auth patterns (buyer routes must check role)
 * 2. Cross-layer import boundaries (no direct Prisma from app/)
 * 3. Workspace scoping in DB queries (list endpoints scope by workspaceId)
 * 4. API route error handling patterns (try/catch + handleError)
 * 5. Sensitive data logging prevention
 */

import * as fs from "fs";
import * as path from "path";

// ── Types ─────────────────────────────────────────────────────────────────
interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

interface CheckResult {
  name: string;
  violations: Violation[];
  checked: number;
}

// ── File discovery ────────────────────────────────────────────────────────
function findFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      results.push(...findFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readFileLines(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf-8").split("\n");
}

// ── Check 1: Buyer API route auth patterns ────────────────────────────────
function checkBuyerRouteAuth(): CheckResult {
  const violations: Violation[] = [];
  const routeDir = path.resolve("app/api/buyer");
  const routeFiles = findFiles(routeDir, ["route.ts"]);

  for (const file of routeFiles) {
    const lines = readFileLines(file);
    const content = lines.join("\n");

    // Recognized auth patterns for buyer routes
    const hasAuthCheck =
      content.includes('user.role !== "BUYER"') ||
      content.includes("user.role !== 'BUYER'") ||
      content.includes('session.role !== "BUYER"') ||
      content.includes("session.role !== 'BUYER'") ||
      content.includes("isBuyerRole") ||
      content.includes('requireAuth(["BUYER"]') ||
      content.includes("requireAuth(['BUYER']") ||
      content.includes("getSessionUser") ||
      content.includes("getCurrentUser");

    // Skip 410 Gone endpoints (disabled endpoints)
    const is410 = content.includes("410");

    if (!hasAuthCheck && !is410) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: 1,
        rule: "buyer-route-auth",
        message:
          "Buyer API route missing auth check: must verify user role or call requireAuth/getSessionUser.",
        severity: "error",
      });
    }
  }

  return { name: "Buyer route auth patterns", violations, checked: routeFiles.length };
}

// ── Check 2: Admin API route auth patterns ────────────────────────────────
function checkAdminRouteAuth(): CheckResult {
  const violations: Violation[] = [];
  const routeDir = path.resolve("app/api/admin");
  const routeFiles = findFiles(routeDir, ["route.ts"]);

  for (const file of routeFiles) {
    const lines = readFileLines(file);
    const content = lines.join("\n");

    // Recognized admin auth patterns (expanded to cover all approved abstractions)
    const hasAuthCheck =
      // Direct role checks
      content.includes("isAdminRole") ||
      content.includes('role !== "ADMIN"') ||
      content.includes("role !== 'ADMIN'") ||
      content.includes("SUPER_ADMIN") ||
      content.includes("COMPLIANCE_ADMIN") ||
      content.includes("ADMIN_ROLES") ||
      // Approved auth abstractions
      /requireAuth\s*\(\s*\[.*"ADMIN"/.test(content) ||
      /requireAuth\s*\(\s*\[.*ADMIN/.test(content) ||
      content.includes("getAdminSession") ||
      content.includes("withAuth") ||
      // Session checks used in admin auth routes
      content.includes("getSession") ||
      content.includes("isCmaApprover") ||
      // Admin middleware pattern
      content.includes("adminAuth");

    if (!hasAuthCheck) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: 1,
        rule: "admin-route-auth",
        message:
          "Admin API route missing auth check: must use requireAuth, getAdminSession, withAuth, or equivalent.",
        severity: "error",
      });
    }
  }

  return { name: "Admin route auth patterns", violations, checked: routeFiles.length };
}

// ── Check 3: Direct PrismaClient instantiation ───────────────────────────
function checkDirectPrismaAccess(): CheckResult {
  const violations: Violation[] = [];
  const appFiles = findFiles(path.resolve("app"), [".ts", ".tsx"]);

  for (const file of appFiles) {
    const lines = readFileLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;

      if (
        line.includes("new PrismaClient") ||
        /^\s*import\s+.*PrismaClient.*from\s+['"]@prisma\/client['"]/.test(line)
      ) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          rule: "no-direct-prisma",
          message:
            "Direct PrismaClient instantiation in app/ layer. Import from '@/lib/db' instead.",
          severity: "error",
        });
      }
    }
  }

  return { name: "No direct Prisma access from app/", violations, checked: appFiles.length };
}

// ── Check 4: Sensitive data in console.log ────────────────────────────────
function checkSensitiveLogging(): CheckResult {
  const violations: Violation[] = [];
  const files = [
    ...findFiles(path.resolve("app"), [".ts", ".tsx"]),
    ...findFiles(path.resolve("lib"), [".ts"]),
  ];

  // These patterns match console calls that log variables with sensitive names
  // (not just string literals mentioning "password" etc.)
  const sensitiveVarPatterns = [
    // Logging a variable named password/secret/token/apiKey directly
    /console\.(log|info|debug)\s*\([^)]*,\s*(password|secret|token|apiKey|api_key|creditCard|ssn)\b/i,
    // Template literal interpolating a sensitive variable
    /console\.(log|info|debug)\s*\(`[^`]*\$\{[^}]*(password|secret|token|apiKey|api_key|creditCard|ssn)[^}]*\}/i,
    // Directly logging env vars with secrets
    /console\.(log|info|debug|warn|error)\s*\([^)]*process\.env\.(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|JWT_SECRET|RESEND_API_KEY)/,
  ];

  for (const file of files) {
    const lines = readFileLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of sensitiveVarPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), file),
            line: i + 1,
            rule: "no-sensitive-logging",
            message: `Possible sensitive data in log statement. Use structured logger with redaction.`,
            severity: "error",
          });
          break; // one violation per line
        }
      }
    }
  }

  return { name: "Sensitive data logging", violations, checked: files.length };
}

// ── Check 5: Service-role Supabase client in user-facing routes ──────────
function checkServiceRoleInUserRoutes(): CheckResult {
  const violations: Violation[] = [];
  const buyerRoutes = findFiles(path.resolve("app/api/buyer"), [".ts"]);
  const dealerRoutes = findFiles(path.resolve("app/api/dealer"), [".ts"]);
  const affiliateRoutes = findFiles(path.resolve("app/api/affiliate"), [".ts"]);

  const userFacingRoutes = [...buyerRoutes, ...dealerRoutes, ...affiliateRoutes];

  for (const file of userFacingRoutes) {
    const lines = readFileLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for getSupabase() which is the service-role client
      // Skip comment lines (single-line //, block /* */, or doc /** */)
      if (
        /\bgetSupabase\(\)/.test(line) &&
        !line.trimStart().startsWith("//") &&
        !line.trimStart().startsWith("*") &&
        !line.trimStart().startsWith("/*") &&
        !/['"`].*getSupabase\(\).*['"`]/.test(line) // skip string literals
      ) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          rule: "no-service-role-in-user-routes",
          message:
            "Service-role Supabase client (getSupabase()) used in user-facing route. Use createClient() from '@/lib/supabase/server' for RLS enforcement.",
          severity: "warning",
        });
      }
    }
  }

  return {
    name: "Service-role client in user routes",
    violations,
    checked: userFacingRoutes.length,
  };
}

// ── Check 6: Missing workspace scoping in list queries ───────────────────
function checkWorkspaceScoping(): CheckResult {
  const violations: Violation[] = [];
  const serviceFiles = findFiles(path.resolve("lib/services"), [".ts"]);

  // Services that are legitimately exempt from workspace scoping:
  // - System/admin/analytics services operate across workspaces
  // - Password-reset operates on user identity, not workspace data
  // - Auth, email-verification are identity-layer, not data-layer
  // - Inventory-sourcing operates across boundaries by design
  // - Event-ledger/trust-infrastructure are audit/system services
  const exemptPatterns = [
    "system/",
    "analytics/",
    "event-ledger/",
    "trust-infrastructure/",
    "trust/",
    "password-reset",
    "email-verification",
    "auth.service",
    "inventory-sourcing/ingest",
    "inventory-sourcing/lead",
    "seo.service",
    "workflow/",
  ];

  // Temporarily exempted: services that need workspace_id added but are not yet migrated
  // Track these explicitly so they can be addressed in future cleanup sprints
  const stagedExemptions = [
    "buyer-package.service",
    "buyer.service",
    "checkout.service",
    "dealer.service",
    "inventory-sourcing/case.service",
    "inventory-sourcing/dealer-portal.service",
  ];

  for (const file of serviceFiles) {
    const lines = readFileLines(file);
    const content = lines.join("\n");

    // Look for .from() or .select() patterns that should include workspace_id
    const hasListQuery =
      content.includes(".from(") && content.includes(".select(");
    const hasWorkspaceFilter =
      content.includes("workspace_id") || content.includes("workspaceId");

    // Only flag if the file has DB queries but no workspace reference
    if (hasListQuery && !hasWorkspaceFilter) {
      const relPath = path.relative(process.cwd(), file);
      const isExempt = exemptPatterns.some((p) => relPath.includes(p));
      const isStaged = stagedExemptions.some((p) => relPath.includes(p));

      if (isStaged) {
        violations.push({
          file: relPath,
          line: 1,
          rule: "workspace-scoping",
          message:
            "STAGED: Service file needs workspace_id scoping added (tracked for cleanup).",
          severity: "warning",
        });
      } else if (!isExempt) {
        violations.push({
          file: relPath,
          line: 1,
          rule: "workspace-scoping",
          message:
            "Service file has DB queries but no workspace_id scoping. Verify data isolation.",
          severity: "error",
        });
      }
    }
  }

  return { name: "Workspace scoping", violations, checked: serviceFiles.length };
}

// ── Check 7: API route handler error handling ─────────────────────────────

// Framework-delegated route handlers that manage their own error handling
// internally and must NOT be wrapped in try/catch (it would break them).
// Each entry is a relative path from the project root.
const FRAMEWORK_OWNED_ROUTES: string[] = [
  "app/api/auth/[...nextauth]/route.ts",
];

function checkRouteErrorHandling(): CheckResult {
  const violations: Violation[] = [];
  const routeFiles = findFiles(path.resolve("app/api"), ["route.ts"]);

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const relPath = path.relative(process.cwd(), file);

    // Skip very short files — 410 stubs, redirects, and simple re-exports
    if (content.length < 200) continue;

    // Skip framework-delegated handlers (e.g. NextAuth) that own their error handling.
    // These re-export a framework-created handler and must not be wrapped in try/catch.
    if (FRAMEWORK_OWNED_ROUTES.some((r) => relPath === r || relPath.endsWith(r))) continue;

    // Skip simple mock/stub routes that only await auth (getSessionUser/requireAuth)
    // and return static JSON — no DB, no fetch, no external calls
    const hasDbOrExternalCall =
      content.includes(".from(") ||
      content.includes("fetch(") ||
      content.includes(".rpc(") ||
      content.includes("stripe.") ||
      content.includes("resend.");
    if (!hasDbOrExternalCall && content.length < 1200) continue;

    // Check for recognized error handling patterns
    const hasTryCatch = content.includes("try {") || content.includes("try{");
    const hasErrorMiddleware =
      content.includes("handleError") ||
      content.includes("withErrorHandler") ||
      content.includes("catchAsync") ||
      content.includes("withAuth");

    if (!hasTryCatch && !hasErrorMiddleware) {
      violations.push({
        file: relPath,
        line: 1,
        rule: "route-error-handling",
        message:
          "API route handler missing try/catch or error middleware. Routes with DB/external calls must handle errors.",
        severity: "error",
      });
    }
  }

  return { name: "Route error handling", violations, checked: routeFiles.length };
}

// ── Runner ────────────────────────────────────────────────────────────────
function main(): void {
  console.log("🏗️  Architecture Governance Check\n");

  const checks: CheckResult[] = [
    checkBuyerRouteAuth(),
    checkAdminRouteAuth(),
    checkDirectPrismaAccess(),
    checkSensitiveLogging(),
    checkServiceRoleInUserRoutes(),
    checkWorkspaceScoping(),
    checkRouteErrorHandling(),
  ];

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalChecked = 0;

  for (const check of checks) {
    const errors = check.violations.filter((v) => v.severity === "error");
    const warnings = check.violations.filter((v) => v.severity === "warning");

    totalErrors += errors.length;
    totalWarnings += warnings.length;
    totalChecked += check.checked;

    const status =
      errors.length > 0 ? "❌" : warnings.length > 0 ? "⚠️" : "✅";
    console.log(
      `${status} ${check.name}: ${check.checked} files checked, ${errors.length} errors, ${warnings.length} warnings`
    );

    for (const v of check.violations) {
      const prefix = v.severity === "error" ? "  ❌" : "  ⚠️";
      console.log(`${prefix} ${v.file}:${v.line} [${v.rule}] ${v.message}`);
    }
  }

  console.log(
    `\n📊 Summary: ${totalChecked} files checked, ${totalErrors} errors, ${totalWarnings} warnings`
  );

  if (totalErrors > 0) {
    console.log("\n🚫 Architecture check FAILED — fix errors above.");
    process.exit(1);
  }

  if (totalWarnings > 0) {
    console.log(
      "\n⚠️  Architecture check PASSED with warnings — review above."
    );
  } else {
    console.log("\n✅ Architecture check PASSED.");
  }
}

main();
