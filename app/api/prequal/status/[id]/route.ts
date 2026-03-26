import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getPrequalSessionToken } from "@/lib/prequal/session"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const sessionToken =
      (await getPrequalSessionToken()) ??
      request.headers.get("x-prequal-session") ??
      null

    const application = await prisma.prequalApplication.findUnique({
      where: { id },
      include: { ibvSession: true, decision: true },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    // Verify session matches (basic authorization)
    if (sessionToken && application.sessionToken !== sessionToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      status: application.status,
      queueSegment: application.queueSegment,
      finalStatus: application.finalStatus ?? undefined,
      shoppingRangeMinCents: application.shoppingRangeMinCents ?? undefined,
      shoppingRangeMaxCents: application.shoppingRangeMaxCents ?? undefined,
      ibvFormUrl: application.ibvSession?.ibvFormUrl ?? undefined,
      expiresAt: application.expiresAt?.toISOString() ?? undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal] Status route error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
