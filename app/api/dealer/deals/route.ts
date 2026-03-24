import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { DEALER_ACTIVE_PIPELINE_STATUSES } from "@/lib/constants/deal-visibility"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer profile
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id, workspaceId")
      .eq("userId", user.userId)
      .single()

    if (!dealer) {
      return NextResponse.json({ deals: [] })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    // Build query - dealers can only see their own deals in active pipeline statuses
    let query = supabase
      .from("SelectedDeal")
      .select(`
        id,
        status,
        cashOtd,
        createdAt,
        sourcedOfferId,
        buyer:buyerId (
          id,
          profile:BuyerProfile (firstName, lastName)
        ),
        inventoryItem:inventoryItemId (
          vehicle:vehicleId (year, make, model)
        ),
        sourcedOffer:sourcedOfferId (year, make, modelName)
      `)
      .eq("dealerId", dealer.id)
      .in("status", status ? [status] : [...DEALER_ACTIVE_PIPELINE_STATUSES])
      .order("createdAt", { ascending: false })

    const { data: deals, error } = await query

    if (error) {
      // Handle RLS denial gracefully
      if (error.code === "42501" || error.message?.includes("permission")) {
        console.warn("[Dealer Deals] RLS denied access:", error.message)
        return NextResponse.json({ deals: [] })
      }
      console.error("[Dealer Deals] Error:", error)
      return NextResponse.json({ deals: [] })
    }

    const formatted = (deals || []).map((deal: any) => ({
      id: deal.id,
      status: deal.status,
      amount: deal.cashOtd,
      createdAt: deal.createdAt,
      buyerName: deal.buyer?.profile
        ? `${deal.buyer.profile.firstName || ""} ${deal.buyer.profile.lastName || ""}`.trim()
        : "Unknown Buyer",
      vehicle: deal.inventoryItem
        ? `${deal.inventoryItem.year} ${deal.inventoryItem.make} ${deal.inventoryItem.model}`
        : deal.sourcedOffer
          ? `${deal.sourcedOffer.year || ""} ${deal.sourcedOffer.make || ""} ${deal.sourcedOffer.modelName || ""}`.trim()
          : "Unknown Vehicle",
    }))

    return NextResponse.json({ deals: formatted })
  } catch (error) {
    console.error("[Dealer Deals] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
