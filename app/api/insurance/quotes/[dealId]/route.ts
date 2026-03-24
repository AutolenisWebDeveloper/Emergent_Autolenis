import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prisma } from "@/lib/db"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    // Verify the deal belongs to this buyer
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ buyerId: session.userId }, { user_id: session.userId }],
      },
    })

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found or access denied" },
        { status: 404 },
      )
    }

    const quotes = await prisma.insuranceQuote.findMany({
      where: { buyerId: session.userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: { quotes: quotes || [] },
    })
  } catch (error: any) {
    console.error("[Insurance Quotes] GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
