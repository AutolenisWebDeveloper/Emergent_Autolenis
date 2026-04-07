import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { handleRouteError } from "@/lib/utils/route-error"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// ─── PATCH /api/admin/buyers/:buyerId/prequal/status ─────────────────────────
// Admin updates only the prequal status. Does not touch financial fields.
// Propagates immediately to buyer gating (inventory search, shortlist, auction).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> },
) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const body = await request.json()

    const adminId = session.userId
    const workspaceId = session.workspace_id

    const { status, note } = body

    const validStatuses = ["ACTIVE", "EXPIRED", "REVOKED", "FAILED", "PENDING"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `status must be one of: ${validStatuses.join(", ")}` } },
        { status: 400 },
      )
    }

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Admin note/reason is required for status changes" } },
        { status: 400 },
      )
    }

    // Validate buyer exists in workspace
    const buyer = await prisma.buyerProfile.findFirst({
      where: { userId: buyerId, ...(workspaceId ? { workspaceId } : {}) },
      select: { id: true },
    })

    if (!buyer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Buyer not found in this workspace" } },
        { status: 404 },
      )
    }

    // Find existing prequal — FK convention: buyerId = BuyerProfile.id
    const existing = await prisma.preQualification.findUnique({
      where: { buyerId: buyer.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No prequal record found for this buyer. Create one first." } },
        { status: 404 },
      )
    }

    const previousStatus = existing.status

    // Transaction: update status + audit log
    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.preQualification.update({
        where: { id: existing.id },
        data: {
          status,
          updatedAt: new Date(),
          // If reactivating, extend expiry
          ...(status === "ACTIVE" && (!existing.expiresAt || existing.expiresAt < new Date())
            ? { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            : {}),
        },
      })

      await tx.complianceEvent.create({
        data: {
          eventType: "ADMIN_PREQUAL_STATUS_CHANGE",
          action: "ADMIN_PREQUAL_STATUS_CHANGE",
          userId: buyerId,
          buyerId: buyer.id,
          severity: status === "REVOKED" ? "WARN" : "INFO",
          details: {
            adminId,
            prequalId: existing.id,
            source: "ADMIN_OVERRIDE",
            note: note.trim(),
            previousStatus,
            newStatus: status,
          },
          createdAt: new Date(),
        },
      })

      return updated
    })

    logger.info("[Admin Prequal Status Change]", {
      adminId,
      buyerId,
      prequalId: result.id,
      previousStatus,
      newStatus: status,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        previousStatus,
      },
    })
  } catch (error) {
    logger.error("[Admin Prequal Status Change] Error:", { error })
    return handleRouteError(error, "Failed to update prequal status")
  }
}
