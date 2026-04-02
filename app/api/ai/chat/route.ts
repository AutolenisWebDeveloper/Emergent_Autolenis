/**
 * AI Chat API Route — hybrid FAQ + LLM handler for ALL portals.
 *
 * Uses hybridChat(): FAQ fast-path (0ms, $0) → Groq LLM fallback → compliance scrub.
 * Gracefully degrades to FAQ-only when GROQ_API_KEY is absent or kill switch is active.
 *
 * Returns:
 *   Streaming:     SSE events { type: "metadata"|"chunk"|"done" }
 *   Non-streaming: { ok: true, conversationId, reply, agent, intent }
 *   Error:         { ok: false, error: { code, userMessage, debugId } }
 *
 * Observability header: x-copilot-source: "faq" | "llm"
 */

import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth-server"
import {
  generateDebugId,
  buildErrorResponse,
} from "@/lib/ai/error-classifier"
import { isAIDisabled } from "@/lib/ai/kill-switch"
import { hybridChat } from "@/lib/ai/hybrid-chat"
import type { CopilotContext } from "@/lib/copilot/shared/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ChatRequestBody {
  conversationId: string
  message: string
  adminOverride?: boolean
  stream?: boolean
  clientTraceId?: string
  variant?: CopilotContext["variant"]
  route?: string
}

export async function POST(request: NextRequest) {
  const clientTraceId =
    request.headers.get("x-trace-id") || undefined
  let debugId = generateDebugId(clientTraceId)

  try {
    let body: ChatRequestBody
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "Invalid JSON in request body.")
    }

    const { conversationId, message, adminOverride, stream = true, variant = "public", route } = body

    if (body.clientTraceId) {
      debugId = generateDebugId(body.clientTraceId)
    }

    if (!conversationId || typeof conversationId !== "string") {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "conversationId is required.")
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "message is required.")
    }

    if (isAIDisabled()) {
      console.warn("[AI Chat] Kill switch active. debugId=%s", debugId)
      return buildErrorResponse("AI_DISABLED", debugId)
    }

    const session = await getSession()

    if (adminOverride) {
      if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
        return buildErrorResponse("FORBIDDEN", debugId, "Admin override requires admin privileges.")
      }
      return Response.json({
        ok: true,
        reply: "Message sent successfully (admin override mode)",
        conversationId,
        agent: "admin",
        debugId,
      })
    }

    const VALID_USER_ROLES: CopilotContext["role"][] = ["anonymous", "buyer", "dealer", "affiliate", "admin"]

    // Build a minimal context for the hybrid chat engine
    // Map session role to a valid CopilotContext UserRole
    const rawRole = session?.role?.toLowerCase() ?? "anonymous"
    const mappedRole = (VALID_USER_ROLES.includes(rawRole as CopilotContext["role"])
      ? rawRole
      : "anonymous") as CopilotContext["role"]

    const context: CopilotContext = {
      variant,
      role: mappedRole,
      route: route ?? "/",
      sessionId: conversationId,
    }

    // Run hybrid chat: FAQ fast-path → LLM fallback → compliance scrub
    const result = await hybridChat({
      message: message.trim(),
      variant,
      context,
      route: route ?? "/",
    })

    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Metadata event
          const metadata = {
            type: "metadata",
            conversationId,
            agent: "LenisConcierge",
            intent: result.intent ?? "general",
            source: result.source,
            riskLevel: "low",
            disclosure: null,
            debugId,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))

          // Send the full reply as a single chunk
          const chunk = { type: "chunk", content: result.reply }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))

          // Done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "x-copilot-source": result.source,
        },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reply: result.reply,
        conversationId,
        agent: "LenisConcierge",
        intent: result.intent ?? "general",
        source: result.source,
        riskLevel: "low",
        disclosure: null,
        debugId,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "x-copilot-source": result.source,
        },
      },
    )
  } catch (error) {
    console.error("[AI Chat Error] debugId=%s", debugId, error)
    return buildErrorResponse("INTERNAL_ERROR", debugId)
  }
}
