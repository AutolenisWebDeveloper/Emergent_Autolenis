/**
 * Admin Copilot API Route
 *
 * - Uses lib/admin-auth.ts session (NOT lib/auth.ts JWT)
 * - TOTP MFA required — sessions where mfaVerified = false are rejected 401
 * - Rate limited: 60 req/min per admin userId
 * - All actions logged to compliance event ledger
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { getAdminSession } from "@/lib/admin-auth"
import { runAdminOrchestrator } from "@/lib/copilot/admin/orchestrator"
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
    variant: z.literal("admin"),
    route: z.string().max(200),
    sessionId: z.string().max(128),
    isTestWorkspace: z.boolean().optional(),
    dealId: z.string().max(128).optional(),
  }),
  history: z.array(ConversationTurnSchema).max(20).optional(),
  confirmedTool: ConfirmedToolSchema.optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Admin session auth — NOT standard JWT
  const adminSession = await getAdminSession()
  if (!adminSession) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Admin authentication required." } },
      { status: 401 },
    )
  }

  // MFA required for all admin copilot requests
  if (!adminSession.mfaVerified) {
    return NextResponse.json(
      { error: { code: "MFA_REQUIRED", message: "Multi-factor authentication is required to use the admin assistant." } },
      { status: 401 },
    )
  }

  // Rate limit: 60 req/min per admin userId
  const rateLimitResponse = await rateLimit(request, {
    maxRequests: 60,
    windowMs: 60_000,
    keyGenerator: () => `copilot:admin:${adminSession.userId}`,
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
    variant: "admin",
    role: "admin",
    route: rawContext.route,
    sessionId: rawContext.sessionId,
    isTestWorkspace: rawContext.isTestWorkspace,
    userId: adminSession.userId,
    dealId: rawContext.dealId,
  }

  const cookieHeader = request.headers.get("cookie") ?? ""
  const sessionToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("admin_session="))
    ?.replace("admin_session=", "") ?? ""

  try {
    const response = await runAdminOrchestrator(
      { message, context, history: history ?? [], confirmedTool },
      adminSession.userId,
      sessionToken,
    )
    return NextResponse.json({ ok: true, response })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong."
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 })
  }
}
