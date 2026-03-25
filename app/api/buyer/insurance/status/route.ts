import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"

export const dynamic = "force-dynamic"

/**
 * GET /api/buyer/insurance/status
 * Returns current insurance readiness status and upload history for the buyer's active deal.
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find active deal for buyer
    const { prisma } = await import("@/lib/db")
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        OR: [{ user_id: user.userId }, { buyerId: user.userId }],
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        deletedAt: null,
      },
      select: {
        id: true,
        insurance_readiness_status: true,
        delivery_block_flag: true,
        insuranceUploads: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileUrl: true,
            fileType: true,
            documentTag: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!deal) {
      return NextResponse.json({
        success: true,
        data: {
          dealId: null,
          insuranceReadinessStatus: "NOT_STARTED",
          deliveryBlockFlag: false,
          uploads: [],
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        dealId: deal.id,
        insuranceReadinessStatus: deal.insurance_readiness_status,
        deliveryBlockFlag: deal.delivery_block_flag,
        uploads: deal.insuranceUploads,
      },
    })
  } catch (error) {
    console.error("[Buyer Insurance Status Error]", error)
    return NextResponse.json({ error: "Failed to load insurance status" }, { status: 500 })
  }
}

/**
 * POST /api/buyer/insurance/status
 * Perform insurance action: upload, mark pending, or request help.
 *
 * Body: { action: "upload" | "pending" | "help", dealId: string, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, dealId } = body

    if (!dealId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: action, dealId" },
        { status: 400 },
      )
    }

    switch (action) {
      case "upload": {
        const { fileUrl, fileType, documentTag } = body
        if (!fileUrl || !fileType || !documentTag) {
          return NextResponse.json(
            { error: "Missing required fields for upload: fileUrl, fileType, documentTag" },
            { status: 400 },
          )
        }
        const validTags = ["insurance_card", "insurance_declarations", "insurance_binder", "insurance_other"]
        if (!validTags.includes(documentTag)) {
          return NextResponse.json(
            { error: `Invalid documentTag. Must be one of: ${validTags.join(", ")}` },
            { status: 400 },
          )
        }
        const result = await InsuranceService.uploadInsuranceDocument(
          dealId,
          user.userId,
          fileUrl,
          fileType,
          documentTag,
        )
        return NextResponse.json({ success: true, data: result })
      }

      case "pending": {
        const result = await InsuranceService.markInsurancePending(dealId, user.userId)
        return NextResponse.json({ success: true, data: result })
      }

      case "help": {
        const result = await InsuranceService.requestInsuranceHelp(dealId, user.userId)
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Must be one of: upload, pending, help" },
          { status: 400 },
        )
    }
  } catch (error: any) {
    console.error("[Buyer Insurance Action Error]", error)
    const message = error?.message || "Insurance operation failed"
    const status = message.includes("not found") || message.includes("unauthorized") ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
