import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"

export const dynamic = "force-dynamic"

function mapAuctionStatusToUi(status: string): string {
  switch (status) {
    case "PENDING_DEPOSIT":
      return "PENDING"
    case "ACTIVE":
      return "ACTIVE"
    case "CLOSED":
      return "MATCHED"
    case "COMPLETED":
      return "COMPLETED"
    case "CANCELLED":
      return "CANCELLED"
    default:
      return status
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId } = await params

  if (isTestWorkspace(user)) {
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        status: "PENDING",
        buyerId: "buyer_gold_001",
        buyerName: "Test Buyer",
        buyerEmail: "buyer@test.com",
        vehicle: "2024 Toyota Camry SE",
        budget: 30000,
        location: "Frisco, TX",
        createdAt: new Date().toISOString(),
        tradeIn: null,
        timeline: [{ event: "Request created", user: "System", date: new Date().toISOString() }],
      },
    })
  }

  const dbUnavailable = requireDatabase()
  if (dbUnavailable) return dbUnavailable

  const { data: auction, error } = await supabase
    .from("Auction")
    .select(
      [
        "id",
        "buyerId",
        "shortlistId",
        "status",
        "startsAt",
        "endsAt",
        "createdAt",
        "buyer:BuyerProfile(id,userId,firstName,lastName,city,state,preQualification:PreQualification(maxOtd))",
        "shortlist:Shortlist(id,items:ShortlistItem(inventoryItem:InventoryItem(id,year,make,model,trim)))",
      ].join(","),
    )
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to load request" }, { status: 500 })
  }
  if (!auction) {
    return NextResponse.json({ success: false, error: `Request ${requestId} not found` }, { status: 404 })
  }

  const auctionRec = auction as unknown as Record<string, unknown>
  const buyer = Array.isArray(auctionRec["buyer"]) ? auctionRec["buyer"][0] : auctionRec["buyer"]
  const shortlist = Array.isArray(auctionRec["shortlist"]) ? auctionRec["shortlist"][0] : auctionRec["shortlist"]
  const firstItem = shortlist?.items?.[0]
  const vehicle = firstItem?.inventoryItem

  // buyer email lookup
  let buyerEmail = ""
  if (buyer?.userId) {
    const { data: u } = await supabase.from("User").select("email").eq("id", buyer.userId).maybeSingle()
    buyerEmail = u?.email || ""
  }

  const uiStatus = mapAuctionStatusToUi(auctionRec["status"] as string)
  const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}` : "Vehicle not set"
  const budget = buyer?.preQualification?.maxOtd ?? 0
  const location = buyer ? `${buyer.city}, ${buyer.state}` : ""

  const timeline: any[] = [
    { event: "Request created", user: "System", date: auctionRec["createdAt"] as string },
  ]
  if (auctionRec["startsAt"]) timeline.push({ event: "Auction scheduled", user: "Admin/System", date: auctionRec["startsAt"] as string })
  if (auctionRec["endsAt"]) timeline.push({ event: "Auction end scheduled", user: "Admin/System", date: auctionRec["endsAt"] as string })
  if (uiStatus === "ACTIVE") timeline.push({ event: "Auction activated", user: "Admin", date: (auctionRec["startsAt"] as string) || new Date().toISOString() })
  if (uiStatus === "MATCHED") timeline.push({ event: "Auction closed (matched)", user: "System", date: new Date().toISOString() })

  return NextResponse.json({
    success: true,
    data: {
      id: auctionRec["id"] as string,
      status: uiStatus,
      buyerId: auctionRec["buyerId"] as string,
      buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : "",
      buyerEmail,
      vehicle: vehicleLabel,
      budget,
      location,
      createdAt: auctionRec["createdAt"] as string,
      tradeIn: null,
      timeline,
      auctionId: auctionRec["id"] as string,
    },
  })
  } catch (error) {
    console.error("[AdminRequest GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/requests/:requestId
 * Activates the underlying Auction (Request) by setting status ACTIVE and scheduling startsAt/endsAt.
 * This is admin-only.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const body = await request.json().catch(() => ({}))
    const durationHours = Math.min(168, Math.max(1, Number(body?.durationHours ?? 72)))

    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000)

    const { data: existing, error: loadErr } = await supabase
      .from("Auction")
      .select("id,status")
      .eq("id", requestId)
      .maybeSingle()

    if (loadErr) return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
    if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    // Only activate if not already terminal
    if (["CANCELLED", "COMPLETED"].includes((existing as Record<string, unknown>)["status"] as string)) {
      return NextResponse.json({ error: "Cannot activate a terminal request" }, { status: 409 })
    }

    const { error: updateErr } = await supabase
      .from("Auction")
      .update({
        status: "ACTIVE",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      })
      .eq("id", requestId)

    if (updateErr) {
      return NextResponse.json({ error: "Failed to activate request" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[AdminRequest PATCH] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
