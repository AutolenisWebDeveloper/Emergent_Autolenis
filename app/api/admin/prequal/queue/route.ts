import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser()
    if (!user || !["ADMIN", "SUPER_ADMIN", "COMPLIANCE_ADMIN"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const queueSegment = url.searchParams.get("segment")
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("perPage") ?? "20", 10)))

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (queueSegment) where.queueSegment = queueSegment

    const [applications, total] = await Promise.all([
      prisma.prequalApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          queueSegment: true,
          ipredictBand: true,
          ibvOutcome: true,
          finalStatus: true,
          createdAt: true,
          submittedAt: true,
          slaEscalatedAt: true,
        },
      }),
      prisma.prequalApplication.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: { page, perPage, total, pages: Math.ceil(total / perPage) },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Admin Prequal] Queue route error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
