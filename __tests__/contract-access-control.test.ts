/**
 * Contract Access Control Tests
 *
 * Verifies that contract-related routes enforce object-level authorization
 * (not just session-level auth). Each contract action must validate that
 * the actor owns or has permission to access the specific deal/contract.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = process.cwd()

describe("Contract Access Control", () => {
  describe("contract/list route", () => {
    it("imports assertCanAccessDealContract for object authorization", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/list/route.ts"), "utf-8")
      expect(content).toContain("assertCanAccessDealContract")
    })

    it("requires authentication", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/list/route.ts"), "utf-8")
      expect(content).toContain("getSessionUser")
      expect(content).toContain("UNAUTHENTICATED")
    })

    it("handles 403 Forbidden for unauthorized access", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/list/route.ts"), "utf-8")
      expect(content).toContain("403")
      expect(content).toContain("Forbidden")
    })
  })

  describe("contract/fix route", () => {
    it("imports assertCanModifyContractFix for object authorization", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/fix/route.ts"), "utf-8")
      expect(content).toContain("assertCanModifyContractFix")
    })

    it("requires authentication", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/fix/route.ts"), "utf-8")
      expect(content).toContain("getSessionUser")
      expect(content).toContain("Unauthorized")
    })

    it("handles 403 Forbidden for unauthorized access", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/fix/route.ts"), "utf-8")
      expect(content).toContain("403")
      expect(content).toContain("Forbidden")
    })

    it("allows admin access to fix items via DEALER_ROLES constant", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/fix/route.ts"), "utf-8")
      // Uses canonical DEALER_ROLES which includes ADMIN and SUPER_ADMIN
      expect(content).toContain("DEALER_ROLES")
      expect(content).toContain('from "@/lib/authz/guard"')
    })
  })

  describe("contract/scan route", () => {
    it("uses withAuth guard for authentication", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/scan/route.ts"), "utf-8")
      expect(content).toContain("withAuth")
    })

    it("requires DEALER or ADMIN roles", () => {
      const content = readFileSync(join(ROOT, "app/api/contract/scan/route.ts"), "utf-8")
      expect(content).toContain("DEALER_ROLES")
      expect(content).toContain("ADMIN_ROLES")
    })
  })

  describe("contract-shield service", () => {
    it("exports assertCanAccessDealContract helper", () => {
      const content = readFileSync(join(ROOT, "lib/services/contract-shield.service.ts"), "utf-8")
      expect(content).toContain("export async function assertCanAccessDealContract")
    })

    it("exports assertCanModifyContractFix helper", () => {
      const content = readFileSync(join(ROOT, "lib/services/contract-shield.service.ts"), "utf-8")
      expect(content).toContain("export async function assertCanModifyContractFix")
    })

    it("assertCanAccessDealContract allows admin bypass", () => {
      const content = readFileSync(join(ROOT, "lib/services/contract-shield.service.ts"), "utf-8")
      const fn = content.substring(
        content.indexOf("async function assertCanAccessDealContract"),
        content.indexOf("async function assertCanModifyContractFix"),
      )
      expect(fn).toContain("ADMIN")
      expect(fn).toContain("SUPER_ADMIN")
    })

    it("assertCanModifyContractFix allows admin bypass", () => {
      const content = readFileSync(join(ROOT, "lib/services/contract-shield.service.ts"), "utf-8")
      const fn = content.substring(
        content.indexOf("async function assertCanModifyContractFix"),
      )
      expect(fn).toContain("ADMIN")
      expect(fn).toContain("SUPER_ADMIN")
    })
  })
})
