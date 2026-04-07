import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { prequalService } from "@/lib/services/prequal.service"
import { handleRouteError } from "@/lib/utils/route-error"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// ─── GET /api/admin/buyers/:buyerId/prequal ──────────────────────────────────
// Returns current full prequal state for a buyer + audit trail.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ buyerId: string }> },
) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const workspaceId = session.workspace_id

    const buyer = await prisma.buyerProfile.findFirst({
      where: { userId: buyerId, ...(workspaceId ? { workspaceId } : {}) },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
        monthlyIncomeCents: true,
        monthlyHousingCents: true,
        annualIncome: true,
        monthlyHousing: true,
      },
    })

    if (!buyer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Buyer not found" } },
        { status: 404 },
      )
    }

    // Convention: PreQualification.buyerId stores User.id (see FK assessment)
    const currentPrequal = await prisma.preQualification.findUnique({
      where: { buyerId: buyerId },
    })

    const history = await prequalService.getPreQualHistoryForUser(buyerId, workspaceId)

    const auditEvents = await prisma.complianceEvent.findMany({
      where: {
        buyerId: buyerId,
        eventType: {
          in: [
            "ADMIN_MANUAL_PREQUAL",
            "ADMIN_PREQUAL_STATUS_CHANGE",
            "PREQUAL_REVOKED",
            "SOFT_CREDIT_PULL",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      data: {
        buyer: {
          id: buyer.id,
          userId: buyer.userId,
          name: `${buyer.firstName} ${buyer.lastName}`,
          employmentStatus: buyer.employmentStatus,
          monthlyIncomeCents: buyer.monthlyIncomeCents ?? (buyer.annualIncome ? Math.round((buyer.annualIncome / 12) * 100) : null),
          monthlyHousingCents: buyer.monthlyHousingCents ?? (buyer.monthlyHousing ? Math.round(buyer.monthlyHousing * 100) : null),
        },
        currentPrequal: currentPrequal
          ? {
              id: currentPrequal.id,
              status: currentPrequal.status,
              creditTier: currentPrequal.creditTier,
              creditScore: currentPrequal.creditScore,
              maxOtdAmountCents: currentPrequal.maxOtdAmountCents,
              maxOtd: currentPrequal.maxOtd,
              minMonthlyPaymentCents: currentPrequal.minMonthlyPaymentCents,
              maxMonthlyPaymentCents: currentPrequal.maxMonthlyPaymentCents,
              dtiRatio: currentPrequal.dtiRatio,
              source: currentPrequal.source,
              providerName: currentPrequal.providerName,
              expiresAt: currentPrequal.expiresAt,
              createdAt: currentPrequal.createdAt,
              updatedAt: currentPrequal.updatedAt,
            }
          : null,
        history: history.preQualificationHistory,
        auditEvents,
      },
    })
  } catch (error) {
    console.error("[Admin Buyer Prequal GET] Error:", error)
    return handleRouteError(error, "Failed to load prequal data")
  }
}

// ─── POST /api/admin/buyers/:buyerId/prequal ─────────────────────────────────
// Admin creates or updates a buyer's PreQualification record + audit trail.
// Transaction-safe: all writes succeed or all roll back.
// Idempotent: repeated saves with same payload do not create duplicates.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> },
) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const body = await request.json()

    const adminId = session.userId
    const workspaceId = session.workspace_id

    // Validate buyer exists and belongs to workspace
    const buyer = await prisma.buyerProfile.findFirst({
      where: { userId: buyerId, ...(workspaceId ? { workspaceId } : {}) },
      select: { id: true, userId: true, workspaceId: true },
    })

    if (!buyer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Buyer not found in this workspace" } },
        { status: 404 },
      )
    }

    // Convention: PreQualification.buyerId stores User.id (see FK assessment)
    const prequalBuyerId = buyerId

    // ── Validate input ──────────────────────────────────────────────────────
    const {
      creditTier,
      maxOtdAmountCents,
      minMonthlyPaymentCents,
      maxMonthlyPaymentCents,
      dtiRatio,
      creditScore,
      status,
      note,
    } = body

    const validCreditTiers = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]
    if (!creditTier || !validCreditTiers.includes(creditTier)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `creditTier must be one of: ${validCreditTiers.join(", ")}` } },
        { status: 400 },
      )
    }

    if (maxOtdAmountCents == null || typeof maxOtdAmountCents !== "number" || maxOtdAmountCents < 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "maxOtdAmountCents is required and must be a non-negative integer" } },
        { status: 400 },
      )
    }

    if (!note || typeof note !== "string" || note.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Admin note/reason is required" } },
        { status: 400 },
      )
    }

    const validStatuses = ["ACTIVE", "EXPIRED", "REVOKED", "FAILED", "PENDING"]
    const resolvedStatus = status && validStatuses.includes(status) ? status : "ACTIVE"

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // ── Transaction: upsert PreQualification + audit log ─────────────────
    const result = await prisma.$transaction(async (tx: any) => {
      // Check for existing prequal for this buyer
      const existing = await tx.preQualification.findUnique({
        where: { buyerId: prequalBuyerId },
      })

      const prequalData = {
        status: resolvedStatus,
        creditTier: creditTier as "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DECLINED",
        maxOtd: maxOtdAmountCents / 100,
        maxOtdAmountCents: Math.round(maxOtdAmountCents),
        estimatedMonthlyMin: minMonthlyPaymentCents != null ? minMonthlyPaymentCents / 100 : 0,
        minMonthlyPaymentCents: minMonthlyPaymentCents != null ? Math.round(minMonthlyPaymentCents) : null,
        estimatedMonthlyMax: maxMonthlyPaymentCents != null ? maxMonthlyPaymentCents / 100 : 0,
        maxMonthlyPaymentCents: maxMonthlyPaymentCents != null ? Math.round(maxMonthlyPaymentCents) : null,
        dti: dtiRatio != null ? dtiRatio : null,
        dtiRatio: dtiRatio != null ? dtiRatio : null,
        creditScore: creditScore != null ? Math.round(creditScore) : null,
        source: "INTERNAL" as const,
        providerName: "AdminManualOverride",
        softPullCompleted: true,
        softPullDate: new Date(),
        consentGiven: true,
        consentDate: new Date(),
        expiresAt,
        workspaceId: workspaceId || buyer.workspaceId,
        updatedAt: new Date(),
      }

      let prequal
      let action: "CREATED" | "UPDATED"
      let previousValues: Record<string, unknown> | null = null

      if (existing) {
        // Update in place — no duplicate
        previousValues = {
          status: existing.status,
          creditTier: existing.creditTier,
          maxOtdAmountCents: existing.maxOtdAmountCents,
          minMonthlyPaymentCents: existing.minMonthlyPaymentCents,
          maxMonthlyPaymentCents: existing.maxMonthlyPaymentCents,
          dtiRatio: existing.dtiRatio,
          creditScore: existing.creditScore,
        }
        prequal = await tx.preQualification.update({
          where: { id: existing.id },
          data: prequalData,
        })
        action = "UPDATED"
      } else {
        // Create new record
        prequal = await tx.preQualification.create({
          data: {
            buyerId: prequalBuyerId,
            ...prequalData,
            createdAt: new Date(),
          },
        })
        action = "CREATED"
      }

      // ── Audit log via ComplianceEvent (canonical audit path) ──────────
      await tx.complianceEvent.create({
        data: {
          eventType: "ADMIN_MANUAL_PREQUAL",
          action: `ADMIN_MANUAL_PREQUAL_${action}`,
          userId: buyerId,
          buyerId: buyerId,
          severity: "INFO",
          details: {
            action,
            adminId,
            prequalId: prequal.id,
            source: "ADMIN_OVERRIDE",
            note: note.trim(),
            changedFields: {
              creditTier,
              maxOtdAmountCents: Math.round(maxOtdAmountCents),
              minMonthlyPaymentCents: minMonthlyPaymentCents != null ? Math.round(minMonthlyPaymentCents) : null,
              maxMonthlyPaymentCents: maxMonthlyPaymentCents != null ? Math.round(maxMonthlyPaymentCents) : null,
              dtiRatio,
              creditScore,
              status: resolvedStatus,
            },
            previousValues,
          },
          createdAt: new Date(),
        },
      })

      return { prequal, action }
    })

    logger.info("[Admin Manual Prequal]", {
      action: result.action,
      adminId,
      buyerId,
      prequalId: result.prequal.id,
    })

    return NextResponse.json({
      success: true,
      action: result.action,
      data: {
        id: result.prequal.id,
        status: result.prequal.status,
        creditTier: result.prequal.creditTier,
        maxOtdAmountCents: result.prequal.maxOtdAmountCents,
        minMonthlyPaymentCents: result.prequal.minMonthlyPaymentCents,
        maxMonthlyPaymentCents: result.prequal.maxMonthlyPaymentCents,
        dtiRatio: result.prequal.dtiRatio,
        expiresAt: result.prequal.expiresAt,
      },
    })
  } catch (error) {
    logger.error("[Admin Manual Prequal] Error:", { error })
    return handleRouteError(error, "Failed to save admin prequal")
  }
}
