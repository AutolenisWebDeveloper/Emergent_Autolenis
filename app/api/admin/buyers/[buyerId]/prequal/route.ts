import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { prequalService } from "@/lib/services/prequal.service"
import { handleRouteError } from "@/lib/utils/route-error"

export const dynamic = "force-dynamic"

// GET /api/admin/buyers/:buyerId/prequal — Full prequal state for admin form
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ buyerId: string }> },
) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const workspaceId = session.workspace_id

    // Validate buyer exists in workspace
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

    // Get current PreQualification — convention: buyerId = User.id
    const currentPrequal = await prisma.preQualification.findUnique({
      where: { buyerId: buyerId },
    })

    // Get full history from service
    const history = await prequalService.getPreQualHistoryForUser(buyerId, workspaceId)

    // Get compliance/audit events for this buyer's prequal actions
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
