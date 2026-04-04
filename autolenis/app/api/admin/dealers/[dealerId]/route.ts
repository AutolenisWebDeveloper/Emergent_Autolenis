import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ dealerId: string }> }) {
  const correlationId = randomUUID()
  const xPathname = request.headers.get("x-pathname") ?? ""
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 })
    }

    const { dealerId } = await params

    if (isTestWorkspace(user)) {
      const dealer = mockSelectors.adminDealerDetail(dealerId)
      if (!dealer) {
        return NextResponse.json({ error: "Dealer not found", correlationId }, { status: 404 })
      }
      const res = NextResponse.json({ dealer })
      res.headers.set("x-pathname", xPathname)
      return res
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace", correlationId }, { status: 403 })
    }

    // Build dealer query — use service-role client (bypasses RLS) with
    // application-level workspace filtering.
    let dealerResult = await supabase.from("Dealer").select("*").eq("id", dealerId).eq("workspaceId", wsId).single()

    // Fallback: if not found by Dealer.id, try looking up by userId (handles
    // cases where the caller passes a User ID instead of the Dealer record ID).
    if (dealerResult.error || !dealerResult.data) {
      const fallbackResult = await supabase.from("Dealer").select("*").eq("userId", dealerId).eq("workspaceId", wsId).single()
      if (!fallbackResult.error && fallbackResult.data) {
        dealerResult = fallbackResult
      }
    }

    if (dealerResult.error || !dealerResult.data) {
      console.error("[Admin Dealer Detail Error]", { correlationId, dealerId, workspaceId: wsId, error: dealerResult.error })
      return NextResponse.json({ error: "Dealer not found", correlationId }, { status: 404 })
    }

    const resolvedDealerId = dealerResult.data.id

    const [inventoryResult, offersResult, dealsResult] = await Promise.all([
      supabase
        .from("InventoryItem")
        .select("*")
        .eq("dealerId", resolvedDealerId)
        .order("createdAt", { ascending: false })
        .limit(50),
      supabase.from("AuctionOffer").select("*").eq("dealerId", resolvedDealerId).order("createdAt", { ascending: false }).limit(50),
      supabase
        .from("SelectedDeal")
        .select(`
          *,
          inventoryItem:InventoryItem(*),
          buyer:BuyerProfile(*, user:User(*))
        `)
        .eq("dealerId", resolvedDealerId)
        .order("createdAt", { ascending: false }),
    ])

    const dealer = {
      ...dealerResult.data,
      name: dealerResult.data.businessName || dealerResult.data.name || "Unknown",
      _count: {
        inventoryItems: inventoryResult.data?.length || 0,
        offers: offersResult.data?.length || 0,
        selectedDeals: dealsResult.data?.length || 0,
      },
      inventoryItems: inventoryResult.data || [],
      offers: offersResult.data || [],
      selectedDeals: dealsResult.data || [],
    }

    const res = NextResponse.json({ dealer })
    res.headers.set("x-pathname", xPathname)
    return res
  } catch (error) {
    console.error("[Admin Dealer Detail Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to load dealer", correlationId }, { status: 500 })
  }
}
