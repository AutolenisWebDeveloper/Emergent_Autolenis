import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const user = await getSessionUser()
  if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId } = await params

  try {
    const supabase = await createClient()

    const { data: auction, error } = await supabase
      .from("Auction")
      .select(`
        id,
        buyerId,
        status,
        createdAt,
        startsAt,
        endsAt,
        shortlist:Shortlist(
          items:ShortlistItem(
            inventoryItem:InventoryItem(
              year, make, model, trim, price
            )
          )
        )
      `)
      .eq("id", requestId)
      .single()

    if (error || !auction) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: auction })
  } catch (error) {
    console.error("[Dealer Request Detail] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
