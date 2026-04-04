import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/prequal/[id]/events — Get provider events for a prequal session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if ID is a session ID first, then fall back to preQualification ID
    const session = await prisma.prequalSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        sourceType: true,
        createdAt: true,
      },
    })

    if (session) {
      // Get provider events for this session
      const events = await prisma.prequalProviderEvent.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({
        success: true,
        data: {
          session,
          events,
        },
      })
    }

    // Fall back to looking up by prequalification ID
    const prequal = await prisma.preQualification.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        source: true,
        providerName: true,
        createdAt: true,
      },
    })

    if (!prequal) {
      return NextResponse.json({ error: "Session or PreQualification not found" }, { status: 404 })
    }

    // Get provider events linked to this prequal
    const events = await prisma.prequalProviderEvent.findMany({
      where: { prequalificationId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        preQualification: prequal,
        events,
      },
    })
  } catch (error) {
    console.error("[Admin PreQual Events] Error:", error)
    return NextResponse.json({ error: "Failed to load prequal events" }, { status: 500 })
  }
}
