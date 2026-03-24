import { describe, expect, it, beforeEach } from "vitest"
import { buildViewerContext, type AIRole } from "@/lib/ai/context-builder"
import { routeToAgentSync, classifyIntent, FINANCIAL_LEGAL_DISCLOSURE } from "@/lib/ai/router"
import { orchestrateSync, executeTool, logAudit, getAuditLog } from "@/lib/ai/orchestrator"
import { sessionStore } from "@/lib/ai/memory/session-store"
import {
  getTool,
  getToolsForRole,
  getToolsForAgent,
  validateToolAccess,
} from "@/lib/ai/tools/registry"
import { salesAgent } from "@/lib/ai/agents/sales.agent"
import { buyerConciergeAgent } from "@/lib/ai/agents/buyer-concierge.agent"
import { dealerLiaisonAgent } from "@/lib/ai/agents/dealer-liaison.agent"
import { affiliateGrowthAgent } from "@/lib/ai/agents/affiliate-growth.agent"
import { adminOpsAgent } from "@/lib/ai/agents/admin-ops.agent"
import { seoAgent } from "@/lib/ai/agents/seo.agent"
import { contractAgent } from "@/lib/ai/agents/contract.agent"

// =========================================================================
// Context Builder
// =========================================================================

describe("context-builder", () => {
  it("returns public role for null session", () => {
    const ctx = buildViewerContext(null)
    expect(ctx.role).toBe("public")
    expect(ctx.userId).toBeNull()
    expect(ctx.permissions).toContain("read")
    expect(ctx.permissions).not.toContain("write")
  })

  it("maps BUYER session to buyer role", () => {
    const ctx = buildViewerContext({ userId: "u1", role: "BUYER", workspace_id: "ws1" })
    expect(ctx.role).toBe("buyer")
    expect(ctx.userId).toBe("u1")
    expect(ctx.permissions).toContain("buyer")
  })

  it("maps DEALER session to dealer role", () => {
    const ctx = buildViewerContext({ userId: "u2", role: "DEALER" })
    expect(ctx.role).toBe("dealer")
    expect(ctx.permissions).toContain("dealer")
  })

  it("maps DEALER_USER session to dealer role", () => {
    const ctx = buildViewerContext({ userId: "u3", role: "DEALER_USER" })
    expect(ctx.role).toBe("dealer")
  })

  it("maps AFFILIATE session to affiliate role", () => {
    const ctx = buildViewerContext({ userId: "u4", role: "AFFILIATE" })
    expect(ctx.role).toBe("affiliate")
  })

  it("maps ADMIN session to admin role", () => {
    const ctx = buildViewerContext({ userId: "u5", role: "ADMIN" })
    expect(ctx.role).toBe("admin")
    expect(ctx.permissions).toContain("admin")
    expect(ctx.permissions).toContain("audit")
  })

  it("maps SUPER_ADMIN session to admin role", () => {
    const ctx = buildViewerContext({ userId: "u6", role: "SUPER_ADMIN" })
    expect(ctx.role).toBe("admin")
  })

  it("defaults unknown role to public", () => {
    const ctx = buildViewerContext({ userId: "u7", role: "UNKNOWN" })
    expect(ctx.role).toBe("public")
  })
})

// =========================================================================
// Router
// =========================================================================

describe("router", () => {
  describe("classifyIntent", () => {
    it("classifies SEO keywords to seo intent", () => {
      const result = classifyIntent("Can you help me with SEO for the homepage?")
      expect(result.intent).toBe("seo")
      expect(result.domain).toBe("marketing")
    })

    it("classifies contract keywords to contract_review intent", () => {
      const result = classifyIntent("I want to review my contract for hidden fees")
      expect(result.intent).toBe("contract_review")
      expect(result.domain).toBe("legal")
    })

    it("classifies general messages as general intent", () => {
      const result = classifyIntent("Tell me something interesting today")
      expect(result.intent).toBe("general")
      expect(result.riskLevel).toBe("low")
    })

    it("flags high risk for legal/financial keywords", () => {
      const result = classifyIntent("Can you guarantee I'll get approved for the loan?")
      expect(result.riskLevel).toBe("high")
    })
  })

  describe("routeToAgent", () => {
    it("routes public to SalesAgent", () => {
      const result = routeToAgentSync("public", "Tell me about your services")
      expect(result.agent.name).toBe("SalesAgent")
    })

    it("routes buyer to BuyerConciergeAgent", () => {
      const result = routeToAgentSync("buyer", "What is my deal status?")
      expect(result.agent.name).toBe("BuyerConciergeAgent")
    })

    it("routes dealer to DealerLiaisonAgent", () => {
      const result = routeToAgentSync("dealer", "How do I submit an offer?")
      expect(result.agent.name).toBe("DealerLiaisonAgent")
    })

    it("routes affiliate to AffiliateGrowthAgent", () => {
      const result = routeToAgentSync("affiliate", "How are my commissions calculated?")
      expect(result.agent.name).toBe("AffiliateGrowthAgent")
    })

    it("routes admin to AdminOpsAgent", () => {
      const result = routeToAgentSync("admin", "Show me user stats")
      expect(result.agent.name).toBe("AdminOpsAgent")
    })

    it("overrides admin to SEOAgent for seo intent", () => {
      const result = routeToAgentSync("admin", "Generate a blog about SEO")
      expect(result.agent.name).toBe("SEOAgent")
    })

    it("overrides buyer to ContractAgent for contract intent", () => {
      const result = routeToAgentSync("buyer", "Analyze my contract for hidden fees")
      expect(result.agent.name).toBe("ContractAgent")
    })

    it("adds disclosure for high-risk messages", () => {
      const result = routeToAgentSync("public", "Can you guarantee savings?")
      expect(result.disclosure).toBe(FINANCIAL_LEGAL_DISCLOSURE)
    })

    it("returns null disclosure for low-risk messages", () => {
      const result = routeToAgentSync("public", "How does AutoLenis work?")
      expect(result.disclosure).toBeNull()
    })
  })
})

// =========================================================================
// Tool Registry
// =========================================================================

describe("tool registry", () => {
  it("getTool returns a valid tool", () => {
    const tool = getTool("createLead")
    expect(tool).toBeDefined()
    expect(tool!.name).toBe("createLead")
  })

  it("getTool returns undefined for non-existent tool", () => {
    expect(getTool("nonExistentTool")).toBeUndefined()
  })

  it("getToolsForRole returns buyer tools for buyer role", () => {
    const tools = getToolsForRole("buyer")
    const names = tools.map((t) => t.name)
    expect(names).toContain("startPreQual")
    expect(names).toContain("checkDealStatus")
    expect(names).not.toContain("searchUser")
  })

  it("getToolsForRole returns admin tools for admin role", () => {
    const tools = getToolsForRole("admin")
    const names = tools.map((t) => t.name)
    expect(names).toContain("searchUser")
    expect(names).toContain("generateReport")
    expect(names).toContain("createLead")
  })

  it("getToolsForRole returns limited tools for public role", () => {
    const tools = getToolsForRole("public")
    const names = tools.map((t) => t.name)
    expect(names).toContain("createLead")
    expect(names).toContain("scheduleConsultation")
    expect(names).not.toContain("startPreQual")
  })

  it("getToolsForAgent filters by agent's allowed tools AND role", () => {
    const tools = getToolsForAgent(salesAgent.allowedTools, "public")
    expect(tools.length).toBe(3)
    expect(tools.map((t) => t.name)).toContain("createLead")
    expect(tools.map((t) => t.name)).toContain("estimateAffordability")
  })

  it("validateToolAccess allows valid role+tool", () => {
    const result = validateToolAccess("createLead", "public")
    expect(result.allowed).toBe(true)
  })

  it("validateToolAccess denies invalid role+tool", () => {
    const result = validateToolAccess("searchUser", "buyer")
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it("validateToolAccess denies non-existent tool", () => {
    const result = validateToolAccess("fakeToolXYZ", "admin")
    expect(result.allowed).toBe(false)
  })
})

// =========================================================================
// Agents
// =========================================================================

describe("agents", () => {
  it("each agent has required exports", () => {
    const agents = [
      salesAgent,
      buyerConciergeAgent,
      dealerLiaisonAgent,
      affiliateGrowthAgent,
      adminOpsAgent,
      seoAgent,
      contractAgent,
    ]

    for (const agent of agents) {
      expect(agent.name).toBeTruthy()
      expect(agent.systemPrompt).toBeTruthy()
      expect(Array.isArray(agent.allowedTools)).toBe(true)
      expect(Array.isArray(agent.restrictedClaims)).toBe(true)
      expect(Array.isArray(agent.requiredDisclosures)).toBe(true)
    }
  })

  it("sales agent cannot use admin tools", () => {
    const tools = getToolsForAgent(salesAgent.allowedTools, "public")
    const names = tools.map((t) => t.name)
    expect(names).not.toContain("searchUser")
    expect(names).not.toContain("generateReport")
  })

  it("affiliate agent has referral tools", () => {
    const tools = getToolsForAgent(affiliateGrowthAgent.allowedTools, "affiliate")
    const names = tools.map((t) => t.name)
    expect(names).toContain("generateReferralLink")
    expect(names).toContain("checkReferralStats")
    expect(names).toContain("checkPendingPayouts")
    expect(names).toContain("reportAttributionIssue")
  })

  it("contract agent's tools are accessible to buyer", () => {
    const tools = getToolsForAgent(contractAgent.allowedTools, "buyer")
    expect(tools.length).toBeGreaterThan(0)
  })
})

// =========================================================================
// Session Store (Memory)
// =========================================================================

describe("session store", () => {
  beforeEach(() => {
    sessionStore.clear("test-conv-1")
  })

  it("creates a new session on first access", () => {
    const ctx = sessionStore.getContext("test-conv-1")
    expect(ctx.messages).toHaveLength(0)
    expect(ctx.summary).toBeNull()
  })

  it("stores messages", () => {
    sessionStore.addMessage("test-conv-1", { sender: "user", content: "Hello", timestamp: Date.now() })
    sessionStore.addMessage("test-conv-1", { sender: "assistant", content: "Hi!", timestamp: Date.now() })
    const ctx = sessionStore.getContext("test-conv-1")
    expect(ctx.messages).toHaveLength(2)
  })

  it("summarizes after threshold", () => {
    for (let i = 0; i < 16; i++) {
      sessionStore.addMessage("test-conv-1", {
        sender: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        timestamp: Date.now(),
      })
    }
    const ctx = sessionStore.getContext("test-conv-1")
    // After summarisation, older messages are condensed
    expect(ctx.summary).toBeTruthy()
    expect(ctx.messages.length).toBeLessThan(16)
  })
})

// =========================================================================
// Orchestrator
// =========================================================================

describe("orchestrator", () => {
  it("orchestrates a public user message", () => {
    const result = orchestrateSync({
      conversationId: "orch-test-1",
      message: "Tell me something interesting today",
      session: null,
    })

    expect(result.agent).toBe("SalesAgent")
    expect(result.role).toBe("public")
    expect(result.intent).toBe("general")
    expect(result.availableTools.length).toBeGreaterThan(0)
  })

  it("orchestrates a buyer message", () => {
    const result = orchestrateSync({
      conversationId: "orch-test-2",
      message: "What is my deal status?",
      session: { userId: "buyer-1", role: "BUYER", workspace_id: "ws1" },
    })

    expect(result.agent).toBe("BuyerConciergeAgent")
    expect(result.role).toBe("buyer")
  })

  it("logs audit entries", () => {
    const before = getAuditLog().length

    orchestrateSync({
      conversationId: "orch-test-3",
      message: "Hello",
      session: null,
    })

    expect(getAuditLog().length).toBeGreaterThan(before)
  })

  it("adds disclosure for high-risk messages", () => {
    const result = orchestrateSync({
      conversationId: "orch-test-4",
      message: "Can you guarantee my loan approval?",
      session: null,
    })

    expect(result.disclosure).toBe(FINANCIAL_LEGAL_DISCLOSURE)
    expect(result.riskLevel).toBe("high")
  })
})

// =========================================================================
// Tool Execution
// =========================================================================

describe("executeTool", () => {
  it("executes an allowed tool (returns service unavailable)", async () => {
    const result = await executeTool(
      { name: "createLead", arguments: { name: "Test User", email: "test@example.com" } },
      "public",
      "exec-test-1",
      null,
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    const data = result.data as Record<string, unknown>
    expect(data["success"]).toBe(false)
  })

  it("rejects tool not allowed for role", async () => {
    const result = await executeTool(
      { name: "searchUser", arguments: { query: "test" } },
      "buyer",
      "exec-test-2",
      "buyer-1",
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain("not permitted")
  })

  it("rejects non-existent tool", async () => {
    const result = await executeTool(
      { name: "fakeToolXYZ", arguments: {} },
      "admin",
      "exec-test-3",
      "admin-1",
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  it("executes admin tool for admin role (returns service unavailable)", async () => {
    const result = await executeTool(
      { name: "searchUser", arguments: { query: "test@example.com" } },
      "admin",
      "exec-test-4",
      "admin-1",
    )
    expect(result.success).toBe(true)
    const data = result.data as Record<string, unknown>
    expect(data["success"]).toBe(false)
  })

  it("executes affiliate tool for affiliate role (returns service unavailable)", async () => {
    const result = await executeTool(
      { name: "generateReferralLink", arguments: { affiliateId: "aff-1" } },
      "affiliate",
      "exec-test-5",
      "aff-1",
    )
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    const data = result.data as Record<string, unknown>
    expect(data["success"]).toBe(false)
  })
})
