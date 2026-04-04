import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { ShortlistService } from "@/lib/services/shortlist.service"

// POST - Set/unset primary choice
export async function POST(request: Request, { params }: { params: Promise<{ shortlistItemId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { shortlistItemId } = await params
    const body = await request.json()

    if (typeof body.isPrimaryChoice !== "boolean") {
      return NextResponse.json({ success: false, error: "isPrimaryChoice (boolean) is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      console.error("[v0] Buyer profile not found for user:", session.userId, buyerError)
      throw new Error("Buyer profile not found")
    }

    const result = await ShortlistService.setPrimaryChoice(buyer.id, shortlistItemId, body.isPrimaryChoice)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Error setting primary shortlist choice:", error)
    return NextResponse.json({ success: false, error: "Failed to set primary choice" }, { status: 500 })
  }
}
