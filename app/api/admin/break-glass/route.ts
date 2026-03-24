import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { sendBreakGlassEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"
import { z } from "zod"
import { nanoid } from "nanoid"

export const dynamic = "force-dynamic"

const breakGlassSchema = z.object({
  action: z.string().min(1).max(500),
  reason: z.string().min(1).max(1000),
  targetUserId: z.string().optional(),
})

// POST /api/admin/break-glass — Log and alert on break-glass (emergency) access
export async function POST(request: NextRequest) {
  const correlationId = nanoid()

  try {
    const actor = await getSessionUser()
    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" }, correlationId },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "Invalid request body" }, correlationId },
        { status: 400 }
      )
    }

    const parsed = breakGlassSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Validation failed" }, correlationId },
        { status: 400 }
      )
    }

    const { action, reason, targetUserId } = parsed.data

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") || undefined

    // Write audit log entry (FIX 16: include workspaceId)
    await prisma.adminAuditLog.create({
      data: {
        userId: actor.id,
        action: "BREAK_GLASS",
        details: {
          action,
          reason,
          targetUserId: targetUserId || null,
          correlationId,
        },
        ipAddress: ip || null,
        userAgent: request.headers.get("user-agent") || null,
        workspaceId: actor.workspace_id ?? null,
      },
    })

    // Determine admin notification email — required for security alerts
    const adminEmail =
      process.env['ADMIN_NOTIFICATION_EMAIL'] ||
      process.env['ADMIN_EMAIL']

    if (!adminEmail) {
      logger.error("[Break-Glass] ADMIN_NOTIFICATION_EMAIL or ADMIN_EMAIL is not configured — break-glass alert cannot be sent")
      return NextResponse.json(
        { error: { code: "MISCONFIGURED", message: "Admin alert email is not configured. Set ADMIN_NOTIFICATION_EMAIL." }, correlationId },
        { status: 500 }
      )
    }

    // Send break-glass alert to admin email (fire-and-forget)
    sendBreakGlassEmail(adminEmail, actor.email, actor.id, action, reason).catch((err) => {
      logger.error("[Break-Glass] sendBreakGlassEmail failed", err as Error)
    })

    logger.warn("[Break-Glass] Break-glass access used", {
      correlationId,
      actorId: actor.id,
      action,
      ip: ip || "unknown",
    })

    return NextResponse.json({ success: true, correlationId })
  } catch (error: any) {
    logger.error("[Break-Glass] Unexpected error", { correlationId, error: error.message })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" }, correlationId },
      { status: 500 }
    )
  }
}
