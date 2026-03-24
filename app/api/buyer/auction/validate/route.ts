import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { AuctionService } from "@/lib/services/auction.service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth(["BUYER"])

    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .maybeSingle()

    if (buyerError) {
      console.error("[v0] Buyer profile fetch error:", buyerError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch buyer profile",
        },
        { status: 500 },
      )
    }

    if (!buyer) {
      return NextResponse.json(
        {
          success: false,
          error: "Buyer profile not found. Please complete your profile setup.",
        },
        { status: 404 },
      )
    }

    const validation = await AuctionService.validateAuctionPrerequisites(buyer.id)

    return NextResponse.json({
      success: true,
      data: {
        valid: validation.valid,
        errors: validation.errors,
        hasPreQual: !!validation.buyer?.preQualification,
        hasShortlist: validation.activeShortlist?.items?.length > 0,
        hasDeposit: !!validation.depositPayment,
        shortlistId: validation.activeShortlist?.id,
        vehicleCount: validation.activeShortlist?.items?.length || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Auction validation error:", error)
    return NextResponse.json({ success: false, error: "Failed to validate auction prerequisites" }, { status: 500 })
  }
}
