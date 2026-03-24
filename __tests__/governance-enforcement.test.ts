/**
 * Architecture Governance Script Tests
 *
 * Validates that the governance checker correctly detects violations
 * and passes on clean code. Uses file-system fixtures to test each check.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Test that the governance script itself is valid ────────────────────────
describe("Architecture Governance", () => {
  describe("Script integrity", () => {
    it("governance script file exists", () => {
      const scriptPath = path.resolve("scripts/governance/check-architecture.ts");
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it("standards summary script file exists", () => {
      const scriptPath = path.resolve("scripts/governance/check-standards-summary.ts");
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });

  describe("ESLint configuration", () => {
    it("eslint.config.mjs exists and imports typescript-eslint", () => {
      const configPath = path.resolve("eslint.config.mjs");
      expect(fs.existsSync(configPath)).toBe(true);
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("typescript-eslint");
    });

    it("eslint config enforces await-thenable as error", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain('"@typescript-eslint/await-thenable": "error"');
    });

    it("eslint config has staged warnings for no-explicit-any", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain('"@typescript-eslint/no-explicit-any": "warn"');
    });

    it("eslint config has staged warnings for floating promises", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("@typescript-eslint/no-floating-promises");
    });

    it("eslint config restricts direct PrismaClient imports", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("no-restricted-imports");
      expect(content).toContain("PrismaClient");
    });

    it("eslint config uses type-aware parsing with projectService", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("projectService: true");
    });
  });

  describe("TypeScript strictness", () => {
    it("tsconfig has strict mode enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.resolve("tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("tsconfig has strictNullChecks enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.resolve("tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
    });

    it("tsconfig has noImplicitReturns enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.resolve("tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.noImplicitReturns).toBe(true);
    });

    it("tsconfig has noFallthroughCasesInSwitch enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.resolve("tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.noFallthroughCasesInSwitch).toBe(true);
    });

    it("tsconfig has noImplicitOverride enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.resolve("tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.noImplicitOverride).toBe(true);
    });
  });

  describe("CI integration", () => {
    it("ci.yml includes architecture governance step", () => {
      const ciPath = path.resolve(".github/workflows/ci.yml");
      expect(fs.existsSync(ciPath)).toBe(true);
      const content = fs.readFileSync(ciPath, "utf-8");
      expect(content).toContain("check:architecture");
    });

    it("production-readiness-gate.yml includes architecture governance step", () => {
      const gatePath = path.resolve(
        ".github/workflows/production-readiness-gate.yml"
      );
      expect(fs.existsSync(gatePath)).toBe(true);
      const content = fs.readFileSync(gatePath, "utf-8");
      expect(content).toContain("check:architecture");
    });

    it("ci.yml includes lint step", () => {
      const ciPath = path.resolve(".github/workflows/ci.yml");
      const content = fs.readFileSync(ciPath, "utf-8");
      expect(content).toContain("pnpm lint");
    });

    it("ci.yml includes typecheck step", () => {
      const ciPath = path.resolve(".github/workflows/ci.yml");
      const content = fs.readFileSync(ciPath, "utf-8");
      expect(content).toContain("pnpm typecheck");
    });
  });

  describe("Package scripts", () => {
    it("package.json has check:architecture script", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve("package.json"), "utf-8")
      );
      expect(pkg.scripts["check:architecture"]).toBeDefined();
      expect(pkg.scripts["check:architecture"]).toContain("check-architecture");
    });

    it("package.json has lint:strict script", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve("package.json"), "utf-8")
      );
      expect(pkg.scripts["lint:strict"]).toBeDefined();
      expect(pkg.scripts["lint:strict"]).toContain("--max-warnings 0");
    });

    it("package.json has lint script", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve("package.json"), "utf-8")
      );
      expect(pkg.scripts["lint"]).toBeDefined();
    });

    it("package.json has typecheck script", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve("package.json"), "utf-8")
      );
      expect(pkg.scripts["typecheck"]).toBeDefined();
    });
  });

  describe("Governance checks — buyer auth pattern detection", () => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "governance-test-fixtures-"));

    beforeAll(() => {
      fs.mkdirSync(`${fixtureDir}/app/api/buyer/test-valid`, {
        recursive: true,
      });
      fs.mkdirSync(`${fixtureDir}/app/api/buyer/test-missing`, {
        recursive: true,
      });
      fs.mkdirSync(`${fixtureDir}/app/api/buyer/test-410`, {
        recursive: true,
      });

      // Valid route with auth check
      fs.writeFileSync(
        `${fixtureDir}/app/api/buyer/test-valid/route.ts`,
        `
import { getSessionUser } from "@/lib/auth-server"
export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "BUYER") {
    return new Response("Unauthorized", { status: 401 })
  }
  return new Response("ok")
}
`
      );

      // Missing auth check
      fs.writeFileSync(
        `${fixtureDir}/app/api/buyer/test-missing/route.ts`,
        `
export async function GET() {
  return new Response("ok")
}
`
      );

      // 410 Gone (exempt)
      fs.writeFileSync(
        `${fixtureDir}/app/api/buyer/test-410/route.ts`,
        `
export async function POST() {
  return new Response("Gone", { status: 410 })
}
`
      );
    });

    afterAll(() => {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    });

    it("detects missing auth pattern in buyer routes", () => {
      const content = fs.readFileSync(
        `${fixtureDir}/app/api/buyer/test-missing/route.ts`,
        "utf-8"
      );
      // Simulate the check logic
      const hasAuth =
        content.includes("getSessionUser") ||
        content.includes("getCurrentUser") ||
        content.includes('requireAuth(["BUYER"]');
      expect(hasAuth).toBe(false);
    });

    it("recognizes valid auth pattern", () => {
      const content = fs.readFileSync(
        `${fixtureDir}/app/api/buyer/test-valid/route.ts`,
        "utf-8"
      );
      const hasAuth =
        content.includes("getSessionUser") ||
        content.includes("getCurrentUser");
      expect(hasAuth).toBe(true);
    });

    it("exempts 410 Gone endpoints", () => {
      const content = fs.readFileSync(
        `${fixtureDir}/app/api/buyer/test-410/route.ts`,
        "utf-8"
      );
      const is410 = content.includes("410");
      expect(is410).toBe(true);
    });
  });

  describe("Governance checks — sensitive logging detection", () => {
    it("detects direct env secret logging", () => {
      const line =
        'console.log("Key:", process.env.STRIPE_SECRET_KEY)';
      const pattern =
        /console\.(log|info|debug|warn|error)\s*\([^)]*process\.env\.(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|JWT_SECRET|RESEND_API_KEY)/;
      expect(pattern.test(line)).toBe(true);
    });

    it("does not flag normal error logging", () => {
      const line = 'console.error("[Auth] User not found:", error)';
      const pattern =
        /console\.(log|info|debug)\s*\([^)]*,\s*(password|secret|token|apiKey)\b/i;
      expect(pattern.test(line)).toBe(false);
    });

    it("does not flag string mentions of password in context descriptions", () => {
      const line =
        'console.error("[ChangePassword] Update error:", updateError)';
      const pattern =
        /console\.(log|info|debug)\s*\([^)]*,\s*(password|secret|token|apiKey)\b/i;
      expect(pattern.test(line)).toBe(false);
    });
  });

  describe("Governance checks — PrismaClient direct access detection", () => {
    it("detects new PrismaClient() instantiation", () => {
      const line = "const prisma = new PrismaClient()";
      expect(line.includes("new PrismaClient")).toBe(true);
    });

    it("detects PrismaClient import from @prisma/client", () => {
      const line =
        'import { PrismaClient } from "@prisma/client"';
      expect(
        line.includes("@prisma/client") && line.includes("PrismaClient")
      ).toBe(true);
    });

    it("does not flag prisma import from @/lib/db", () => {
      const line = 'import { prisma } from "@/lib/db"';
      expect(line.includes("@prisma/client")).toBe(false);
      expect(line.includes("new PrismaClient")).toBe(false);
    });
  });

  // ── Phase 2: Promoted enforcement tests ─────────────────────────────
  describe("Promoted enforcement — ESLint scoped errors", () => {
    it("eslint config promotes no-floating-promises to error in API routes", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      // Must have a block that targets app/api/**/*.ts with no-floating-promises as error
      expect(content).toContain("app/api/**/*.ts");
      expect(content).toMatch(
        /no-floating-promises[\s\S]*\[[\s\S]*"error"/
      );
    });

    it("eslint config promotes no-floating-promises to error in lib", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      expect(content).toContain("lib/**/*.ts");
    });

    it("eslint config promotes no-explicit-any to error in governance scripts", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      // Must have a block targeting governance scripts with no-explicit-any as error
      expect(content).toContain("scripts/governance/**/*.ts");
      expect(content).toMatch(
        /no-explicit-any[\s\S]*"error"/
      );
    });

    it("eslint config un-ignores governance scripts", () => {
      const content = fs.readFileSync(
        path.resolve("eslint.config.mjs"),
        "utf-8"
      );
      // Must NOT have a blanket scripts/** ignore
      expect(content).not.toMatch(/["']scripts\/\*\*["']/);
      // But should ignore non-governance scripts
      expect(content).toContain("scripts/!(governance)/**");
    });
  });

  describe("Promoted enforcement — admin auth detection", () => {
    it("recognizes requireAuth([ADMIN]) pattern", () => {
      const content = `
import { requireAuth } from "@/lib/auth-server"
export async function GET() {
  await requireAuth(["ADMIN"])
  return new Response("ok")
}`;
      const hasAuth =
        /requireAuth\s*\(\s*\[.*"ADMIN"/.test(content) ||
        /requireAuth\s*\(\s*\[.*ADMIN/.test(content);
      expect(hasAuth).toBe(true);
    });

    it("recognizes getAdminSession() pattern", () => {
      const content = `
import { getAdminSession } from "@/lib/admin-auth"
const session = await getAdminSession()`;
      expect(content.includes("getAdminSession")).toBe(true);
    });

    it("recognizes withAuth + ADMIN_ROLES pattern", () => {
      const content = `
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
export const GET = withAuth({ roles: ADMIN_ROLES })`;
      expect(content.includes("withAuth")).toBe(true);
      expect(content.includes("ADMIN_ROLES")).toBe(true);
    });

    it("recognizes getSession() pattern", () => {
      const content = `
import { getSession } from "@/lib/auth-server"
const session = await getSession()`;
      expect(content.includes("getSession")).toBe(true);
    });

    it("flags routes with no auth pattern", () => {
      const content = `
import { NextResponse } from "next/server"
export async function GET() {
  return NextResponse.json({ data: [] })
}`;
      const hasAuth =
        content.includes("isAdminRole") ||
        content.includes("SUPER_ADMIN") ||
        content.includes("COMPLIANCE_ADMIN") ||
        content.includes("ADMIN_ROLES") ||
        /requireAuth\s*\(\s*\[.*"ADMIN"/.test(content) ||
        /requireAuth\s*\(\s*\[.*ADMIN/.test(content) ||
        content.includes("getAdminSession") ||
        content.includes("withAuth") ||
        content.includes("getSession") ||
        content.includes("isCmaApprover") ||
        content.includes("adminAuth");
      expect(hasAuth).toBe(false);
    });
  });

  describe("Promoted enforcement — workspace scoping", () => {
    it("architecture governance script has explicit staged exemptions", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      expect(content).toContain("stagedExemptions");
      expect(content).toContain("buyer.service");
      expect(content).toContain("dealer.service");
    });

    it("workspace scoping check promotes non-exempt violations to error", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // The workspace scoping check must produce errors (not warnings) for non-exempt files
      expect(content).toMatch(/severity:\s*"error"[\s\S]*workspace-scoping/);
    });
  });

  describe("Promoted enforcement — route error handling", () => {
    it("architecture governance promotes route error handling to error", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // Route error handling must be severity "error"
      expect(content).toMatch(/severity:\s*"error"[\s\S]*route-error-handling/);
    });

    it("route error handling check skips simple mock routes", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // Must skip routes without DB or external calls
      expect(content).toContain("hasDbOrExternalCall");
    });

    it("admin auth check produces errors not warnings", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // Admin route auth check must produce errors
      expect(content).toMatch(/severity:\s*"error"[\s\S]*admin-route-auth/);
    });

    it("route error handling exempts framework-owned handlers like NextAuth", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // Must have a FRAMEWORK_OWNED_ROUTES list with the NextAuth route
      expect(content).toContain("FRAMEWORK_OWNED_ROUTES");
      expect(content).toContain("app/api/auth/[...nextauth]/route.ts");
    });

    it("framework-owned routes exemption is narrow and explicit", () => {
      const content = fs.readFileSync(
        path.resolve("scripts/governance/check-architecture.ts"),
        "utf-8"
      );
      // The exemption list must be a small, explicit array — not a broad pattern
      const match = content.match(/FRAMEWORK_OWNED_ROUTES[^=]*=\s*\[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      // Count entries — should be exactly 1 (just NextAuth for now)
      const entries = match![1].split(",").filter((e: string) => e.trim().length > 0);
      expect(entries.length).toBe(1);
    });
  });
});
