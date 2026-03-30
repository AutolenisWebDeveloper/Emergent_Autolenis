/**
 * Affiliate Copilot API Route
 *
 * - Requires affiliate JWT (AFFILIATE or AFFILIATE_ONLY role)
 * - Rate limited: 30 req/min per userId
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { getSessionUser } from "@/lib/auth-server"
import { runAffiliateOrchestrator } from "@/lib/copilot/affiliate/orchestrator"
import type { CopilotContext } from "@/lib/copilot/shared/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
  timestamp: z.number(),
})

const ConfirmedToolSchema = z.object({
  toolName: z.string().max(64),
  toolArgs: z.record(z.union([z.string(), z.number(), z.boolean()])),
})

const RequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.object({
    variant: z.literal("affiliate"),
    route: z.string().max(200),
    sessionId: z.string().max(128),
    isTestWorkspace: z.boolean().optional(),
  }),
  history: z.array(ConversationTurnSchema).max(20).optional(),
  confirmedTool: ConfirmedToolSchema.optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    )
  }
  if (session.role !== "AFFILIATE" && session.role !== "AFFILIATE_ONLY") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Affiliate access required." } },
      { status: 403 },
    )
  }

  const rateLimitResponse = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60_000,
    keyGenerator: () => `copilot:affiliate:${session.userId}`,
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

  const { message, context: rawContext, history, confirmedTool } = parsed.data

  const context: CopilotContext = {
    variant: "affiliate",
    role: "affiliate",
    route: rawContext.route,
    sessionId: rawContext.sessionId,
    isTestWorkspace: rawContext.isTestWorkspace,
    userId: session.userId,
  }

  const cookieHeader = request.headers.get("cookie") ?? ""
  const sessionToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.replace("session=", "") ?? ""

  try {
    const response = await runAffiliateOrchestrator(
      { message, context, history: history ?? [], confirmedTool },
      sessionToken,
    )
    return NextResponse.json({ ok: true, response })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong."
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 })
  }
}
