import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerInviteService from "@/lib/services/dealer-invite.service"
import { emailService } from "@/lib/services/email.service"
import { prisma } from "@/lib/db"
import { randomUUID } from "crypto"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const status = sp.get("status") || undefined
    const page = Number.parseInt(sp.get("page") || "1")

    const result = await DealerInviteService.getInvites({ status, page })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealer Invites Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list invites", correlationId }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { error: { code: 401, message: "Unauthorized" }, correlationId },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { dealerEmail, dealerName, dealerPhone, notes, expiryHours } = body

    if (!dealerEmail || !dealerName) {
      return NextResponse.json(
        { error: { code: 400, message: "dealerEmail and dealerName are required" }, correlationId },
        { status: 400 },
      )
    }

    // Prevent duplicate active invites to the same email
    const existingActive = await prisma.dealerIntelligenceInvite.findFirst({
      where: {
        dealerEmail,
        status: "sent",
        tokenExpiresAt: { gt: new Date() },
        respondedAt: null,
      },
    })
    if (existingActive) {
      return NextResponse.json(
        { error: { code: 409, message: "An active invite already exists for this email" }, correlationId },
        { status: 409 },
      )
    }

    const { invite, token } = await DealerInviteService.createInvite({
      dealerEmail,
      dealerName,
      dealerPhone: dealerPhone || null,
      expiryHours: expiryHours || 72,
    })

    // Fire-and-forget invite email
    void (async () => {
      try {
        await emailService.sendDealerNetworkInviteEmail(dealerEmail, dealerName, token)
      } catch (err) {
        logger.error("[ADMIN_DEALER_INVITE] Email failed", { error: String(err), correlationId })
      }
    })()

    // Audit log
    void prisma.adminAuditLog.create({
      data: {
        userId: user.userId,
        workspaceId: user.workspace_id ?? null,
        action: "DEALER_NETWORK_INVITE_SENT",
        details: {
          inviteId: (invite as { id: string }).id,
          dealerEmail,
          dealerName,
          dealerPhone: dealerPhone || null,
          notes: notes || null,
        },
      },
    }).catch((err: unknown) => logger.error("[ADMIN_DEALER_INVITE] Audit log failed", { error: String(err) }))

    return NextResponse.json({
      success: true,
      data: { inviteId: (invite as { id: string }).id },
      correlationId,
    })
  } catch (error) {
    logger.error("[ADMIN_DEALER_INVITE]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create dealer invite" }, correlationId },
      { status: 500 },
    )
  }
}
