import { describe, expect, it } from "vitest"
import {
  estimateAffordability,
  validateAffordabilityInput,
  calculatePrincipal,
  APR_BANDS,
  DEFAULT_TERM_MONTHS,
  TAX_FEES_PERCENT,
  INSURANCE_MAINTENANCE_BUFFER,
} from "@/lib/calculators/affordability"
import { executeTool } from "@/lib/ai/orchestrator"
import { getToolsForRole } from "@/lib/ai/tools/registry"
import { AFFORDABILITY_CONTROL, INTERACTION_FRAMEWORK } from "@/lib/ai/prompts/system-prompt"
import { orchestrateSync } from "@/lib/ai/orchestrator"

// =========================================================================
// Calculator Core Logic
// =========================================================================

describe("affordability calculator", () => {
  describe("calculatePrincipal", () => {
    it("returns 0 for zero payment", () => {
      expect(calculatePrincipal(0, 5.99, 60)).toBe(0)
    })

    it("returns 0 for zero term", () => {
      expect(calculatePrincipal(500, 5.99, 0)).toBe(0)
    })

    it("handles 0% APR correctly", () => {
      expect(calculatePrincipal(500, 0, 60)).toBe(30000)
    })

    it("returns a positive principal for valid inputs", () => {
      const principal = calculatePrincipal(500, 5.99, 60)
      expect(principal).toBeGreaterThan(0)
      expect(principal).toBeLessThan(40000)
    })
  })

  describe("input validation", () => {
    it("rejects negative monthlyPayment", () => {
      const result = validateAffordabilityInput({
        monthlyPayment: -100,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect("error" in result).toBe(true)
    })

    it("rejects invalid state", () => {
      const result = validateAffordabilityInput({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TEXAS",
      })
      expect("error" in result).toBe(true)
    })

    it("rejects loan term out of range", () => {
      const result = validateAffordabilityInput({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
        loanTermMonths: 100,
      })
      expect("error" in result).toBe(true)
    })

    it("accepts valid inputs", () => {
      const result = validateAffordabilityInput({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect("error" in result).toBe(false)
    })

    it("defaults loan term to 60 months", () => {
      const result = validateAffordabilityInput({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      if (!("error" in result)) {
        expect(result.loanTermMonths).toBe(60)
      }
    })
  })

  describe("estimateAffordability", () => {
    it("returns success with breakdown for valid inputs", () => {
      const result = estimateAffordability({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.breakdown.paymentRange.max).toBeGreaterThanOrEqual(0)
        expect(result.breakdown.vehicleRange.max).toBeGreaterThan(0)
        expect(result.breakdown.otdRange.max).toBeGreaterThan(0)
        expect(result.breakdown.apr).toBe(APR_BANDS["680-719"].apr)
        expect(result.breakdown.loanTermMonths).toBe(DEFAULT_TERM_MONTHS)
      }
    })

    it("returns assumptions with every result", () => {
      const result = estimateAffordability({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.assumptions.termMonths).toBe(DEFAULT_TERM_MONTHS)
        expect(result.assumptions.aprUsed).toBe(APR_BANDS["680-719"].apr)
        expect(result.assumptions.state).toBe("TX")
        expect(result.assumptions.taxFeesPercent).toBe(`${TAX_FEES_PERCENT * 100}%`)
        expect(result.assumptions.insuranceMaintenanceBuffer).toBe(`$${INSURANCE_MAINTENANCE_BUFFER}/mo`)
      }
    })

    it("returns warnings including disclaimer", () => {
      const result = estimateAffordability({
        monthlyPayment: 500,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0)
        const hasDisclaimer = result.warnings.some((w) => w.includes("Estimate only"))
        expect(hasDisclaimer).toBe(true)
      }
    })

    it("handles 'excellent' credit tier", () => {
      const result = estimateAffordability({
        monthlyPayment: 500,
        downPayment: 5000,
        creditTier: "excellent",
        state: "CA",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.breakdown.apr).toBe(APR_BANDS["760+"].apr)
      }
    })

    it("handles 'rebuilding' credit tier", () => {
      const result = estimateAffordability({
        monthlyPayment: 500,
        downPayment: 2000,
        creditTier: "rebuilding",
        state: "FL",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.breakdown.apr).toBe(APR_BANDS["<600"].apr)
      }
    })

    it("OTD range is larger than vehicle range (includes tax/fees)", () => {
      const result = estimateAffordability({
        monthlyPayment: 600,
        downPayment: 5000,
        creditTier: "good",
        state: "TX",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.breakdown.otdRange.max).toBeGreaterThan(result.breakdown.vehicleRange.max)
      }
    })

    it("returns error for invalid inputs", () => {
      const result = estimateAffordability({
        monthlyPayment: -1,
        downPayment: 3000,
        creditTier: "good",
        state: "TX",
      })
      expect(result.success).toBe(false)
    })
  })
})

// =========================================================================
// Calculator Parity — UI and Lenis tool produce identical results
// =========================================================================

describe("calculator parity — tool uses same logic as UI", () => {
  it("estimateAffordability tool returns the same result as direct call", async () => {
    const toolInput = {
      monthlyPayment: "500",
      downPayment: "3000",
      creditTier: "good",
      state: "TX",
    }

    // Execute via tool
    const toolResult = await executeTool(
      { name: "estimateAffordability", arguments: toolInput },
      "public",
      "parity-test-1",
      null,
    )

    // Execute via direct function call with same inputs
    const directResult = estimateAffordability({
      monthlyPayment: 500,
      downPayment: 3000,
      creditTier: "good",
      state: "TX",
    })

    expect(toolResult.success).toBe(true)
    expect(directResult.success).toBe(true)

    if (toolResult.success && directResult.success) {
      const toolData = toolResult.data as typeof directResult
      expect(toolData.breakdown.paymentRange.max).toBe(directResult.breakdown.paymentRange.max)
      expect(toolData.breakdown.vehicleRange.max).toBe(directResult.breakdown.vehicleRange.max)
      expect(toolData.breakdown.otdRange.max).toBe(directResult.breakdown.otdRange.max)
      expect(toolData.breakdown.apr).toBe(directResult.breakdown.apr)
    }
  })

  it("tool returns structured breakdown and assumptions", async () => {
    const toolResult = await executeTool(
      {
        name: "estimateAffordability",
        arguments: {
          monthlyPayment: "600",
          downPayment: "5000",
          creditTier: "excellent",
          state: "CA",
        },
      },
      "public",
      "parity-test-2",
      null,
    )

    expect(toolResult.success).toBe(true)
    if (toolResult.success) {
      const data = toolResult.data as Record<string, unknown>
      expect(data).toHaveProperty("breakdown")
      expect(data).toHaveProperty("assumptions")
      expect(data).toHaveProperty("warnings")
    }
  })

  it("tool returns error for invalid inputs instead of guessing", async () => {
    const toolResult = await executeTool(
      {
        name: "estimateAffordability",
        arguments: {
          monthlyPayment: "-100",
          downPayment: "3000",
          creditTier: "good",
          state: "TX",
        },
      },
      "public",
      "parity-test-3",
      null,
    )

    expect(toolResult.success).toBe(true)
    if (toolResult.success) {
      const data = toolResult.data as Record<string, unknown>
      expect(data).toHaveProperty("success", false)
      expect(data).toHaveProperty("error")
    }
  })
})

// =========================================================================
// "No Number Without Tool" enforcement
// =========================================================================

describe("no-number-without-tool enforcement", () => {
  it("tool is accessible to public role", () => {
    const tools = getToolsForRole("public")
    const hasTool = tools.some((t) => t.name === "estimateAffordability")
    expect(hasTool).toBe(true)
  })

  it("tool is accessible to buyer role", () => {
    const tools = getToolsForRole("buyer")
    const hasTool = tools.some((t) => t.name === "estimateAffordability")
    expect(hasTool).toBe(true)
  })

  it("system prompt contains 'Do not output affordability numbers without calculator tool results'", () => {
    expect(AFFORDABILITY_CONTROL).toContain(
      "Do not output affordability numbers without calculator tool results",
    )
  })

  it("system prompt contains zero-hallucination rule", () => {
    expect(AFFORDABILITY_CONTROL).toContain("ZERO-HALLUCINATION RULE")
    expect(AFFORDABILITY_CONTROL).toContain("You MUST NOT")
    expect(AFFORDABILITY_CONTROL).toContain("Invent monthly payments")
  })

  it("system prompt contains knowledge retrieval rules", () => {
    expect(INTERACTION_FRAMEWORK).toContain("KNOWLEDGE RETRIEVAL RULES")
    expect(INTERACTION_FRAMEWORK).toContain("NEVER invent policies")
  })

  it("orchestrator includes retrieval context and buildId in results", () => {
    const result = orchestrateSync({
      conversationId: "no-number-test-1",
      message: "What are your fees?",
      session: null,
    })

    expect(result).toHaveProperty("retrievalContext")
    expect(result).toHaveProperty("buildId")
    expect(result.buildId).toBeTruthy()
  })

  it("orchestrator augments system prompt with retrieved knowledge for fee questions", () => {
    const result = orchestrateSync({
      conversationId: "no-number-test-2",
      message: "How much does AutoLenis cost?",
      session: null,
    })

    expect(result.retrievalContext).toBeTruthy()
    expect(result.systemPrompt).toContain("RETRIEVED KNOWLEDGE")
  })
})
