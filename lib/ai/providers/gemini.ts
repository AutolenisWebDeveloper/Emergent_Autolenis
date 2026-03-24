/**
 * Gemini Provider — server-side integration with Google Generative AI.
 *
 * Reads GEMINI_API_KEY from environment. Supports:
 *  - Chat completions with system prompts
 *  - Structured tool/function calling
 *  - Timeout + retry with exponential backoff
 *  - CorrelationId-based logging
 *
 * When GEMINI_API_KEY is not set, falls back to a deterministic
 * response that clearly states the AI is unavailable — never fakes
 * an AI response.
 */

import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  type Content,
  type Part,
  type FunctionDeclarationSchema,
  SchemaType,
} from "@google/generative-ai"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeminiToolDeclaration {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface GeminiMessage {
  role: "user" | "model"
  content: string
}

export interface GeminiToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface GeminiResponse {
  text: string
  toolCalls: GeminiToolCall[]
  finishReason: string
  correlationId: string
  latencyMs: number
  fromFallback: boolean
}

export interface CallGeminiOptions {
  system: string
  messages: GeminiMessage[]
  tools?: GeminiToolDeclaration[]
  correlationId?: string
  maxRetries?: number
  timeoutMs?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCorrelationId(): string {
  return `gem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Map simple type strings to Gemini SchemaType enum. */
function toSchemaType(t: string): SchemaType {
  switch (t.toLowerCase()) {
    case "string":
      return SchemaType.STRING
    case "number":
    case "integer":
      return SchemaType.NUMBER
    case "boolean":
      return SchemaType.BOOLEAN
    case "array":
      return SchemaType.ARRAY
    case "object":
      return SchemaType.OBJECT
    default:
      return SchemaType.STRING
  }
}

function toFunctionDeclarations(tools: GeminiToolDeclaration[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([k, v]) => [
          k,
          { type: toSchemaType(v.type), description: v.description },
        ]),
      ),
      required: t.parameters.required,
    } as FunctionDeclarationSchema,
  }))
}

function toContents(messages: GeminiMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: m.content } as Part],
  }))
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI | null {
  if (_client) return _client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn("[Gemini] GEMINI_API_KEY is not configured — AI assistant will use fallback responses")
    return null
  }
  _client = new GoogleGenerativeAI(apiKey)
  return _client
}

/** Check if Gemini is available (API key configured). */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY
}

// ---------------------------------------------------------------------------
// Main call
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "gemini-2.0-flash"
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2

/**
 * Call Gemini with system prompt, message history, and optional tool declarations.
 *
 * Returns parsed text + any tool calls the model wants to invoke.
 * If GEMINI_API_KEY is not configured, returns a clear fallback message.
 */
export async function callGemini(opts: CallGeminiOptions): Promise<GeminiResponse> {
  const correlationId = opts.correlationId ?? generateCorrelationId()
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
  const start = Date.now()

  const client = getClient()
  if (!client) {
    return {
      text: "I'm sorry — the AI assistant is currently unavailable. Please try again later or contact support directly.",
      toolCalls: [],
      finishReason: "FALLBACK",
      correlationId,
      latencyMs: Date.now() - start,
      fromFallback: true,
    }
  }

  // Build model config
  const tools = opts.tools && opts.tools.length > 0
    ? [{ functionDeclarations: toFunctionDeclarations(opts.tools) }]
    : undefined

  const model = client.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: opts.system,
    ...(tools ? { tools } : {}),
  })

  const contents = toContents(opts.messages)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result: GenerateContentResult = await withTimeout(
        model.generateContent({ contents }),
        timeoutMs,
      )

      const response = result.response
      const candidate = response.candidates?.[0]
      const finishReason = candidate?.finishReason ?? "UNKNOWN"

      // Extract text parts
      const textParts = candidate?.content?.parts?.filter((p: Part) => "text" in p) ?? []
      const text = textParts.map((p: Part) => (p as { text: string }).text).join("")

      // Extract function calls
      const toolCalls: GeminiToolCall[] = []
      const fcParts = candidate?.content?.parts?.filter((p: Part) => "functionCall" in p) ?? []
      for (const p of fcParts) {
        const fc = (p as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall
        if (fc) {
          toolCalls.push({ name: fc.name, arguments: fc.args ?? {} })
        }
      }

      return {
        text: text || (toolCalls.length > 0 ? "" : "I couldn't generate a response. Please try rephrasing."),
        toolCalls,
        finishReason: String(finishReason),
        correlationId,
        latencyMs: Date.now() - start,
        fromFallback: false,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Exponential backoff before retry
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500))
      }
    }
  }

  // All retries exhausted
  console.error(`[Gemini] All ${maxRetries + 1} attempts failed for ${correlationId}:`, lastError?.message)
  return {
    text: "I'm sorry — the AI assistant encountered an error. Please try again shortly.",
    toolCalls: [],
    finishReason: "ERROR",
    correlationId,
    latencyMs: Date.now() - start,
    fromFallback: true,
  }
}
