import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { sourcingService } from "@/lib/services/sourcing.service"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const session = await requireAuth(["DEALER"])
    const { caseId } = await params

    const dealer = await prisma.dealer.findUnique({
      where: { userId: session.userId },
    })
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const caseData = await sourcingService.getCaseForAdmin(caseId)
    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const body = await req.json()

    const result = await sourcingService.createOffer(
      caseId,
      {
        ...body,
        dealerId: dealer.id,
        sourceDealerName: dealer.businessName,
      },
      session.userId,
      "DEALER_SUBMITTED",
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 401 ? "Unauthorized" : "Forbidden" }, { status: statusCode })
    }
    console.error("[DEALER_SUBMIT_OFFER]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
