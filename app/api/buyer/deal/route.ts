import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { dealContextService } from "@/lib/services/deal-context.service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Look up BuyerProfile first since SelectedDeal.buyerId references BuyerProfile.id
    const { data: buyerProfile } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", user.userId)
      .single()

    if (!buyerProfile) {
      return NextResponse.json({
        success: true,
        data: { deal: null },
      })
    }

    // Query with simplified joins to avoid ambiguous FK issues
    const { data: deal, error } = await supabase
      .from("SelectedDeal")
      .select(`
        *,
        auctionOffer:AuctionOffer(
          *,
          financingOptions:AuctionOfferFinancingOption(*),
          inventoryItem:InventoryItem(*)
        ),
        insurancePolicy:InsurancePolicy(*)
      `)
      .eq("buyerId", buyerProfile.id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[Buyer Deal] Query error:", error)
      throw error
    }

    // For sourced deals (auctionOffer is null), enrich with deal context
    if (deal && !deal.auctionOffer && deal.sourcedOfferId) {
      const ctx = await dealContextService.resolveDealContextForBuyer(
        user.userId,
        deal.id,
      )
      if (ctx) {
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
