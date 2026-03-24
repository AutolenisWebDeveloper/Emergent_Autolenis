import { describe, it, expect } from "vitest"
import {
  Roles,
  ADMIN_ROLES,
  DEALER_ROLES,
  AFFILIATE_ROLES,
  BUYER_ROLES,
  PUBLIC_SIGNIN_ROLES,
  isAdminRole,
  isDealerRole,
  isAffiliateRole,
  isBuyerRole,
  portalForRole,
} from "@/lib/authz/roles"

describe("Canonical Roles", () => {
  describe("Role constants", () => {
    it("should define all 9 roles", () => {
      expect(Object.keys(Roles)).toHaveLength(9)
      expect(Roles.BUYER).toBe("BUYER")
      expect(Roles.DEALER).toBe("DEALER")
      expect(Roles.DEALER_USER).toBe("DEALER_USER")
      expect(Roles.ADMIN).toBe("ADMIN")
      expect(Roles.SUPER_ADMIN).toBe("SUPER_ADMIN")
      expect(Roles.COMPLIANCE_ADMIN).toBe("COMPLIANCE_ADMIN")
      expect(Roles.AFFILIATE).toBe("AFFILIATE")
      expect(Roles.AFFILIATE_ONLY).toBe("AFFILIATE_ONLY")
      expect(Roles.SYSTEM_AGENT).toBe("SYSTEM_AGENT")
    })
  })

  describe("Role groups", () => {
    it("ADMIN_ROLES includes ADMIN, SUPER_ADMIN, and COMPLIANCE_ADMIN", () => {
      expect(ADMIN_ROLES).toContain("ADMIN")
      expect(ADMIN_ROLES).toContain("SUPER_ADMIN")
      expect(ADMIN_ROLES).toContain("COMPLIANCE_ADMIN")
      expect(ADMIN_ROLES).toHaveLength(3)
    })

    it("DEALER_ROLES includes DEALER and DEALER_USER", () => {
      expect(DEALER_ROLES).toContain("DEALER")
      expect(DEALER_ROLES).toContain("DEALER_USER")
      expect(DEALER_ROLES).toHaveLength(2)
    })

    it("AFFILIATE_ROLES includes AFFILIATE and AFFILIATE_ONLY", () => {
      expect(AFFILIATE_ROLES).toContain("AFFILIATE")
      expect(AFFILIATE_ROLES).toContain("AFFILIATE_ONLY")
      expect(AFFILIATE_ROLES).toHaveLength(2)
    })

    it("BUYER_ROLES includes only BUYER", () => {
      expect(BUYER_ROLES).toContain("BUYER")
      expect(BUYER_ROLES).toHaveLength(1)
    })

    it("PUBLIC_SIGNIN_ROLES excludes ADMIN, SUPER_ADMIN, SYSTEM_AGENT", () => {
      expect(PUBLIC_SIGNIN_ROLES).not.toContain("ADMIN")
      expect(PUBLIC_SIGNIN_ROLES).not.toContain("SUPER_ADMIN")
      expect(PUBLIC_SIGNIN_ROLES).not.toContain("SYSTEM_AGENT")
    })
  })

  describe("isAdminRole", () => {
    it("returns true for ADMIN", () => expect(isAdminRole("ADMIN")).toBe(true))
    it("returns true for SUPER_ADMIN", () => expect(isAdminRole("SUPER_ADMIN")).toBe(true))
    it("returns true for COMPLIANCE_ADMIN", () => expect(isAdminRole("COMPLIANCE_ADMIN")).toBe(true))
    it("returns false for BUYER", () => expect(isAdminRole("BUYER")).toBe(false))
    it("returns false for DEALER", () => expect(isAdminRole("DEALER")).toBe(false))
    it("returns false for undefined", () => expect(isAdminRole(undefined)).toBe(false))
  })

  describe("isDealerRole", () => {
    it("returns true for DEALER", () => expect(isDealerRole("DEALER")).toBe(true))
    it("returns true for DEALER_USER", () => expect(isDealerRole("DEALER_USER")).toBe(true))
    it("returns false for BUYER", () => expect(isDealerRole("BUYER")).toBe(false))
    it("returns false for undefined", () => expect(isDealerRole(undefined)).toBe(false))
  })

  describe("isAffiliateRole", () => {
    it("returns true for AFFILIATE", () => expect(isAffiliateRole("AFFILIATE")).toBe(true))
    it("returns true for AFFILIATE_ONLY", () => expect(isAffiliateRole("AFFILIATE_ONLY")).toBe(true))
    it("returns false for BUYER", () => expect(isAffiliateRole("BUYER")).toBe(false))
    it("returns false for undefined", () => expect(isAffiliateRole(undefined)).toBe(false))
  })

  describe("isBuyerRole", () => {
    it("returns true for BUYER", () => expect(isBuyerRole("BUYER")).toBe(true))
    it("returns false for DEALER", () => expect(isBuyerRole("DEALER")).toBe(false))
    it("returns false for undefined", () => expect(isBuyerRole(undefined)).toBe(false))
  })

  describe("portalForRole", () => {
    it("maps ADMIN to /admin", () => expect(portalForRole("ADMIN")).toBe("/admin"))
    it("maps SUPER_ADMIN to /admin", () => expect(portalForRole("SUPER_ADMIN")).toBe("/admin"))
    it("maps DEALER to /dealer", () => expect(portalForRole("DEALER")).toBe("/dealer"))
    it("maps DEALER_USER to /dealer", () => expect(portalForRole("DEALER_USER")).toBe("/dealer"))
    it("maps AFFILIATE to /affiliate/portal", () => expect(portalForRole("AFFILIATE")).toBe("/affiliate/portal"))
    it("maps AFFILIATE_ONLY to /affiliate/portal", () => expect(portalForRole("AFFILIATE_ONLY")).toBe("/affiliate/portal"))
    it("maps BUYER to /buyer", () => expect(portalForRole("BUYER")).toBe("/buyer"))
    it("maps unknown to /", () => expect(portalForRole("UNKNOWN")).toBe("/"))
  })

  describe("Role consistency with auth.ts", () => {
    it("all roles referenced in getRoleBasedRedirect should be in canonical Roles", () => {
      // These roles are used in lib/auth.ts getRoleBasedRedirect
      const rolesUsedInAuth = ["BUYER", "DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN", "AFFILIATE", "AFFILIATE_ONLY"]
      for (const role of rolesUsedInAuth) {
        expect(Object.values(Roles)).toContain(role)
      }
    })

    it("isAdminRole should match auth-server.ts isAdminRole behavior", () => {
      // Verify our canonical isAdminRole matches existing behavior in auth-server.ts
      expect(isAdminRole("ADMIN")).toBe(true)
      expect(isAdminRole("SUPER_ADMIN")).toBe(true)
      expect(isAdminRole("BUYER")).toBe(false)
      expect(isAdminRole("DEALER")).toBe(false)
      expect(isAdminRole("AFFILIATE")).toBe(false)
    })
  })
})
