import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 })
    }

    const { auctionId } = await params

    if (isTestWorkspace(user)) {
      const auction = mockSelectors.adminAuctionDetail(auctionId)
      if (!auction) {
        return NextResponse.json({ error: "Auction not found", correlationId }, { status: 404 })
      }
      return NextResponse.json({ auction })
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace", correlationId }, { status: 403 })
    }

    // Fetch auction with workspace scoping
    const auctionQuery = supabase
      .from("Auction")
      .select("id, buyerId, shortlistId, workspaceId, status, startsAt, endsAt, closedAt, createdAt, updatedAt")
      .eq("id", auctionId)
      .eq("workspaceId", wsId)

    const { data: auctionData, error: auctionError } = await auctionQuery.single()

    if (auctionError || !auctionData) {
      logger.error("[Admin Auction Detail Error]", { correlationId, auctionId, error: auctionError })
      return NextResponse.json({ error: "Auction not found", correlationId }, { status: 404 })
    }

    // Fetch related data in parallel
    const [buyerResult, participantsResult, offersResult, shortlistItemsResult, dealsResult] = await Promise.all([
      supabase
        .from("BuyerProfile")
        .select("id, userId, firstName, lastName, phone, city, state, zip")
        .eq("id", auctionData.buyerId)
        .single(),
      supabase
        .from("AuctionParticipant")
        .select("id, dealerId, invitedAt, viewedAt")
        .eq("auctionId", auctionId)
        .order("invitedAt", { ascending: true }),
      supabase
        .from("AuctionOffer")
        .select("id, participantId, inventoryItemId, cashOtd, taxAmount, feesBreakdown, createdAt")
        .eq("auctionId", auctionId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("ShortlistItem")
        .select("id, inventoryItemId")
        .eq("shortlistId", auctionData.shortlistId),
      supabase
        .from("SelectedDeal")
        .select("id, status, createdAt")
        .eq("buyerId", auctionData.buyerId)
        .limit(1),
    ])

    // Get dealer names for participants
    const dealerIds = (participantsResult.data || []).map((p) => p.dealerId).filter(Boolean)
    const dealersResult = dealerIds.length > 0
      ? await supabase
          .from("Dealer")
          .select("id, businessName, name")
          .in("id", dealerIds)
      : { data: [] }

    const dealerMap: Record<string, string> = {}
    dealersResult.data?.forEach((d: any) => {
      dealerMap[d.id] = d.businessName || d.name || "Unknown"
    })

    // Get inventory/vehicle info for offers
    const inventoryIds = (offersResult.data || []).map((o) => o.inventoryItemId).filter(Boolean)
    const inventoryResult = inventoryIds.length > 0
      ? await supabase
          .from("InventoryItem")
          .select("id, dealerId, stockNumber, vin")
          .in("id", inventoryIds)
      : { data: [] }

    const inventoryMap: Record<string, any> = {}
    inventoryResult.data?.forEach((item: any) => {
      inventoryMap[item.id] = item
    })

    // Get buyer user email
    let buyerEmail = ""
    if (buyerResult.data?.userId) {
      const { data: userRow } = await supabase
        .from("User")
        .select("email")
        .eq("id", buyerResult.data.userId)
        .single()
      buyerEmail = userRow?.email || ""
    }

    // Build response
    const buyer = buyerResult.data
    const auction = {
      id: auctionData.id,
      status: auctionData.status,
      createdAt: auctionData.createdAt,
      updatedAt: auctionData.updatedAt,
      startsAt: auctionData.startsAt,
      endsAt: auctionData.endsAt,
      closedAt: auctionData.closedAt,
      buyer: buyer
        ? {
            id: buyer.id,
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            email: buyerEmail,
            phone: buyer.phone || null,
            location: [buyer.city, buyer.state].filter(Boolean).join(", ") || null,
          }
        : null,
      shortlistItems: (shortlistItemsResult.data || []).map((item: any) => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
      })),
      participants: (participantsResult.data || []).map((p: any) => ({
        id: p.id,
        dealerId: p.dealerId,
        dealerName: dealerMap[p.dealerId] || "Unknown",
        invitedAt: p.invitedAt,
        viewedAt: p.viewedAt,
      })),
      offers: (offersResult.data || []).map((o: any) => {
        const inv = inventoryMap[o.inventoryItemId]
        return {
          id: o.id,
          dealerId: inv?.dealerId || null,
          dealerName: inv?.dealerId ? (dealerMap[inv.dealerId] || "Unknown") : "Unknown",
          cashOtd: o.cashOtd,
          taxAmount: o.taxAmount,
          feesBreakdown: o.feesBreakdown,
          inventoryItemId: o.inventoryItemId,
          stockNumber: inv?.stockNumber || null,
          submittedAt: o.createdAt,
        }
      }),
      deal: dealsResult.data?.[0]
        ? {
            id: dealsResult.data[0].id,
            status: dealsResult.data[0].status,
            createdAt: dealsResult.data[0].createdAt,
          }
        : null,
    }

    return NextResponse.json({ auction })
  } catch (error) {
    logger.error("[Admin Auction Detail Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to load auction details", correlationId }, { status: 500 })
  }
}
