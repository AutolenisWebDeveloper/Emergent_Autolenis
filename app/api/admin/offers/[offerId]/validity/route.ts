import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { offerService } from "@/lib/services/offer.service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const { offerId } = await params
    const user = await requireAuth(["ADMIN"])

    const body = await req.json()
    const { is_valid, admin_note } = body

    if (typeof is_valid !== "boolean") {
      return NextResponse.json({ error: "is_valid must be a boolean" }, { status: 400 })
    }

    const updatedOffer = await offerService.overrideOfferValidity(offerId, user.userId, is_valid, admin_note)

    return NextResponse.json({
      success: true,
      offer: {
        id: updatedOffer.id,
        isValid: updatedOffer.is_valid,
        validationErrors: updatedOffer.validation_errors_json,
      },
    })
  } catch (error: any) {
    console.error("[API] Admin override validity error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
