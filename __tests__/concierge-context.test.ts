/**
 * Tests for the Concierge Context Loader.
 *
 * Validates role mapping, RBAC enforcement (each role only sees its own
 * state slice), workspace scoping, and default state shapes.
 */

import { describe, expect, it } from "vitest"
import { getConciergeContext } from "@/lib/ai/context/loader"
import type { ConciergeContext } from "@/lib/ai/context/types"
import type { SessionUser } from "@/lib/auth"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "test-user-id",
    userId: "test-user-id",
    email: "test@example.com",
    role: "BUYER",
    firstName: "Test",
    ...overrides,
  } as SessionUser
}

// ---------------------------------------------------------------------------
// Role mapping
// ---------------------------------------------------------------------------

describe("getConciergeContext — role mapping", () => {
  it("maps BUYER role correctly", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.role).toBe("BUYER")
  })

  it("maps DEALER role correctly", () => {
    const ctx = getConciergeContext(makeSession({ role: "DEALER" }))
    expect(ctx.role).toBe("DEALER")
  })

  it("maps DEALER_USER role to DEALER", () => {
    const ctx = getConciergeContext(makeSession({ role: "DEALER_USER" }))
    expect(ctx.role).toBe("DEALER")
  })

  it("maps AFFILIATE role correctly", () => {
    const ctx = getConciergeContext(makeSession({ role: "AFFILIATE" }))
    expect(ctx.role).toBe("AFFILIATE")
  })

  it("maps AFFILIATE_ONLY role to AFFILIATE", () => {
    const ctx = getConciergeContext(makeSession({ role: "AFFILIATE_ONLY" }))
    expect(ctx.role).toBe("AFFILIATE")
  })

  it("maps ADMIN role correctly", () => {
    const ctx = getConciergeContext(makeSession({ role: "ADMIN" }))
    expect(ctx.role).toBe("ADMIN")
  })

  it("maps SUPER_ADMIN role to ADMIN", () => {
    const ctx = getConciergeContext(makeSession({ role: "SUPER_ADMIN" }))
    expect(ctx.role).toBe("ADMIN")
  })

  it("returns PUBLIC for null session", () => {
    const ctx = getConciergeContext(null)
    expect(ctx.role).toBe("PUBLIC")
  })

  it("returns PUBLIC for unknown role", () => {
    const ctx = getConciergeContext(makeSession({ role: "UNKNOWN" as any }))
    expect(ctx.role).toBe("PUBLIC")
  })
})

// ---------------------------------------------------------------------------
// RBAC — data isolation
// ---------------------------------------------------------------------------

describe("getConciergeContext — RBAC data isolation", () => {
  it("buyer sees only buyerState", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState).not.toBeNull()
    expect(ctx.dealerState).toBeNull()
    expect(ctx.affiliateState).toBeNull()
    expect(ctx.adminState).toBeNull()
  })

  it("dealer sees only dealerState", () => {
    const ctx = getConciergeContext(makeSession({ role: "DEALER" }))
    expect(ctx.buyerState).toBeNull()
    expect(ctx.dealerState).not.toBeNull()
    expect(ctx.affiliateState).toBeNull()
    expect(ctx.adminState).toBeNull()
  })

  it("affiliate sees only affiliateState", () => {
    const ctx = getConciergeContext(makeSession({ role: "AFFILIATE" }))
    expect(ctx.buyerState).toBeNull()
    expect(ctx.dealerState).toBeNull()
    expect(ctx.affiliateState).not.toBeNull()
    expect(ctx.adminState).toBeNull()
  })

  it("admin sees only adminState", () => {
    const ctx = getConciergeContext(makeSession({ role: "ADMIN" }))
    expect(ctx.buyerState).toBeNull()
    expect(ctx.dealerState).toBeNull()
    expect(ctx.affiliateState).toBeNull()
    expect(ctx.adminState).not.toBeNull()
  })

  it("public sees no role-specific state", () => {
    const ctx = getConciergeContext(null)
    expect(ctx.buyerState).toBeNull()
    expect(ctx.dealerState).toBeNull()
    expect(ctx.affiliateState).toBeNull()
    expect(ctx.adminState).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Workspace scoping
// ---------------------------------------------------------------------------

describe("getConciergeContext — workspace", () => {
  it("defaults to LIVE workspace", () => {
    const ctx = getConciergeContext(makeSession())
    expect(ctx.workspace).toBe("LIVE")
  })

  it("uses TEST workspace when session specifies it", () => {
    const ctx = getConciergeContext(
      makeSession({ workspace_mode: "TEST" }),
    )
    expect(ctx.workspace).toBe("TEST")
  })

  it("uses LIVE workspace for null session", () => {
    const ctx = getConciergeContext(null)
    expect(ctx.workspace).toBe("LIVE")
  })
})

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

describe("getConciergeContext — user", () => {
  it("includes user id and firstName from session", () => {
    const ctx = getConciergeContext(
      makeSession({ userId: "u-123", firstName: "Alice" }),
    )
    expect(ctx.user).toEqual({ id: "u-123", firstName: "Alice" })
  })

  it("falls back to first_name if firstName is missing", () => {
    const ctx = getConciergeContext(
      makeSession({ firstName: undefined, first_name: "Bob" }),
    )
    expect(ctx.user?.firstName).toBe("Bob")
  })

  it("user is null for public visitors", () => {
    const ctx = getConciergeContext(null)
    expect(ctx.user).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Default state shapes
// ---------------------------------------------------------------------------

describe("getConciergeContext — default buyer state", () => {
  it("has correct default prequal status", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState?.prequal.status).toBe("NOT_STARTED")
  })

  it("has correct default auction status", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState?.auction.status).toBe("NOT_STARTED")
  })

  it("has correct default offers status", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState?.offers).toEqual({ status: "NONE", count: 0 })
  })

  it("has correct default contract shield status", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState?.contractShield).toEqual({
      status: "NOT_UPLOADED",
      rejectReasons: [],
    })
  })

  it("has correct default pickup status", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    expect(ctx.buyerState?.pickup).toEqual({
      status: "NOT_SCHEDULED",
      time: null,
    })
  })
})

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

describe("getConciergeContext — timestamp", () => {
  it("includes an ISO timestamp", () => {
    const ctx = getConciergeContext(makeSession())
    expect(ctx.timestamp).toBeDefined()
    expect(new Date(ctx.timestamp).toISOString()).toBe(ctx.timestamp)
  })
})

// ---------------------------------------------------------------------------
// Context shape matches contract
// ---------------------------------------------------------------------------

describe("getConciergeContext — contract shape", () => {
  it("returns all required top-level keys", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    const keys = Object.keys(ctx)
    expect(keys).toContain("workspace")
    expect(keys).toContain("role")
    expect(keys).toContain("user")
    expect(keys).toContain("timestamp")
    expect(keys).toContain("buyerState")
    expect(keys).toContain("dealerState")
    expect(keys).toContain("affiliateState")
    expect(keys).toContain("adminState")
  })

  it("buyerState contains all required sub-keys", () => {
    const ctx = getConciergeContext(makeSession({ role: "BUYER" }))
    const keys = Object.keys(ctx.buyerState!)
    expect(keys).toEqual(
      expect.arrayContaining([
        "prequal",
        "shortlist",
        "auction",
        "offers",
        "selectedDeal",
        "payments",
        "insurance",
        "contractShield",
        "esign",
        "pickup",
      ]),
    )
  })
})
