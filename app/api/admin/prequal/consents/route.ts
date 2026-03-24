import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/prequal/consents — List consent artifacts for compliance audit
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const perPage = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("perPage") || "20")))
    const userId = searchParams.get("userId") || undefined

    const where = userId ? { userId } : {}

    const [artifacts, total] = await Promise.all([
      prisma.prequalConsentArtifact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          consentVersion: {
            select: { id: true, version: true },
          },
        },
      }),
      prisma.prequalConsentArtifact.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        artifacts,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    })
  } catch (error) {
    console.error("[Admin PreQual Consents] Error:", error)
    return NextResponse.json({ error: "Failed to load consent artifacts" }, { status: 500 })
  }
}
