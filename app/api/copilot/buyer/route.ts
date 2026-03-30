/**
 * Buyer Copilot API Route
 *
 * - Requires buyer JWT (lib/auth.ts)
 * - Rate limited: 30 req/min per userId
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { getSessionUser } from "@/lib/auth-server"
import { runBuyerOrchestrator } from "@/lib/copilot/buyer/orchestrator"
import type { CopilotContext } from "@/lib/copilot/shared/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DealStageEnum = z.enum([
  "SELECTED",
  "FINANCING_PENDING",
  "FINANCING_APPROVED",
  "FEE_PENDING",
  "FEE_PAID",
  "INSURANCE_PENDING",
  "INSURANCE_COMPLETE",
  "CONTRACT_PENDING",
  "CONTRACT_REVIEW",
  "CONTRACT_MANUAL_REVIEW_REQUIRED",
  "CONTRACT_INTERNAL_FIX_IN_PROGRESS",
  "CONTRACT_ADMIN_OVERRIDE_APPROVED",
  "CONTRACT_APPROVED",
  "SIGNING_PENDING",
  "SIGNED",
  "PICKUP_SCHEDULED",
  "COMPLETED",
  "CANCELLED",
])

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
    variant: z.literal("buyer"),
    route: z.string().max(200),
    sessionId: z.string().max(128),
    isTestWorkspace: z.boolean().optional(),
    dealId: z.string().max(128).optional(),
    dealStage: DealStageEnum.optional(),
  }),
  history: z.array(ConversationTurnSchema).max(20).optional(),
  confirmedTool: ConfirmedToolSchema.optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    )
  }
  if (session.role !== "BUYER") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Buyer access required." } },
      { status: 403 },
    )
  }

  // Rate limit per userId
  const rateLimitResponse = await rateLimit(request, {
    maxRequests: 30,
    windowMs: 60_000,
    keyGenerator: () => `copilot:buyer:${session.userId}`,
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
    variant: "buyer",
    role: "buyer",
    route: rawContext.route,
    sessionId: rawContext.sessionId,
    isTestWorkspace: rawContext.isTestWorkspace,
    userId: session.userId,
    dealId: rawContext.dealId,
    dealStage: rawContext.dealStage,
  }

  // Extract session token from cookie header for downstream tool calls
  const cookieHeader = request.headers.get("cookie") ?? ""
  const sessionToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="))
    ?.replace("session=", "") ?? ""

  const copilotRequest = {
    message,
    context,
    history: history ?? [],
    confirmedTool,
  }

  try {
    const response = await runBuyerOrchestrator(copilotRequest, sessionToken)
    return NextResponse.json({ ok: true, response })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong."
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 })
  }
}
