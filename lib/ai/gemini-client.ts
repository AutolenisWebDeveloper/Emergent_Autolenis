/**
 * Gemini Client – server-side wrapper for the Google Generative AI SDK.
 *
 * All Gemini calls go through this module so that:
 *  1. API keys never leak to the client bundle.
 *  2. The kill-switch (`AI_ACTIONS_DISABLED`) is respected globally.
 *  3. A deterministic fallback response is produced when Gemini is unavailable.
 */

import { GoogleGenerativeAI, type GenerativeModel, type Content } from "@google/generative-ai"
import { buildFullSystemPrompt } from "./prompts/system-prompt"
import type { AIRole } from "./context-builder"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ""
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"

/** Global kill-switch – when truthy, AI responses are disabled. */
export function isAIDisabled(): boolean {
  const flag = process.env.AI_ACTIONS_DISABLED
  return flag === "true" || flag === "1"
}

// ---------------------------------------------------------------------------
// Singleton model instance (lazy)
// ---------------------------------------------------------------------------

let _genAI: GoogleGenerativeAI | null = null
let _model: GenerativeModel | null = null

function getModel(): GenerativeModel | null {
  if (!GEMINI_API_KEY) return null
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  if (!_model) {
    _model = _genAI.getGenerativeModel({ model: GEMINI_MODEL })
  }
  return _model
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export interface GeminiClassification {
  agent: string
  intent: string
  risk_level: "low" | "medium" | "high"
  requires_confirmation: boolean
  tool_plan: Array<{ tool: string; args: Record<string, unknown> }>
}

const CLASSIFICATION_SYSTEM = `You are an intent classifier for AutoLenis, a car-buying concierge platform.

Given a user message and their role, output ONLY a JSON object with these fields:
{
  "agent": one of "SalesAgent","BuyerConciergeAgent","DealerLiaisonAgent","AffiliateGrowthAgent","AdminOpsAgent","SEOAgent","ContractAgent",
  "intent": a short intent label,
  "risk_level": "low"|"medium"|"high",
  "requires_confirmation": boolean (true for high-risk actions like payments, data deletion, user disabling),
  "tool_plan": array of {tool, args} objects to execute (empty if no tool needed)
}

Rules:
- Public/anonymous users → SalesAgent
- Buyers → BuyerConciergeAgent (override to ContractAgent for contract questions)
- Dealers → DealerLiaisonAgent
- Affiliates → AffiliateGrowthAgent
- Admins → AdminOpsAgent (override to SEOAgent for SEO topics, ContractAgent for contract review)
- Mark risk_level "high" for legal, guarantee, liability, credit score topics
- Mark requires_confirmation true for admin writes, payment actions, user disabling

Return ONLY valid JSON, no markdown fences, no explanation.`

/**
 * Classify user intent via Gemini. Returns null if Gemini is unavailable.
 */
export async function classifyWithGemini(
  message: string,
  role: string,
): Promise<GeminiClassification | null> {
  if (isAIDisabled()) return null
  const model = getModel()
  if (!model) return null

  try {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${CLASSIFICATION_SYSTEM}\n\nUser role: ${role}\nUser message: ${message}` }] },
      ],
    })
    const text = result.response.text().trim()
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
    return JSON.parse(cleaned) as GeminiClassification
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Chat completion
// ---------------------------------------------------------------------------

export interface GeminiChatOptions {
  systemPrompt: string
  history: Content[]
  message: string
  /** Viewer role — used to prepend the Lenis Concierge™ master prompt + mode instructions. */
  role?: AIRole
}

/**
 * Generate a chat response from Gemini.
 * Returns the text reply, or null if Gemini is unavailable.
 */
export async function chatWithGemini(options: GeminiChatOptions): Promise<string | null> {
  if (isAIDisabled()) return null
  const model = getModel()
  if (!model) return null

  try {
    const fullPrompt = options.role
      ? buildFullSystemPrompt(options.role, options.systemPrompt)
      : options.systemPrompt
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `System instructions: ${fullPrompt}` }] },
        { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
        ...options.history,
      ],
    })
    const result = await chat.sendMessage(options.message)
    return result.response.text()
  } catch {
    return null
  }
}

/**
 * Stream a chat response from Gemini.
 * Returns an async generator that yields text chunks.
 */
export async function* streamChatWithGemini(options: GeminiChatOptions): AsyncGenerator<string> {
  if (isAIDisabled()) {
    yield fallbackResponse("", null)
    return
  }
  const model = getModel()
  if (!model) {
    yield fallbackResponse("", null)
    return
  }

  try {
    const fullPrompt = options.role
      ? buildFullSystemPrompt(options.role, options.systemPrompt)
      : options.systemPrompt
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `System instructions: ${fullPrompt}` }] },
        { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
        ...options.history,
      ],
    })
    const result = await chat.sendMessageStream(options.message)
    
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield text
      }
    }
  } catch (error) {
    console.error("[Gemini Stream Error]:", error)
    yield fallbackResponse("", null)
  }
}

// ---------------------------------------------------------------------------
// Fallback response (used when Gemini is disabled or unavailable)
// ---------------------------------------------------------------------------

export function fallbackResponse(agent: string, disclosure: string | null): string {
  const base =
    "I'm the AutoLenis assistant. Our AI service is temporarily limited. " +
    "Please try again shortly, or contact us at info@autolenis.com for immediate help."
  return disclosure ? `${disclosure}\n\n${base}` : base
}

// ---------------------------------------------------------------------------
// Per-user AI disable (stub implementation - can be wired to database)
// ---------------------------------------------------------------------------

/**
 * Check if AI has been disabled for a specific user.
 * Currently a stub implementation that always returns false.
 * Can be extended to check a database flag or admin configuration.
 * 
 * @param userId - The user ID to check (will be used in future implementation)
 */
export function isAIDisabledForUser(userId: string | null): boolean {
  // TODO: Wire to database or admin configuration table
  // Example: return await prisma.user.findUnique({ where: { id: userId } })?.aiDisabled
  // For now, return false to allow AI for all users
  void userId // Explicitly mark as intentionally unused for now
  return false
}
