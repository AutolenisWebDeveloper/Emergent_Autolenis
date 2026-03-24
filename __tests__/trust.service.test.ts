import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Import under test — after mocks
// ---------------------------------------------------------------------------
import {
  createTrustFlag,
  getTrustFlagsByEntity,
  getOpenTrustFlags,
  updateTrustFlagStatus,
  createTrustReview,
  resolveTrustReview,
  getReviewsByFlagId,
  createComplianceCase,
  updateComplianceCaseStatus,
  getOpenComplianceCases,
  createModerationAction,
  getModerationHistory,
  getRetentionPolicies,
  getRetentionPolicyByKey,
  updateRetentionPolicy,
  createRetentionHold,
  releaseRetentionHold,
  getActiveHoldsForEntity,
  hasActiveHold,
  TrustEntityType,
  TrustSeverity,
  TrustFlagSourceType,
  TrustFlagStatus,
  ReviewStatus,
  ComplianceCaseStatus,
  ComplianceCasePriority,
  ModerationActionType,
  RetentionAction,
  HoldSource,
} from "@/lib/services/trust/trust.service"

// ---------------------------------------------------------------------------
// Helpers — build chainable Supabase mocks
// ---------------------------------------------------------------------------
function mockChain(resolvedValue: { data: unknown; error: unknown }) {
  const terminal = vi.fn().mockResolvedValue(resolvedValue)

  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  // Each method returns the chain itself so calls are chainable
  for (const m of ["select", "eq", "order", "limit", "insert", "update", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  // Terminal calls resolve the promise
  chain.single = vi.fn().mockResolvedValue(resolvedValue)

  // For queries that don't call .single() — resolve as array
  const arrayResolved = {
    data: Array.isArray(resolvedValue.data) ? resolvedValue.data : [resolvedValue.data],
    error: resolvedValue.error,
  }

  // Make chainable methods that are sometimes terminal resolve properly
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = vi.fn().mockImplementation(() => {
      // Return chain but also make it thenable for terminal use
      const proxy = { ...chain, then: (resolve: (v: unknown) => void) => resolve(arrayResolved) }
      return proxy
    })
  }

  // insert/update return chain with select
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)

  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. Enum / constant tests
// ═══════════════════════════════════════════════════════════════════════════
describe("Trust enums", () => {
  it("TrustEntityType has all expected values", () => {
    expect(TrustEntityType.INVENTORY_LISTING).toBe("INVENTORY_LISTING")
    expect(TrustEntityType.CANONICAL_VEHICLE).toBe("CANONICAL_VEHICLE")
    expect(TrustEntityType.EXTERNAL_DEALER).toBe("EXTERNAL_DEALER")
    expect(TrustEntityType.DEALER).toBe("DEALER")
    expect(TrustEntityType.BUYER).toBe("BUYER")
    expect(TrustEntityType.INVENTORY_LEAD).toBe("INVENTORY_LEAD")
    expect(TrustEntityType.SOURCING_CASE).toBe("SOURCING_CASE")
    expect(TrustEntityType.SOURCING_INVITE).toBe("SOURCING_INVITE")
    expect(TrustEntityType.SOURCING_OFFER).toBe("SOURCING_OFFER")
    expect(TrustEntityType.CASE_CONVERSION).toBe("CASE_CONVERSION")
    expect(TrustEntityType.SELECTED_DEAL).toBe("SELECTED_DEAL")
    expect(TrustEntityType.DOCUMENT).toBe("DOCUMENT")
  })

  it("TrustEntityType has exactly 12 values", () => {
    expect(Object.keys(TrustEntityType)).toHaveLength(12)
  })

  it("TrustSeverity has all expected values", () => {
    expect(TrustSeverity.LOW).toBe("LOW")
    expect(TrustSeverity.MEDIUM).toBe("MEDIUM")
    expect(TrustSeverity.HIGH).toBe("HIGH")
    expect(TrustSeverity.CRITICAL).toBe("CRITICAL")
  })

  it("TrustSeverity has exactly 4 values", () => {
    expect(Object.keys(TrustSeverity)).toHaveLength(4)
  })

  it("TrustFlagSourceType has all expected values", () => {
    expect(TrustFlagSourceType.SYSTEM).toBe("SYSTEM")
    expect(TrustFlagSourceType.ADMIN).toBe("ADMIN")
    expect(TrustFlagSourceType.DEALER).toBe("DEALER")
    expect(TrustFlagSourceType.BUYER).toBe("BUYER")
  })

  it("TrustFlagStatus has all expected values", () => {
    expect(TrustFlagStatus.OPEN).toBe("OPEN")
    expect(TrustFlagStatus.IN_REVIEW).toBe("IN_REVIEW")
    expect(TrustFlagStatus.RESOLVED).toBe("RESOLVED")
    expect(TrustFlagStatus.DISMISSED).toBe("DISMISSED")
  })

  it("ReviewStatus has all expected values", () => {
    expect(ReviewStatus.OPEN).toBe("OPEN")
    expect(ReviewStatus.IN_REVIEW).toBe("IN_REVIEW")
    expect(ReviewStatus.RESOLVED).toBe("RESOLVED")
    expect(ReviewStatus.ESCALATED).toBe("ESCALATED")
    expect(ReviewStatus.REJECTED).toBe("REJECTED")
  })

  it("ReviewStatus has exactly 5 values", () => {
    expect(Object.keys(ReviewStatus)).toHaveLength(5)
  })

  it("ComplianceCaseStatus has all expected values", () => {
    expect(ComplianceCaseStatus.OPEN).toBe("OPEN")
    expect(ComplianceCaseStatus.IN_REVIEW).toBe("IN_REVIEW")
    expect(ComplianceCaseStatus.RESOLVED).toBe("RESOLVED")
    expect(ComplianceCaseStatus.ESCALATED).toBe("ESCALATED")
    expect(ComplianceCaseStatus.REJECTED).toBe("REJECTED")
  })

  it("ComplianceCasePriority has all expected values", () => {
    expect(ComplianceCasePriority.LOW).toBe("LOW")
    expect(ComplianceCasePriority.MEDIUM).toBe("MEDIUM")
    expect(ComplianceCasePriority.HIGH).toBe("HIGH")
    expect(ComplianceCasePriority.CRITICAL).toBe("CRITICAL")
  })

  it("ModerationActionType has all expected values", () => {
    expect(ModerationActionType.SUPPRESS).toBe("SUPPRESS")
    expect(ModerationActionType.RESTORE).toBe("RESTORE")
    expect(ModerationActionType.BLOCK).toBe("BLOCK")
    expect(ModerationActionType.UNBLOCK).toBe("UNBLOCK")
    expect(ModerationActionType.APPROVE).toBe("APPROVE")
    expect(ModerationActionType.REJECT).toBe("REJECT")
    expect(ModerationActionType.ESCALATE).toBe("ESCALATE")
    expect(ModerationActionType.HOLD).toBe("HOLD")
    expect(ModerationActionType.RELEASE).toBe("RELEASE")
  })

  it("ModerationActionType has exactly 9 values", () => {
    expect(Object.keys(ModerationActionType)).toHaveLength(9)
  })

  it("RetentionAction has DELETE and ARCHIVE", () => {
    expect(RetentionAction.DELETE).toBe("DELETE")
    expect(RetentionAction.ARCHIVE).toBe("ARCHIVE")
  })

  it("HoldSource has all expected values", () => {
    expect(HoldSource.LEGAL).toBe("LEGAL")
    expect(HoldSource.COMPLIANCE).toBe("COMPLIANCE")
    expect(HoldSource.INVESTIGATION).toBe("INVESTIGATION")
    expect(HoldSource.ADMIN).toBe("ADMIN")
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Trust flag tests
// ═══════════════════════════════════════════════════════════════════════════
describe("createTrustFlag", () => {
  it("inserts a trust flag with correct fields", async () => {
    const flagRow = { id: "flag-1", entity_type: "BUYER", entity_id: "b-1", flag_code: "SPAM_LEAD", severity: "HIGH", status: "OPEN" }
    const chain = mockChain({ data: flagRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createTrustFlag({
      entityType: "BUYER",
      entityId: "b-1",
      flagCode: "SPAM_LEAD",
      severity: "HIGH",
      sourceType: "SYSTEM",
    })

    expect(mockFrom).toHaveBeenCalledWith("trust_flags")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "BUYER",
        entity_id: "b-1",
        flag_code: "SPAM_LEAD",
        severity: "HIGH",
        source_type: "SYSTEM",
        status: "OPEN",
      })
    )
    expect(result).toEqual(flagRow)
  })

  it("defaults source_type to SYSTEM when not provided", async () => {
    const chain = mockChain({ data: { id: "flag-2" }, error: null })
    mockFrom.mockReturnValue(chain)

    await createTrustFlag({
      entityType: "DEALER",
      entityId: "d-1",
      flagCode: "BAD_FAITH_OFFER",
      severity: "MEDIUM",
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_type: "SYSTEM" })
    )
  })

  it("throws on insert error", async () => {
    const chain = mockChain({ data: null, error: { message: "insert failed" } })
    mockFrom.mockReturnValue(chain)

    await expect(
      createTrustFlag({
        entityType: "BUYER",
        entityId: "b-1",
        flagCode: "SPAM",
        severity: "LOW",
      })
    ).rejects.toThrow("Failed to create trust flag: insert failed")
  })
})

describe("getTrustFlagsByEntity", () => {
  it("queries by entity_type and entity_id", async () => {
    const rows = [{ id: "f1" }, { id: "f2" }]
    const chain = mockChain({ data: rows, error: null })
    mockFrom.mockReturnValue(chain)

    // getTrustFlagsByEntity does NOT call .single(), so it resolves the chain directly
    // We need to make the chain resolve as a thenable for the last call
    chain.order = vi.fn().mockResolvedValue({ data: rows, error: null })

    const result = await getTrustFlagsByEntity("BUYER", "b-1")

    expect(mockFrom).toHaveBeenCalledWith("trust_flags")
    expect(chain.select).toHaveBeenCalledWith("*")
    expect(result).toEqual(rows)
  })

  it("returns empty array when no flags found", async () => {
    const chain = mockChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: null, error: null })

    const result = await getTrustFlagsByEntity("DEALER", "d-1")
    expect(result).toEqual([])
  })
})

describe("getOpenTrustFlags", () => {
  it("filters by status OPEN", async () => {
    const rows = [{ id: "f1", status: "OPEN" }]
    const chain = mockChain({ data: rows, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: rows, error: null })

    const result = await getOpenTrustFlags()

    expect(mockFrom).toHaveBeenCalledWith("trust_flags")
    expect(chain.eq).toHaveBeenCalledWith("status", "OPEN")
    expect(result).toEqual(rows)
  })

  it("applies severity filter when provided", async () => {
    const chain = mockChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    // Need to make sure chained .eq returns the chain
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null })

    await getOpenTrustFlags({ severity: "CRITICAL", limit: 5 })

    // eq is called twice: once for status, once for severity
    expect(chain.eq).toHaveBeenCalledWith("status", "OPEN")
    expect(chain.eq).toHaveBeenCalledWith("severity", "CRITICAL")
    expect(chain.limit).toHaveBeenCalledWith(5)
  })
})

describe("updateTrustFlagStatus", () => {
  it("updates flag status", async () => {
    const updated = { id: "flag-1", status: "RESOLVED" }
    const chain = mockChain({ data: updated, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await updateTrustFlagStatus("flag-1", "RESOLVED")

    expect(mockFrom).toHaveBeenCalledWith("trust_flags")
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "RESOLVED" })
    )
    expect(result).toEqual(updated)
  })

  it("throws on update error", async () => {
    const chain = mockChain({ data: null, error: { message: "update failed" } })
    mockFrom.mockReturnValue(chain)

    await expect(updateTrustFlagStatus("flag-1", "RESOLVED")).rejects.toThrow(
      "Failed to update trust flag status: update failed"
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Trust review tests
// ═══════════════════════════════════════════════════════════════════════════
describe("createTrustReview", () => {
  it("creates a review linked to a flag", async () => {
    const reviewRow = { id: "rev-1", trust_flag_id: "flag-1", review_status: "OPEN" }
    const chain = mockChain({ data: reviewRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createTrustReview({
      trustFlagId: "flag-1",
      reviewerUserId: "admin-1",
      notes: "Suspicious activity",
    })

    expect(mockFrom).toHaveBeenCalledWith("trust_reviews")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trust_flag_id: "flag-1",
        reviewer_user_id: "admin-1",
        review_status: "OPEN",
        notes: "Suspicious activity",
      })
    )
    expect(result).toEqual(reviewRow)
  })

  it("throws on error", async () => {
    const chain = mockChain({ data: null, error: { message: "review insert failed" } })
    mockFrom.mockReturnValue(chain)

    await expect(
      createTrustReview({ trustFlagId: "flag-1" })
    ).rejects.toThrow("Failed to create trust review: review insert failed")
  })
})

describe("resolveTrustReview", () => {
  it("resolves a review with resolution code", async () => {
    const resolved = { id: "rev-1", review_status: "RESOLVED", resolution_code: "CONFIRMED_FRAUD" }
    const chain = mockChain({ data: resolved, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await resolveTrustReview("rev-1", "CONFIRMED_FRAUD", "admin-1", "Verified")

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        review_status: "RESOLVED",
        resolution_code: "CONFIRMED_FRAUD",
        reviewer_user_id: "admin-1",
        notes: "Verified",
      })
    )
    expect(result).toEqual(resolved)
  })
})

describe("getReviewsByFlagId", () => {
  it("returns reviews for a flag", async () => {
    const reviews = [{ id: "rev-1" }, { id: "rev-2" }]
    const chain = mockChain({ data: reviews, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: reviews, error: null })

    const result = await getReviewsByFlagId("flag-1")

    expect(mockFrom).toHaveBeenCalledWith("trust_reviews")
    expect(chain.eq).toHaveBeenCalledWith("trust_flag_id", "flag-1")
    expect(result).toEqual(reviews)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. Compliance case tests
// ═══════════════════════════════════════════════════════════════════════════
describe("createComplianceCase", () => {
  it("creates a compliance case with correct fields", async () => {
    const caseRow = { id: "case-1", case_type: "FRAUD_INVESTIGATION", status: "OPEN" }
    const chain = mockChain({ data: caseRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createComplianceCase({
      caseType: "FRAUD_INVESTIGATION",
      entityType: "BUYER",
      entityId: "b-1",
      priority: "HIGH",
      title: "Suspicious buyer activity",
    })

    expect(mockFrom).toHaveBeenCalledWith("compliance_cases")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        case_type: "FRAUD_INVESTIGATION",
        entity_type: "BUYER",
        entity_id: "b-1",
        priority: "HIGH",
        title: "Suspicious buyer activity",
        status: "OPEN",
      })
    )
    expect(result).toEqual(caseRow)
  })

  it("defaults priority to MEDIUM", async () => {
    const chain = mockChain({ data: { id: "case-2" }, error: null })
    mockFrom.mockReturnValue(chain)

    await createComplianceCase({
      caseType: "AML_REVIEW",
      entityType: "DEALER",
      entityId: "d-1",
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "MEDIUM" })
    )
  })

  it("throws on error", async () => {
    const chain = mockChain({ data: null, error: { message: "case insert failed" } })
    mockFrom.mockReturnValue(chain)

    await expect(
      createComplianceCase({
        caseType: "FRAUD",
        entityType: "BUYER",
        entityId: "b-1",
      })
    ).rejects.toThrow("Failed to create compliance case: case insert failed")
  })
})

describe("updateComplianceCaseStatus", () => {
  it("updates case status", async () => {
    const updated = { id: "case-1", status: "RESOLVED" }
    const chain = mockChain({ data: updated, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await updateComplianceCaseStatus("case-1", "RESOLVED", "Case resolved")

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "RESOLVED", notes: "Case resolved" })
    )
    expect(result).toEqual(updated)
  })
})

describe("getOpenComplianceCases", () => {
  it("returns open cases", async () => {
    const cases = [{ id: "c1" }]
    const chain = mockChain({ data: cases, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: cases, error: null })

    const result = await getOpenComplianceCases()

    expect(mockFrom).toHaveBeenCalledWith("compliance_cases")
    expect(chain.eq).toHaveBeenCalledWith("status", "OPEN")
    expect(result).toEqual(cases)
  })

  it("applies priority filter", async () => {
    const chain = mockChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    // All chainable methods must return the chain so .eq() works after .order()
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null })

    await getOpenComplianceCases({ priority: "CRITICAL", limit: 5 })

    expect(chain.eq).toHaveBeenCalledWith("priority", "CRITICAL")
    expect(chain.limit).toHaveBeenCalledWith(5)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. Moderation action tests
// ═══════════════════════════════════════════════════════════════════════════
describe("createModerationAction", () => {
  it("creates a moderation action", async () => {
    const actionRow = { id: "mod-1", action_type: "SUPPRESS", entity_type: "INVENTORY_LISTING" }
    const chain = mockChain({ data: actionRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createModerationAction({
      entityType: "INVENTORY_LISTING",
      entityId: "listing-1",
      actionType: "SUPPRESS",
      actorUserId: "admin-1",
      reasonCode: "SUSPICIOUS_PRICE",
      notes: "Price too low to be genuine",
    })

    expect(mockFrom).toHaveBeenCalledWith("moderation_actions")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "INVENTORY_LISTING",
        entity_id: "listing-1",
        action_type: "SUPPRESS",
        actor_user_id: "admin-1",
        reason_code: "SUSPICIOUS_PRICE",
      })
    )
    expect(result).toEqual(actionRow)
  })

  it("throws on error", async () => {
    const chain = mockChain({ data: null, error: { message: "mod insert failed" } })
    mockFrom.mockReturnValue(chain)

    await expect(
      createModerationAction({
        entityType: "BUYER",
        entityId: "b-1",
        actionType: "BLOCK",
      })
    ).rejects.toThrow("Failed to create moderation action: mod insert failed")
  })
})

describe("getModerationHistory", () => {
  it("returns moderation history for entity", async () => {
    const actions = [{ id: "mod-1" }, { id: "mod-2" }]
    const chain = mockChain({ data: actions, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: actions, error: null })

    const result = await getModerationHistory("BUYER", "b-1")

    expect(mockFrom).toHaveBeenCalledWith("moderation_actions")
    expect(result).toEqual(actions)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. Retention policy tests
// ═══════════════════════════════════════════════════════════════════════════
describe("getRetentionPolicies", () => {
  it("returns active policies", async () => {
    const policies = [{ id: "p1", policy_key: "RAW_LISTING_RETENTION" }]
    const chain = mockChain({ data: policies, error: null })
    mockFrom.mockReturnValue(chain)
    // All chainable methods must return the chain so .eq() works after .order()
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockResolvedValue({ data: policies, error: null })
    chain.order = vi.fn().mockReturnValue(chain)

    const result = await getRetentionPolicies()

    expect(mockFrom).toHaveBeenCalledWith("retention_policies")
    expect(chain.eq).toHaveBeenCalledWith("is_active", true)
    expect(result).toEqual(policies)
  })

  it("returns all policies when activeOnly is false", async () => {
    const policies = [{ id: "p1" }]
    const chain = mockChain({ data: policies, error: null })
    mockFrom.mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: policies, error: null })

    await getRetentionPolicies(false)

    // eq should NOT be called with is_active when activeOnly is false
    expect(chain.eq).not.toHaveBeenCalledWith("is_active", true)
  })
})

describe("getRetentionPolicyByKey", () => {
  it("returns policy by key", async () => {
    const policy = { id: "p1", policy_key: "LEAD_RETENTION", retention_days: 1095 }
    const chain = mockChain({ data: policy, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getRetentionPolicyByKey("LEAD_RETENTION")

    expect(mockFrom).toHaveBeenCalledWith("retention_policies")
    expect(chain.eq).toHaveBeenCalledWith("policy_key", "LEAD_RETENTION")
    expect(result).toEqual(policy)
  })
})

describe("updateRetentionPolicy", () => {
  it("updates retention days and action", async () => {
    const updated = { id: "p1", retention_days: 365, action_after_expiry: "DELETE" }
    const chain = mockChain({ data: updated, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await updateRetentionPolicy("LEAD_RETENTION", {
      retentionDays: 365,
      actionAfterExpiry: "DELETE",
    })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        retention_days: 365,
        action_after_expiry: "DELETE",
      })
    )
    expect(result).toEqual(updated)
  })

  it("updates isActive flag", async () => {
    const chain = mockChain({ data: { id: "p1", is_active: false }, error: null })
    mockFrom.mockReturnValue(chain)

    await updateRetentionPolicy("LEAD_RETENTION", { isActive: false })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. Retention hold tests
// ═══════════════════════════════════════════════════════════════════════════
describe("createRetentionHold", () => {
  it("creates a retention hold", async () => {
    const holdRow = { id: "hold-1", entity_type: "SOURCING_CASE", is_active: true }
    const chain = mockChain({ data: holdRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createRetentionHold({
      entityType: "SOURCING_CASE",
      entityId: "sc-1",
      holdReason: "Litigation hold",
      holdSource: "LEGAL",
    })

    expect(mockFrom).toHaveBeenCalledWith("retention_holds")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "SOURCING_CASE",
        entity_id: "sc-1",
        hold_reason: "Litigation hold",
        hold_source: "LEGAL",
        is_active: true,
      })
    )
    expect(result).toEqual(holdRow)
  })

  it("defaults hold_source to LEGAL", async () => {
    const chain = mockChain({ data: { id: "hold-2" }, error: null })
    mockFrom.mockReturnValue(chain)

    await createRetentionHold({
      entityType: "BUYER",
      entityId: "b-1",
      holdReason: "Investigation",
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ hold_source: "LEGAL" })
    )
  })
})

describe("releaseRetentionHold", () => {
  it("marks hold as inactive with released_at", async () => {
    const released = { id: "hold-1", is_active: false, released_at: "2024-01-01T00:00:00.000Z" }
    const chain = mockChain({ data: released, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await releaseRetentionHold("hold-1")

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
      })
    )
    expect(result).toEqual(released)
  })
})

describe("getActiveHoldsForEntity", () => {
  it("returns active holds for entity", async () => {
    const holds = [{ id: "h1", is_active: true }]
    const chain = mockChain({ data: holds, error: null })
    mockFrom.mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: holds, error: null })

    const result = await getActiveHoldsForEntity("BUYER", "b-1")

    expect(mockFrom).toHaveBeenCalledWith("retention_holds")
    expect(chain.eq).toHaveBeenCalledWith("is_active", true)
    expect(result).toEqual(holds)
  })
})

describe("hasActiveHold", () => {
  it("returns true when holds exist", async () => {
    const chain = mockChain({ data: [{ id: "h1" }], error: null })
    mockFrom.mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: [{ id: "h1" }], error: null })

    const result = await hasActiveHold("BUYER", "b-1")
    expect(result).toBe(true)
  })

  it("returns false when no holds exist", async () => {
    const chain = mockChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null })

    const result = await hasActiveHold("BUYER", "b-1")
    expect(result).toBe(false)
  })
})
