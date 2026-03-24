import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// ── Import under test ────────────────────────────────────────────────────

import {
  getActiveRules,
  hasUnresolvedEvent,
  recordSlaEvent,
  resolveSlaEvent,
  resolveAllForEntity,
  evaluateEntities,
  type SlaRule,
  type EvaluableEntity,
} from "@/lib/services/workflow/sla.service"

// ── Tests ────────────────────────────────────────────────────────────────

describe("Workflow SLA Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getActiveRules ────────────────────────────────────────────────────

  describe("getActiveRules", () => {
    it("returns active rules for a workflow type", async () => {
      const rules = [
        {
          id: "r-1",
          workflow_type: "INVENTORY_LEAD",
          rule_key: "NEW_LEAD_UNTOUCHED",
          threshold_minutes: 30,
          action_type: "REMINDER",
          is_active: true,
          payload: { notify: "ADMIN" },
        },
      ]

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: rules, error: null }),
            }),
          }),
        }),
      })

      const result = await getActiveRules("INVENTORY_LEAD")

      expect(result).toHaveLength(1)
      expect(result[0].rule_key).toBe("NEW_LEAD_UNTOUCHED")
      expect(mockFrom).toHaveBeenCalledWith("workflow_sla_rules")
    })

    it("returns all active rules when no workflow type specified", async () => {
      const rules = [
        { id: "r-1", workflow_type: "INVENTORY_LEAD", rule_key: "NEW_LEAD_UNTOUCHED" },
        { id: "r-2", workflow_type: "SOURCING_CASE", rule_key: "CASE_OPEN_NO_INVITES" },
      ]

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rules, error: null }),
          }),
        }),
      })

      const result = await getActiveRules()
      expect(result).toHaveLength(2)
    })

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
          }),
        }),
      })

      const result = await getActiveRules()
      expect(result).toEqual([])
    })
  })

  // ── hasUnresolvedEvent ────────────────────────────────────────────────

  describe("hasUnresolvedEvent", () => {
    it("returns true when unresolved event exists", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: "evt-1" }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await hasUnresolvedEvent("INVENTORY_LEAD", "lead-1", "NEW_LEAD_UNTOUCHED")
      expect(result).toBe(true)
    })

    it("returns false when no unresolved event exists", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await hasUnresolvedEvent("INVENTORY_LEAD", "lead-1", "NEW_LEAD_UNTOUCHED")
      expect(result).toBe(false)
    })
  })

  // ── recordSlaEvent ────────────────────────────────────────────────────

  describe("recordSlaEvent", () => {
    it("records a new SLA event when no unresolved event exists", async () => {
      // First call: hasUnresolvedEvent → select (no results)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      })

      // Second call: insert
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "evt-new",
                workflow_type: "INVENTORY_LEAD",
                entity_id: "lead-1",
                rule_key: "NEW_LEAD_UNTOUCHED",
                event_type: "REMINDER",
                payload: { notify: "ADMIN" },
                resolved: false,
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await recordSlaEvent({
        entityId: "lead-1",
        ruleKey: "NEW_LEAD_UNTOUCHED",
        workflowType: "INVENTORY_LEAD",
        actionType: "REMINDER",
        thresholdMinutes: 30,
        rulePayload: { notify: "ADMIN" },
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe("evt-new")
      expect(result?.event_type).toBe("REMINDER")
    })

    it("skips recording when unresolved event already exists", async () => {
      // hasUnresolvedEvent → existing event found
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: "existing" }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      })

      const result = await recordSlaEvent({
        entityId: "lead-1",
        ruleKey: "NEW_LEAD_UNTOUCHED",
        workflowType: "INVENTORY_LEAD",
        actionType: "REMINDER",
        thresholdMinutes: 30,
        rulePayload: { notify: "ADMIN" },
      })

      expect(result).toBeNull()
    })
  })

  // ── resolveSlaEvent ───────────────────────────────────────────────────

  describe("resolveSlaEvent", () => {
    it("resolves an SLA event", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await resolveSlaEvent("evt-1")
      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith("workflow_sla_events")
    })

    it("returns false on error", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "update fail" } }),
        }),
      })

      const result = await resolveSlaEvent("evt-1")
      expect(result).toBe(false)
    })
  })

  // ── resolveAllForEntity ───────────────────────────────────────────────

  describe("resolveAllForEntity", () => {
    it("resolves all unresolved events for an entity", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      })

      const result = await resolveAllForEntity("INVENTORY_LEAD", "lead-1")
      expect(result).toBe(true)
    })

    it("returns false on error", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "update fail" } }),
            }),
          }),
        }),
      })

      const result = await resolveAllForEntity("INVENTORY_LEAD", "lead-1")
      expect(result).toBe(false)
    })
  })

  // ── evaluateEntities (pure function) ──────────────────────────────────

  describe("evaluateEntities", () => {
    const baseRules: SlaRule[] = [
      {
        id: "r-1",
        workflow_type: "INVENTORY_LEAD",
        rule_key: "NEW_LEAD_UNTOUCHED",
        threshold_minutes: 30,
        action_type: "REMINDER",
        is_active: true,
        payload: { notify: "ADMIN" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "r-2",
        workflow_type: "INVENTORY_LEAD",
        rule_key: "LEAD_STALE",
        threshold_minutes: 240,
        action_type: "ESCALATION",
        is_active: true,
        payload: { notify: "ADMIN" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]

    it("detects violations when entity age exceeds threshold", () => {
      const now = new Date("2026-01-01T01:00:00.000Z") // 60 min after entity creation
      const entities: EvaluableEntity[] = [
        { id: "lead-1", created_at: "2026-01-01T00:00:00.000Z", status: "NEW" },
      ]

      const violations = evaluateEntities(entities, baseRules, now)

      // 60 min > 30 min threshold → REMINDER fires
      // 60 min < 240 min threshold → ESCALATION does not fire
      expect(violations).toHaveLength(1)
      expect(violations[0].ruleKey).toBe("NEW_LEAD_UNTOUCHED")
      expect(violations[0].actionType).toBe("REMINDER")
    })

    it("detects multiple violations for same entity", () => {
      const now = new Date("2026-01-01T05:00:00.000Z") // 300 min
      const entities: EvaluableEntity[] = [
        { id: "lead-1", created_at: "2026-01-01T00:00:00.000Z", status: "NEW" },
      ]

      const violations = evaluateEntities(entities, baseRules, now)

      // 300 min > 30 min AND 300 min > 240 min → both fire
      expect(violations).toHaveLength(2)
      expect(violations.map((v) => v.ruleKey)).toContain("NEW_LEAD_UNTOUCHED")
      expect(violations.map((v) => v.ruleKey)).toContain("LEAD_STALE")
    })

    it("returns no violations when entity is under threshold", () => {
      const now = new Date("2026-01-01T00:10:00.000Z") // 10 min
      const entities: EvaluableEntity[] = [
        { id: "lead-1", created_at: "2026-01-01T00:00:00.000Z", status: "NEW" },
      ]

      const violations = evaluateEntities(entities, baseRules, now)
      expect(violations).toHaveLength(0)
    })

    it("handles empty entities array", () => {
      const violations = evaluateEntities([], baseRules)
      expect(violations).toHaveLength(0)
    })

    it("handles empty rules array", () => {
      const entities: EvaluableEntity[] = [
        { id: "lead-1", created_at: "2026-01-01T00:00:00.000Z" },
      ]

      const violations = evaluateEntities(entities, [])
      expect(violations).toHaveLength(0)
    })

    it("evaluates multiple entities", () => {
      const now = new Date("2026-01-01T01:00:00.000Z") // 60 min
      const entities: EvaluableEntity[] = [
        { id: "lead-1", created_at: "2026-01-01T00:00:00.000Z" }, // 60 min old
        { id: "lead-2", created_at: "2026-01-01T00:50:00.000Z" }, // 10 min old
      ]

      const violations = evaluateEntities(entities, baseRules, now)

      // lead-1: 60 min > 30 min → 1 violation
      // lead-2: 10 min < 30 min → 0 violations
      expect(violations).toHaveLength(1)
      expect(violations[0].entityId).toBe("lead-1")
    })
  })
})
