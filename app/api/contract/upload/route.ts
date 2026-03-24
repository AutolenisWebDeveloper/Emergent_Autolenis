import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["DEALER"])
    const body = await request.json()

    const { dealId, documentUrl, documentType } = body

    if (!dealId || !documentUrl || !documentType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: dealId, documentUrl, documentType" },
        { status: 400 },
      )
    }

    // Enforce object ownership: verify dealer owns this deal
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      select: { dealerId: true },
    })
    if (!deal) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }
    if (deal.dealerId !== session.userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const contract = await ContractShieldService.uploadContract(
      dealId,
      session.userId,
      documentUrl,
      documentType,
    )

    return NextResponse.json({
      success: true,
      data: { contract },
    })
  } catch (error: unknown) {
    console.error("[Contract Upload]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}