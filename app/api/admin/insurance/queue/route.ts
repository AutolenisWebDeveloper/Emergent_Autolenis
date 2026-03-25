import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import type { InsuranceReadinessStatus } from "@/lib/constants/insurance"

export const dynamic = "force-dynamic"

/**
 * Admin Insurance Operations Queue
 *
 * Provides queued views for:
 * - uploaded proof review queue
 * - pending insurance follow-up queue
 * - help-request queue
 * - delivery-blocked queue for missing proof
 *
 * Each record includes:
 * - insurance_status
 * - upload_present
 * - document_type
 * - reviewed_by
 * - reviewed_at
 * - delivery_block_flag
 */

interface InsuranceQueueItem {
  deal_id: string
  buyer_id: string
  buyer_name: string
  insurance_status: InsuranceReadinessStatus | string
  upload_present: boolean
  document_type: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  delivery_block_flag: boolean
  deal_status: string
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queue = searchParams.get("queue") || "all"
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "50")))
    const offset = (page - 1) * limit

    // Build queue filter based on the requested queue type
    let statusFilter: string[]
    switch (queue) {
      case "uploaded_review":
        statusFilter = ["CURRENT_INSURANCE_UPLOADED", "UNDER_REVIEW"]
        break
      case "pending_followup":
        statusFilter = ["INSURANCE_PENDING"]
        break
      case "help_request":
        statusFilter = ["HELP_REQUESTED"]
        break
      case "delivery_blocked":
        statusFilter = ["REQUIRED_BEFORE_DELIVERY"]
        break
      default:
        statusFilter = [
          "CURRENT_INSURANCE_UPLOADED",
          "UNDER_REVIEW",
          "INSURANCE_PENDING",
          "HELP_REQUESTED",
          "REQUIRED_BEFORE_DELIVERY",
        ]
    }

    // Query deals with insurance readiness statuses
    const deals = await prisma.selectedDeal.findMany({
      where: {
        insurance_readiness_status: { in: statusFilter },
        status: { not: "CANCELLED" },
      },
      include: {
        insurancePolicy: {
          select: {
            id: true,
            type: true,
            carrier: true,
            documentUrl: true,
            isVerified: true,
            status: true,
            createdAt: true,
          },
        },
        insuranceUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            documentTag: true,
            status: true,
            reviewedBy: true,
            reviewedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    const total = await prisma.selectedDeal.count({
      where: {
        insurance_readiness_status: { in: statusFilter },
        status: { not: "CANCELLED" },
      },
    })

    // Get buyer profiles for the deals
    const buyerIds = [...new Set(deals.map((d) => d.buyerId).filter(Boolean))]
    const buyerProfiles = buyerIds.length > 0
      ? await prisma.buyerProfile.findMany({
          where: { userId: { in: buyerIds as string[] } },
          select: { userId: true, firstName: true, lastName: true },
        })
      : []
    const buyerMap = new Map(buyerProfiles.map((b) => [b.userId, b]))

    const items: InsuranceQueueItem[] = deals.map((deal) => {
      const buyer = buyerMap.get(deal.buyerId || "")
      const latestUpload = deal.insuranceUploads?.[0]
      const policy = deal.insurancePolicy
      const insStatus = deal.insurance_readiness_status || "NOT_STARTED"

      return {
        deal_id: deal.id,
        buyer_id: deal.buyerId || "",
        buyer_name: buyer
          ? `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || "Unknown"
          : "Unknown",
        insurance_status: insStatus,
        upload_present: !!(latestUpload || policy?.documentUrl),
        document_type: latestUpload?.documentTag || policy?.type || null,
        reviewed_by: latestUpload?.reviewedBy || null,
        reviewed_at: latestUpload?.reviewedAt?.toISOString() || null,
        delivery_block_flag: deal.delivery_block_flag,
        deal_status: deal.status,
        created_at: deal.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        queue,
      },
    })
  } catch (error) {
    console.error("[Admin Insurance Queue Error]", error)
    return NextResponse.json(
      { error: "Failed to load insurance queue data" },
      { status: 500 }
    )
  }
}
