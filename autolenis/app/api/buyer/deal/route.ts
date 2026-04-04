import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { dealContextService } from "@/lib/services/deal-context.service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: deal, error } = await supabase
      .from("SelectedDeal")
      .select(`
        *,
        auctionOffer:AuctionOffer(
          *,
          financingOptions:AuctionOfferFinancingOption(*),
          auction:Auction(
            *,
            shortlist:Shortlist(
              *,
              items:ShortlistItem(
                *,
                inventoryItem:InventoryItem(*)
              )
            )
          ),
          dealer:Dealer(*)
        ),
        insurancePolicy:InsurancePolicy(*)
      `)
      .eq("buyerId", user.userId)
      .in("status", [
        "SELECTED",
        "FINANCING_APPROVED",
        "FEE_PENDING",
        "FEE_PAID",
        "INSURANCE_PENDING",
        "INSURANCE_COMPLETE",
        "CONTRACT_PENDING",
        "CONTRACT_REVIEW",
        "SIGNING_PENDING",
      ])
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    // For sourced deals (auctionOffer is null), enrich with deal context
    if (deal && !deal.auctionOffer && deal.sourcedOfferId) {
      const ctx = await dealContextService.resolveDealContextForBuyer(
        user.userId,
        deal.id,
      )
      if (ctx) {
        // Attach normalized sourced deal data so the UI can render consistently
        ;(deal as Record<string, unknown>)["sourcedDealContext"] = {
          source: ctx.source,
          vehicle: ctx.vehicle,
          dealer: ctx.dealer,
          dealerName: ctx.dealerName,
          pricing: ctx.pricing,
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { deal: deal || null },
    })
  } catch (error) {
    console.error("[Buyer Deal] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch deal" }, { status: 500 })
  }
}
