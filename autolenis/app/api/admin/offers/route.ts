import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({ offers: [], total: 0, page: 1, pageSize: 50 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = 50
    const offset = (page - 1) * pageSize

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Query AuctionOffer with related InventoryItem (vehicle info) and Auction
    let query = supabase
      .from("AuctionOffer")
      .select(
        `
        id,
        auctionId,
        participantId,
        inventoryItemId,
        cashOtd,
        taxAmount,
        createdAt,
        updatedAt,
        workspaceId,
        InventoryItem!inner (
          id, year, make, model, trim, dealerId,
          Dealer!inner ( id, businessName )
        ),
        Auction!inner ( id, status )
      `,
        { count: "exact" }
      )
      .eq("workspaceId", wsId)
      .order("createdAt", { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Status filter maps to the Auction status since offers don't have their own status
    if (status !== "all") {
      query = query.eq("Auction.status", status)
    }

    const { data: rawOffers, count, error } = await query

    if (error) {
      logger.error("[Admin Offers] Supabase query error:", error)
      return NextResponse.json({ error: "Failed to load offers" }, { status: 500 })
    }

    // Transform to the shape the frontend expects
    const offers = (rawOffers || []).map((offer: Record<string, unknown>) => {
      const item = offer.InventoryItem as Record<string, unknown> | null
      const dealer = item?.Dealer as Record<string, unknown> | null
      const auction = offer.Auction as Record<string, unknown> | null

      return {
        id: offer.id,
        auctionId: offer.auctionId,
        dealerId: item?.dealerId || "",
        status: (auction?.status as string) || "UNKNOWN",
        otdPriceCents: Math.round(((offer.cashOtd as number) || 0) * 100),
        createdAt: offer.createdAt,
        dealer: dealer ? { dealershipName: dealer.businessName } : null,
        auction: item
          ? {
              make: item.make || "Unknown",
              model: item.model || "Unknown",
              year: item.year || 0,
            }
          : null,
      }
    })

    return NextResponse.json({
      offers,
      total: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    logger.error("[Admin Offers] Error:", error)
    return NextResponse.json({ error: "Failed to load offers" }, { status: 500 })
  }
}
