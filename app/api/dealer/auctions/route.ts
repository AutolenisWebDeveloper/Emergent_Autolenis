import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    if (!user.userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 })
    }

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id, businessName, verified")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError) {
      console.error("[v0] Dealer query error:", dealerError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const { data: participants, error: participantsError } = await supabase
      .from("AuctionParticipant")
      .select(`
        id,
        auctionId,
        invitedAt,
        viewedAt,
        auction:Auction(
          id,
          status,
          startsAt,
          endsAt,
          closedAt,
          createdAt,
          shortlistId,
          buyerId
        )
      `)
      .eq("dealerId", dealer.id)
      .order("invitedAt", { ascending: false })

    if (participantsError) {
      console.error("[v0] Auctions query error:", participantsError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const auctions = (participants || []).map((p: any) => ({
      id: p.auction?.id || p.auctionId,
      status: p.auction?.status || "UNKNOWN",
      startsAt: p.auction?.startsAt,
      endsAt: p.auction?.endsAt,
      closedAt: p.auction?.closedAt,
      createdAt: p.auction?.createdAt,
      invitedAt: p.invitedAt,
      viewedAt: p.viewedAt,
      participantId: p.id,
      shortlistId: p.auction?.shortlistId,
      buyerId: p.auction?.buyerId,
    }))

    return NextResponse.json({ success: true, auctions })
  } catch (error) {
    console.error("[v0] Auctions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
