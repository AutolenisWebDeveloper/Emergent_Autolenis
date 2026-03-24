/**
 * Router – deterministic agent routing by role and intent.
 *
 * Primary path: Gemini-based classification (via gemini-client).
 * Fallback: keyword-based deterministic classifier.
 *
 * Primary routing is by viewer role; intent-based overrides are applied
 * when the classified intent matches a specialised domain (SEO, contract).
 * High-risk intents trigger a disclosure template.
 */

import type { AIRole } from "./context-builder"
import { salesAgent } from "./agents/sales.agent"
import { buyerConciergeAgent } from "./agents/buyer-concierge.agent"
import { dealerLiaisonAgent } from "./agents/dealer-liaison.agent"
import { affiliateGrowthAgent } from "./agents/affiliate-growth.agent"
import { adminOpsAgent } from "./agents/admin-ops.agent"
import { seoAgent } from "./agents/seo.agent"
import { contractAgent } from "./agents/contract.agent"
import { classifyWithGemini, type GeminiClassification } from "./gemini-client"
import { matchIntent } from "./faq"

/** Minimal agent shape consumed by the orchestrator. */
export interface AgentSpec {
  name: string
  systemPrompt: string
  allowedTools: readonly string[]
  restrictedClaims: readonly string[]
  requiredDisclosures: readonly string[]
}

export type RiskLevel = "low" | "medium" | "high"

export interface ClassifiedIntent {
  intent: string
  domain: string
  riskLevel: RiskLevel
}

/** Full classification schema returned in API responses. */
export interface ClassificationSchema {
  agent: string
  intent: string
  risk_level: RiskLevel
  requires_confirmation: boolean
  tool_plan: Array<{ tool: string; args: Record<string, unknown> }>
}

// ---------------------------------------------------------------------------
// Intent classification (keyword-based; can be upgraded to Gemini classification)
// ---------------------------------------------------------------------------

const HIGH_RISK_KEYWORDS = [
  "guarantee", "promise", "legal", "sue", "lawsuit", "attorney",
  "binding", "liability", "credit score", "approval guarantee",
]

const SEO_KEYWORDS = ["seo", "blog", "meta", "keyword", "schema", "sitemap", "internal link"]
const CONTRACT_KEYWORDS = ["contract", "clause", "fee breakdown", "hidden fee", "markup", "addendum"]

export function classifyIntent(message: string): ClassifiedIntent {
  const lower = message.toLowerCase()

  const isHighRisk = HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw))

  if (SEO_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { intent: "seo", domain: "marketing", riskLevel: isHighRisk ? "high" : "low" }
  }

  if (CONTRACT_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { intent: "contract_review", domain: "legal", riskLevel: isHighRisk ? "high" : "medium" }
  }

  // FAQ intent matching — surface buyer FAQ intents for structured responses
  const faqMatch = matchIntent(message)
  if (faqMatch && faqMatch.confidence >= 0.5) {
    return {
      intent: `buyer_faq:${faqMatch.intentId}`,
      domain: "buyer_faq",
      riskLevel: isHighRisk ? "high" : "low",
    }
  }

  return {
    intent: "general",
    domain: "platform",
    riskLevel: isHighRisk ? "high" : "low",
  }
}

// ---------------------------------------------------------------------------
// Agent routing
// ---------------------------------------------------------------------------

const AGENT_MAP: Record<string, AgentSpec> = {
  SalesAgent: salesAgent,
  BuyerConciergeAgent: buyerConciergeAgent,
  DealerLiaisonAgent: dealerLiaisonAgent,
  AffiliateGrowthAgent: affiliateGrowthAgent,
  AdminOpsAgent: adminOpsAgent,
  SEOAgent: seoAgent,
  ContractAgent: contractAgent,
}

/** Resolve the primary agent for a given role. */
function agentForRole(role: AIRole): AgentSpec {
  switch (role) {
    case "buyer":
      return buyerConciergeAgent
    case "dealer":
      return dealerLiaisonAgent
    case "affiliate":
      return affiliateGrowthAgent
    case "admin":
      return adminOpsAgent
    case "public":
    default:
      return salesAgent
  }
}

/** Apply intent-based overrides (only for admin since SEO/contract tools are admin-gated). */
function intentOverride(intent: string, role: AIRole): AgentSpec | null {
  if (intent === "seo" && role === "admin") return seoAgent
  if (intent === "contract_review" && (role === "buyer" || role === "admin")) return contractAgent
  return null
}

export const FINANCIAL_LEGAL_DISCLOSURE =
  "⚠️ Important: AutoLenis does not provide financial or legal advice. " +
  "The information shared is for general guidance only. " +
  "Please consult a licensed professional for specific financial or legal questions."

export interface RoutingResult {
  agent: AgentSpec
  classified: ClassifiedIntent
  classificationSchema: ClassificationSchema
  disclosure: string | null
}

/**
 * Build a ClassificationSchema from deterministic routing results.
 */
function buildClassificationSchema(
  agent: AgentSpec,
  classified: ClassifiedIntent,
): ClassificationSchema {
  return {
    agent: agent.name,
    intent: classified.intent,
    risk_level: classified.riskLevel,
    requires_confirmation: classified.riskLevel === "high",
    tool_plan: [],
  }
}

/**
 * Route a user message to the appropriate specialist agent.
 * Attempts Gemini classification first, falls back to keyword-based.
 *
 * @param role    - The viewer's AI role.
 * @param message - The raw user message.
 */
export async function routeToAgent(role: AIRole, message: string): Promise<RoutingResult> {
  // Attempt Gemini-based classification first
  let geminiResult: GeminiClassification | null = null
  try {
    geminiResult = await classifyWithGemini(message, role)
  } catch {
    // Gemini unavailable; use fallback
  }

  let agent: AgentSpec
  let classified: ClassifiedIntent
  let classificationSchema: ClassificationSchema

  if (geminiResult && AGENT_MAP[geminiResult.agent]) {
    // Use Gemini classification
    agent = AGENT_MAP[geminiResult.agent]
    classified = {
      intent: geminiResult.intent,
      domain: geminiResult.agent.includes("SEO") ? "marketing" : geminiResult.agent.includes("Contract") ? "legal" : "platform",
      riskLevel: geminiResult.risk_level,
    }
    classificationSchema = {
      agent: geminiResult.agent,
      intent: geminiResult.intent,
      risk_level: geminiResult.risk_level,
      requires_confirmation: geminiResult.requires_confirmation,
      tool_plan: geminiResult.tool_plan ?? [],
    }
  } else {
    // Deterministic fallback
    classified = classifyIntent(message)
    const override = intentOverride(classified.intent, role)
    agent = override ?? agentForRole(role)
    classificationSchema = buildClassificationSchema(agent, classified)
  }

  // High-risk disclosure
  const disclosure = classified.riskLevel === "high" ? FINANCIAL_LEGAL_DISCLOSURE : null

  return { agent, classified, classificationSchema, disclosure }
}

/**
 * Synchronous deterministic routing (no Gemini call).
 * Used by tests and as the internal fallback path.
 */
export function routeToAgentSync(role: AIRole, message: string): RoutingResult {
  const classified = classifyIntent(message)
  const override = intentOverride(classified.intent, role)
  const agent = override ?? agentForRole(role)
  const disclosure = classified.riskLevel === "high" ? FINANCIAL_LEGAL_DISCLOSURE : null
  const classificationSchema = buildClassificationSchema(agent, classified)
  return { agent, classified, classificationSchema, disclosure }
}
