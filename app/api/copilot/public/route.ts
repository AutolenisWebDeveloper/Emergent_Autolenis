/**
 * Public Copilot API Route
 *
 * - No authentication required
 * - Rate limited: 20 requests / minute per IP
 * - No internal API calls — pure knowledge-based responses
 * - No action tools or confirmation dialogs
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { runPublicOrchestrator } from "@/lib/copilot/public/orchestrator"
import type { CopilotContext } from "@/lib/copilot/shared/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const RequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.object({
    variant: z.literal("public"),
    role: z.literal("anonymous"),
    route: z.string().max(200),
    sessionId: z.string().max(128),
    isTestWorkspace: z.boolean().optional(),
  }),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
        timestamp: z.number(),
      }),
    )
    .max(20)
    .optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 req/min per IP
  const rateLimitResponse = await rateLimit(request, {
    maxRequests: 20,
    windowMs: 60_000,
  })
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 },
    )
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request.", details: parsed.error.flatten() } },
      { status: 400 },
    )
  }

  const { message, context: rawContext } = parsed.data

  const context: CopilotContext = {
    variant: "public",
    role: "anonymous",
    route: rawContext.route,
    sessionId: rawContext.sessionId,
    isTestWorkspace: rawContext.isTestWorkspace,
  }

  const response = runPublicOrchestrator(message, context)

  return NextResponse.json({ ok: true, response })
}
