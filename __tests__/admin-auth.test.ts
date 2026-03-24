import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { isAdminRole } from "@/lib/auth-server"
import { _resetCacheAdapter } from "@/lib/cache/redis-adapter"
import fs from "fs"
import path from "path"

describe("Admin Auth", () => {
  describe("isAdminRole", () => {
    it("should return true for ADMIN role", () => {
      expect(isAdminRole("ADMIN")).toBe(true)
    })

    it("should return true for SUPER_ADMIN role", () => {
      expect(isAdminRole("SUPER_ADMIN")).toBe(true)
    })

    it("should return false for BUYER role", () => {
      expect(isAdminRole("BUYER")).toBe(false)
    })

    it("should return false for DEALER role", () => {
      expect(isAdminRole("DEALER")).toBe(false)
    })

    it("should return false for undefined", () => {
      expect(isAdminRole(undefined)).toBe(false)
    })

    it("should return false for empty string", () => {
      expect(isAdminRole("")).toBe(false)
    })
  })

  describe("Admin signin route error handling", () => {
    it("should distinguish auth errors from service errors in the catch block", () => {
      const routeFile = path.resolve("app/api/admin/auth/signin/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")

      // The route must NOT have a bare catch that swallows all errors as "Invalid email or password"
      // It should check the error message to distinguish auth failures from service errors
      expect(content).toContain('msg.includes("Invalid")')
      expect(content).toContain('msg.includes("not found")')
      // It should re-throw non-auth errors instead of swallowing them
      expect(content).toContain("throw error")
    })

    it("should include correlationId in error responses", () => {
      const routeFile = path.resolve("app/api/admin/auth/signin/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")

      // Verify correlationId is included in error responses
      expect(content).toContain("correlationId")
      // Should appear in both 401 and 500 response objects
      expect(content).toMatch(/status:\s*401/)
      expect(content).toMatch(/status:\s*500/)
    })
  })

  describe("Admin API role checks", () => {
    it("should use isAdminRole in all admin API routes (no hardcoded ADMIN-only checks)", () => {
      const adminApiDir = path.resolve("app/api/admin")
      const issues: string[] = []

      function walkDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walkDir(fullPath)
          } else if (entry.name.endsWith(".ts")) {
            const content = fs.readFileSync(fullPath, "utf-8")
            // Look for authorization patterns like:
            //   user.role !== "ADMIN"
            //   session.role !== "ADMIN"
            // These exclude SUPER_ADMIN and should use isAdminRole() instead.
            // Match only actual code lines, not comments or strings.
            const lines = content.split("\n")
            for (const line of lines) {
              const trimmed = line.trim()
              if (
                trimmed.startsWith("//") ||
                trimmed.startsWith("*") ||
                fullPath.includes("auth/signup")
              ) {
                continue
              }
              if (
                /\.role\s*!==\s*"ADMIN"/.test(trimmed) &&
                !trimmed.includes("SUPER_ADMIN")
              ) {
                issues.push(path.relative(adminApiDir, fullPath))
                break
              }
            }
          }
        }
      }

      walkDir(adminApiDir)
      expect(issues).toEqual([])
    })
  })

  describe("Production state hardening", () => {
    const originalNodeEnv = process.env["NODE_ENV"]

    beforeEach(() => {
      _resetCacheAdapter()
      delete process.env["REDIS_URL"]
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      _resetCacheAdapter()
    })

    it("admin-auth.ts exports AdminSecurityStateUnavailableError", () => {
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")
      expect(content).toContain("export class AdminSecurityStateUnavailableError")
      expect(content).toContain("AdminSecurityStateUnavailableError")
    })

    it("admin-auth.ts imports assertProductionCacheReady for production enforcement", () => {
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")
      expect(content).toContain("assertProductionCacheReady")
      expect(content).toContain("ensureSecureCache")
    })

    it("setAdminSession persists session via Prisma instead of in-memory cache", () => {
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")
      const setAdminSessionBlock = content.substring(
        content.indexOf("export async function setAdminSession"),
        content.indexOf("export async function getAdminSession")
      )
      // Must use Prisma for durable persistence
      expect(setAdminSessionBlock).toContain("prisma.adminSession.upsert")
      // Must NOT use in-memory cache for session storage
      expect(setAdminSessionBlock).not.toContain("cache.set(")
    })
  })
})
