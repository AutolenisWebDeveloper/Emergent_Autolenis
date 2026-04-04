/**
 * Tests for the Lenis Concierge™ centralized system prompt module.
 *
 * Validates identity, brand voice rules, compliance guardrails,
 * role-specific mode prompts, and the buildFullSystemPrompt composer.
 */

import { describe, expect, it } from "vitest"
import {
  LENIS_IDENTITY,
  BRAND_VOICE_RULES,
  COMPLIANCE_GUARDRAILS,
  AFFORDABILITY_CONTROL,
  BREVITY_POLICY,
  INTERACTION_FRAMEWORK,
  MODE_PUBLIC,
  MODE_BUYER,
  MODE_DEALER,
  MODE_AFFILIATE,
  MODE_ADMIN,
  getModePrompt,
  buildFullSystemPrompt,
} from "@/lib/ai/prompts/system-prompt"

// =========================================================================
// Identity
// =========================================================================

describe("Lenis Concierge™ identity", () => {
  it("uses official name 'Lenis Concierge™'", () => {
    expect(LENIS_IDENTITY).toContain("Lenis Concierge™")
  })

  it("identifies as AI-Powered Car Buying Assistant by AutoLenis", () => {
    expect(LENIS_IDENTITY).toContain("AI-Powered Car Buying Assistant by AutoLenis")
  })

  it("states AutoLenis is a concierge intermediary, not a dealership/lender/law firm", () => {
    expect(LENIS_IDENTITY).toContain("concierge intermediary")
    expect(LENIS_IDENTITY).toContain("not a dealership")
    expect(LENIS_IDENTITY).toContain("not a lender")
    expect(LENIS_IDENTITY).toContain("not a law firm")
  })

  it("does not guarantee outcomes", () => {
    expect(LENIS_IDENTITY).toContain("do not guarantee outcomes")
  })
})

// =========================================================================
// Brand Voice
// =========================================================================

describe("brand voice rules", () => {
  it("requires plain English", () => {
    expect(BRAND_VOICE_RULES).toContain("plain English")
  })

  it("prohibits guaranteed approval/savings/delivery promises", () => {
    expect(BRAND_VOICE_RULES).toContain("Never promise guaranteed approval")
    expect(BRAND_VOICE_RULES).toContain("guaranteed savings")
    expect(BRAND_VOICE_RULES).toContain("guaranteed delivery dates")
  })

  it("prohibits legal, tax, or financial guarantees", () => {
    expect(BRAND_VOICE_RULES).toContain("Never give legal, tax, or financial guarantees")
  })

  it("sets premium concierge tone", () => {
    expect(BRAND_VOICE_RULES).toContain("premium concierge")
  })
})

// =========================================================================
// Compliance Guardrails
// =========================================================================

describe("compliance guardrails", () => {
  it("includes no-guarantee disclosure", () => {
    expect(COMPLIANCE_GUARDRAILS).toContain("not a guarantee of approval or final terms")
  })

  it("includes no-legal-advice disclosure", () => {
    expect(COMPLIANCE_GUARDRAILS).toContain("not a lawyer")
    expect(COMPLIANCE_GUARDRAILS).toContain("consult a qualified attorney")
  })

  it("prohibits requesting sensitive data in chat", () => {
    expect(COMPLIANCE_GUARDRAILS).toContain("SSN")
    expect(COMPLIANCE_GUARDRAILS).toContain("credit card numbers")
    expect(COMPLIANCE_GUARDRAILS).toContain("login credentials")
  })

  it("instructs to warn if user shares sensitive data", () => {
    expect(COMPLIANCE_GUARDRAILS).toContain("immediately warn them")
    expect(COMPLIANCE_GUARDRAILS).toContain("secure verification/upload method")
  })

  it("prohibits fabricating data", () => {
    expect(COMPLIANCE_GUARDRAILS).toContain("Do not infer or fabricate")
  })
})

// =========================================================================
// Interaction Framework
// =========================================================================

describe("interaction framework", () => {
  it("includes required disclosures", () => {
    expect(INTERACTION_FRAMEWORK).toContain("concierge intermediary")
    expect(INTERACTION_FRAMEWORK).toContain("not a guarantee of approval or final terms")
    expect(INTERACTION_FRAMEWORK).toContain("not a lawyer")
  })

  it("includes fee explanation guidance", () => {
    expect(INTERACTION_FRAMEWORK).toContain("we aim to secure a strong offer through competition and transparency")
  })

  it("prohibits fabricating numbers", () => {
    expect(INTERACTION_FRAMEWORK).toContain("Never fabricate numbers")
  })
})

// =========================================================================
// Mode Prompts
// =========================================================================

describe("mode prompts", () => {
  it("public mode has correct header", () => {
    expect(MODE_PUBLIC).toContain('Chat with Lenis Concierge™')
  })

  it("public mode has auto-open greeting", () => {
    expect(MODE_PUBLIC).toContain("Hi, I'm Lenis Concierge")
  })

  it("buyer mode has correct header", () => {
    expect(MODE_BUYER).toContain("Lenis Concierge – Your Buying Assistant")
  })

  it("dealer mode has correct header", () => {
    expect(MODE_DEALER).toContain("Lenis Dealer Desk")
  })

  it("affiliate mode has correct header", () => {
    expect(MODE_AFFILIATE).toContain("Lenis Affiliate Desk")
  })

  it("admin mode has correct header", () => {
    expect(MODE_ADMIN).toContain("Lenis Ops (Admin AI)")
  })

  it("admin mode requires confirmation for sensitive actions", () => {
    expect(MODE_ADMIN).toContain("Sensitive actions require confirmation")
    expect(MODE_ADMIN).toContain("require explicit confirmation")
  })

  it("buyer mode has permission boundaries", () => {
    expect(MODE_BUYER).toContain("PERMISSION BOUNDARIES")
    expect(MODE_BUYER).toContain("Not allowed")
  })

  it("dealer mode has privacy boundaries", () => {
    expect(MODE_DEALER).toContain("PERMISSION BOUNDARIES")
    expect(MODE_DEALER).toContain("reveal buyer identity details")
  })

  it("affiliate mode has privacy boundaries", () => {
    expect(MODE_AFFILIATE).toContain("PERMISSION BOUNDARIES")
    expect(MODE_AFFILIATE).toContain("buyer private information")
  })
})

// =========================================================================
// Affordability Control Module
// =========================================================================

describe("affordability control module", () => {
  it("states AutoLenis is not a lender", () => {
    expect(AFFORDABILITY_CONTROL).toContain("AutoLenis is not a lender")
  })

  it("states AutoLenis does not issue loans", () => {
    expect(AFFORDABILITY_CONTROL).toContain("does not issue loans")
  })

  it("states AutoLenis does not guarantee approvals", () => {
    expect(AFFORDABILITY_CONTROL).toContain("does not guarantee approvals")
  })

  it("states AutoLenis connects buyers with dealers and lenders", () => {
    expect(AFFORDABILITY_CONTROL).toContain("connects buyers with dealers and lenders")
  })

  it("prohibits inventing APR, payments, loan terms, and approval odds", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Invent APR percentages")
    expect(AFFORDABILITY_CONTROL).toContain("Invent monthly payments")
    expect(AFFORDABILITY_CONTROL).toContain("Invent loan terms")
    expect(AFFORDABILITY_CONTROL).toContain("Invent approval odds")
  })

  it("prohibits fabricating lender names or offers", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Fabricate lender names or offers")
  })

  it("requires asking for inputs before calculating", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Target monthly payment range")
    expect(AFFORDABILITY_CONTROL).toContain("Down payment amount")
    expect(AFFORDABILITY_CONTROL).toContain("credit tier")
    expect(AFFORDABILITY_CONTROL).toContain("State")
    expect(AFFORDABILITY_CONTROL).toContain("ask before calculating")
  })

  it("references the estimateAffordability tool", () => {
    expect(AFFORDABILITY_CONTROL).toContain("estimateAffordability")
  })

  it("includes educational explanation template with five factors", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Purchase price")
    expect(AFFORDABILITY_CONTROL).toContain("Down payment")
    expect(AFFORDABILITY_CONTROL).toContain("Interest rate")
    expect(AFFORDABILITY_CONTROL).toContain("Loan term length")
    expect(AFFORDABILITY_CONTROL).toContain("Taxes and fees")
    expect(AFFORDABILITY_CONTROL).toContain("Longer terms lower monthly payments but increase total interest paid")
  })

  it("includes refusal template for demand-specific-number requests", () => {
    expect(AFFORDABILITY_CONTROL).toContain("I don't want to guess and give you inaccurate numbers")
  })

  it("includes educational template cleanliness instruction", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Keep it clean, professional, and educational")
  })

  it("includes system logic qualifier for soft inquiry", () => {
    expect(AFFORDABILITY_CONTROL).toContain("if that matches your system logic")
  })

  it("includes pre-qualification strict rules", () => {
    expect(AFFORDABILITY_CONTROL).toContain("soft inquiry")
    expect(AFFORDABILITY_CONTROL).toContain("does not guarantee approval")
    expect(AFFORDABILITY_CONTROL).toContain("conditional estimates")
    expect(AFFORDABILITY_CONTROL).toContain("lender underwriting")
  })

  it("includes hard safety check instructions", () => {
    expect(AFFORDABILITY_CONTROL).toContain("HARD SAFETY CHECK")
    expect(AFFORDABILITY_CONTROL).toContain("Did I invent numbers")
    expect(AFFORDABILITY_CONTROL).toContain("Did I imply approval")
    expect(AFFORDABILITY_CONTROL).toContain("Did I guarantee rate")
    expect(AFFORDABILITY_CONTROL).toContain("Did I state AutoLenis is a lender")
  })

  it("includes escalation logic", () => {
    expect(AFFORDABILITY_CONTROL).toContain("ESCALATION LOGIC")
    expect(AFFORDABILITY_CONTROL).toContain("Run affordability estimate")
    expect(AFFORDABILITY_CONTROL).toContain("Start pre-qualification")
    expect(AFFORDABILITY_CONTROL).toContain("Submit vehicle request")
  })

  it("requires final offers disclaimer when calculator is used", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Final offers depend on lender approval")
  })

  it("enforces tone rules", () => {
    expect(AFFORDABILITY_CONTROL).toContain("Confident")
    expect(AFFORDABILITY_CONTROL).toContain("Transparent")
    expect(AFFORDABILITY_CONTROL).toContain("Educational")
    expect(AFFORDABILITY_CONTROL).toContain("Pushy")
    expect(AFFORDABILITY_CONTROL).toContain("Salesy")
    expect(AFFORDABILITY_CONTROL).toContain("Over-promising")
  })
})

// =========================================================================
// getModePrompt
// =========================================================================

describe("getModePrompt", () => {
  it("returns public mode for 'public' role", () => {
    expect(getModePrompt("public")).toBe(MODE_PUBLIC)
  })

  it("returns buyer mode for 'buyer' role", () => {
    expect(getModePrompt("buyer")).toBe(MODE_BUYER)
  })

  it("returns dealer mode for 'dealer' role", () => {
    expect(getModePrompt("dealer")).toBe(MODE_DEALER)
  })

  it("returns affiliate mode for 'affiliate' role", () => {
    expect(getModePrompt("affiliate")).toBe(MODE_AFFILIATE)
  })

  it("returns admin mode for 'admin' role", () => {
    expect(getModePrompt("admin")).toBe(MODE_ADMIN)
  })
})

// =========================================================================
// buildFullSystemPrompt
// =========================================================================

describe("buildFullSystemPrompt", () => {
  it("includes identity section", () => {
    const prompt = buildFullSystemPrompt("public", "Agent instructions here")
    expect(prompt).toContain("Lenis Concierge™")
    expect(prompt).toContain("AI-Powered Car Buying Assistant")
  })

  it("includes brand voice rules", () => {
    const prompt = buildFullSystemPrompt("buyer", "Agent instructions here")
    expect(prompt).toContain("BRAND VOICE RULES")
    expect(prompt).toContain("premium concierge")
  })

  it("includes compliance guardrails", () => {
    const prompt = buildFullSystemPrompt("dealer", "Agent instructions here")
    expect(prompt).toContain("NO GUARANTEES")
    expect(prompt).toContain("NO LEGAL ADVICE")
    expect(prompt).toContain("PRIVACY & SENSITIVE DATA")
  })

  it("includes affordability control module", () => {
    const prompt = buildFullSystemPrompt("buyer", "Agent instructions here")
    expect(prompt).toContain("AFFORDABILITY CONTROL MODULE")
    expect(prompt).toContain("AutoLenis is not a lender")
    expect(prompt).toContain("ZERO-HALLUCINATION RULE")
  })

  it("includes interaction framework", () => {
    const prompt = buildFullSystemPrompt("admin", "Agent instructions here")
    expect(prompt).toContain("INTERACTION FRAMEWORK")
    expect(prompt).toContain("REQUIRED DISCLOSURES")
  })

  it("includes role-specific mode prompt", () => {
    const buyerPrompt = buildFullSystemPrompt("buyer", "Agent instructions here")
    expect(buyerPrompt).toContain("Buyer Dashboard")

    const adminPrompt = buildFullSystemPrompt("admin", "Agent instructions here")
    expect(adminPrompt).toContain("Admin Dashboard")
  })

  it("includes agent-specific instructions at the end", () => {
    const agentInstructions = "Custom agent instructions for testing"
    const prompt = buildFullSystemPrompt("public", agentInstructions)
    expect(prompt).toContain("AGENT-SPECIFIC INSTRUCTIONS")
    expect(prompt).toContain(agentInstructions)
  })

  it("assembles all sections in correct order", () => {
    const prompt = buildFullSystemPrompt("public", "Agent instructions")
    const identityIdx = prompt.indexOf("Lenis Concierge™")
    const brandIdx = prompt.indexOf("BRAND VOICE RULES")
    const complianceIdx = prompt.indexOf("SAFETY, COMPLIANCE")
    const affordabilityIdx = prompt.indexOf("AFFORDABILITY CONTROL MODULE")
    const brevityIdx = prompt.indexOf("BREVITY & PRECISION POLICY")
    const frameworkIdx = prompt.indexOf("INTERACTION FRAMEWORK")
    const modeIdx = prompt.indexOf("OPERATING MODE")
    const agentIdx = prompt.indexOf("AGENT-SPECIFIC INSTRUCTIONS")

    expect(identityIdx).toBeLessThan(brandIdx)
    expect(brandIdx).toBeLessThan(complianceIdx)
    expect(complianceIdx).toBeLessThan(affordabilityIdx)
    expect(affordabilityIdx).toBeLessThan(brevityIdx)
    expect(brevityIdx).toBeLessThan(frameworkIdx)
    expect(frameworkIdx).toBeLessThan(modeIdx)
    expect(modeIdx).toBeLessThan(agentIdx)
  })
})
