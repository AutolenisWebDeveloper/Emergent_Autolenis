import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { ShortlistService } from "@/lib/services/shortlist.service"

export const dynamic = "force-dynamic"

// GET - Get eligible inventory item IDs for auction (used by System 5)
export async function GET(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const { searchParams } = new URL(request.url)
    const requireWithinBudget = searchParams.get("requireWithinBudget") === "true"

    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      console.error("[v0] Buyer profile fetch error:", buyerError)
      throw new Error("Buyer profile not found")
    }

    const eligibleIds = await ShortlistService.getEligibleShortlistItemsForAuctions(buyer.id, { requireWithinBudget })

    return NextResponse.json({
      success: true,
      data: {
        eligibleInventoryItemIds: eligibleIds,
        count: eligibleIds.length,
      },
    })
  } catch (error) {
    console.error("[v0] Eligible shortlist fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch eligible shortlist items" }, { status: 500 })
  }
}
