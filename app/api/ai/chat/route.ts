/**
 * AI Chat API Route — single gateway for ALL portals.
 *
 * Handles chat requests from the chat widget and admin AI panel.
 * Uses the orchestrator to route messages to the appropriate AI agent
 * based on user role and intent.
 *
 * Returns a structured envelope:
 *   Success (streaming): SSE events { type: "metadata"|"chunk"|"done" }
 *   Success (non-streaming): { ok: true, conversationId, message, agent }
 *   Error: { ok: false, error: { code, userMessage, debugId } }
 */

import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth-server"
import { orchestrate } from "@/lib/ai/orchestrator"
import { streamChatWithGemini, fallbackResponse, isAIDisabled } from "@/lib/ai/gemini-client"
import {
  generateDebugId,
  classifyError,
  buildErrorResponse,
  buildStreamErrorEvent,
} from "@/lib/ai/error-classifier"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Request timeout for orchestration + streaming (ms). */
const ORCHESTRATE_TIMEOUT_MS = 30_000

interface ChatRequestBody {
  conversationId: string
  message: string
  adminOverride?: boolean
  stream?: boolean
  clientTraceId?: string
}

export async function POST(request: NextRequest) {
  // Extract correlation IDs early
  const clientTraceId =
    request.headers.get("x-trace-id") || undefined
  let debugId = generateDebugId(clientTraceId)

  try {
    // Parse request body
    let body: ChatRequestBody
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "Invalid JSON in request body.")
    }

    const { conversationId, message, adminOverride, stream = true } = body

    // Allow body-level trace ID to override header
    if (body.clientTraceId) {
      debugId = generateDebugId(body.clientTraceId)
    }

    // Validate input
    if (!conversationId || typeof conversationId !== "string") {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "conversationId is required.")
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return buildErrorResponse("VALIDATION_ERROR", debugId, "message is required.")
    }

    // Kill switch check (fail fast)
    if (isAIDisabled()) {
      console.warn("[AI Chat] Kill switch active. debugId=%s", debugId)
      return buildErrorResponse("AI_DISABLED", debugId)
    }

    // Get session (can be null for anonymous/public users)
    const session = await getSession()

    // If admin override, send manual reply (admin takeover mode)
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

    // Orchestrate with timeout
    const orchestratePromise = orchestrate({
      conversationId,
      message: message.trim(),
      session,
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Orchestration timed out")), ORCHESTRATE_TIMEOUT_MS),
    )

    const result = await Promise.race([orchestratePromise, timeoutPromise])

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send metadata first
            const metadata = {
              type: "metadata",
              conversationId,
              agent: result.agent,
              intent: result.intent,
              riskLevel: result.riskLevel,
              disclosure: result.disclosure,
              debugId,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))

            // Stream the AI response
            const history = result.memoryContext.messages.map((msg) => ({
              role: msg.sender === "user" ? ("user" as const) : ("model" as const),
              parts: [{ text: msg.content }],
            }))

            for await (const chunk of streamChatWithGemini({
              systemPrompt: result.systemPrompt,
              history,
              message: message.trim(),
              role: result.role,
            })) {
              const data = { type: "chunk", content: chunk }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            // Done signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
            controller.close()
          } catch (streamErr) {
            console.error("[AI Stream Error] debugId=%s", debugId, streamErr)
            const code = classifyError(streamErr)
            controller.enqueue(encoder.encode(buildStreamErrorEvent(code, debugId)))
            controller.close()
          }
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

    // Non-streaming fallback
    const reply = fallbackResponse(result.agent, result.disclosure)
    return Response.json({
      ok: true,
      reply,
      conversationId,
      agent: result.agent,
      intent: result.intent,
      riskLevel: result.riskLevel,
      disclosure: result.disclosure,
      debugId,
    })
  } catch (error) {
    const code = classifyError(error)
    console.error("[AI Chat Error] code=%s debugId=%s", code, debugId, error)
    return buildErrorResponse(code, debugId)
  }
}
