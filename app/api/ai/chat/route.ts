/**
 * AI Chat API Route — lightweight local handler for ALL portals.
 *
 * Uses the deterministic chatbot FAQ engine instead of an external AI provider.
 * Responds with a structured envelope compatible with existing consumers
 * (admin AI panel, ConciergeDock).
 *
 * Returns:
 *   Streaming:     SSE events { type: "metadata"|"chunk"|"done" }
 *   Non-streaming: { ok: true, conversationId, reply, agent, intent }
 *   Error:         { ok: false, error: { code, userMessage, debugId } }
 */

import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth-server"
import { processMessage } from "@/lib/chatbot/faq"
import {
  generateDebugId,
  buildErrorResponse,
} from "@/lib/ai/error-classifier"
import { isAIDisabled } from "@/lib/ai/kill-switch"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ChatRequestBody {
  conversationId: string
  message: string
  adminOverride?: boolean
  stream?: boolean
  clientTraceId?: string
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

    const { conversationId, message, adminOverride, stream = true } = body

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

    // Process message with the local FAQ engine
    const result = processMessage(message.trim())

    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          // Metadata event
          const metadata = {
            type: "metadata",
            conversationId,
            agent: "LenisConcierge",
            intent: result.intentId ?? "general",
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
        },
      })
    }

    return Response.json({
      ok: true,
      reply: result.reply,
      conversationId,
      agent: "LenisConcierge",
      intent: result.intentId ?? "general",
      riskLevel: "low",
      disclosure: null,
      debugId,
    })
  } catch (error) {
    console.error("[AI Chat Error] debugId=%s", debugId, error)
    return buildErrorResponse("INTERNAL_ERROR", debugId)
  }
}
