import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/prequal/export — Export prequal compliance data
// Returns consent artifacts, provider events, permissible purpose logs,
// and forwarding authorizations for a given user or time range.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") || undefined
    const since = searchParams.get("since") || undefined
    const until = searchParams.get("until") || undefined

    // Build date filters
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (since) dateFilter.gte = new Date(since)
    if (until) dateFilter.lte = new Date(until)
    const hasDateFilter = Object.keys(dateFilter).length > 0

    const userFilter = userId ? { userId } : {}

    const [consentArtifacts, providerEvents, purposeLogs, forwardingAuths] = await Promise.all([
      prisma.prequalConsentArtifact.findMany({
        where: {
          ...userFilter,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          consentVersion: {
            select: { id: true, version: true },
          },
        },
      }),
      prisma.prequalProviderEvent.findMany({
        where: {
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.permissiblePurposeLog.findMany({
        where: {
          ...userFilter,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.consumerAuthorizationArtifact.findMany({
        where: {
          ...userFilter,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        consentArtifacts,
        providerEvents,
        permissiblePurposeLogs: purposeLogs,
        forwardingAuthorizations: forwardingAuths,
        exportedAt: new Date().toISOString(),
        filters: { userId, since, until },
      },
    })
  } catch (error) {
    console.error("[Admin PreQual Export] Error:", error)
    return NextResponse.json({ error: "Failed to export compliance data" }, { status: 500 })
  }
}
