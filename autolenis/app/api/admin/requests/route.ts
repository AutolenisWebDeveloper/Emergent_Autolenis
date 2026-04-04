import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

function mapUiStatusToAuctionStatus(ui: string | null): string | null {
  if (!ui) return null
  switch (ui) {
    case "PENDING":
      return "PENDING_DEPOSIT"
    case "ACTIVE":
      return "ACTIVE"
    case "MATCHED":
      return "CLOSED"
    case "COMPLETED":
      return "COMPLETED"
    case "CANCELLED":
      return "CANCELLED"
    default:
      return null
  }
}

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

export async function GET(request: Request) {
  try {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get("status")
  const search = (searchParams.get("search") || "").trim().toLowerCase()
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "100", 10)))
  const offset = (page - 1) * limit

  if (isTestWorkspace(user)) {
    return NextResponse.json({ success: true, requests: [] })
  }

  const dbUnavailable = requireDatabase()
  if (dbUnavailable) return dbUnavailable

  const auctionStatus = mapUiStatusToAuctionStatus(statusFilter !== "all" ? statusFilter : null)

  // Fetch auctions + buyer profile + shortlist vehicle context + prequal maxOtd
  let query = supabase
    .from("Auction")
    .select(
      [
        "id",
        "buyerId",
        "shortlistId",
        "status",
        "createdAt",
        "buyer:BuyerProfile(id,userId,firstName,lastName,city,state,preQualification:PreQualification(maxOtd))",
        "shortlist:Shortlist(id,items:ShortlistItem(inventoryItem:InventoryItem(id,year,make,model,trim)))",
      ].join(","),
    )
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1)

  if (auctionStatus) {
    query = query.eq("status", auctionStatus as string)
  }

  const { data: auctions, error } = await query
  if (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }

  const buyerUserIds = Array.from(
    new Set(
      (auctions || [])
        .map((a: any) => {
          const buyer = Array.isArray(a.buyer) ? a.buyer[0] : a.buyer
          return buyer?.userId
        })
        .filter(Boolean),
    ),
  )

  // Lookup buyer emails from User table
  const emailMap: Record<string, string> = {}
  if (buyerUserIds.length > 0) {
    const { data: users } = await supabase.from("User").select("id,email").in("id", buyerUserIds)
    for (const u of users || []) {
      emailMap[u.id] = u.email
    }
  }

  const mapped = (auctions || []).map((a: any) => {
    const buyer = Array.isArray(a.buyer) ? a.buyer[0] : a.buyer
    const shortlist = Array.isArray(a.shortlist) ? a.shortlist[0] : a.shortlist
    const firstItem = shortlist?.items?.[0]
    const vehicle = firstItem?.inventoryItem

    return {
      id: a.id,
      buyerId: a.buyerId,
      status: mapAuctionStatusToUi(a.status),
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year || 0,
      trim: vehicle?.trim || undefined,
      maxBudget: buyer?.preQualification?.maxOtd ?? undefined,
      createdAt: a.createdAt,
      buyer: buyer
        ? {
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            email: emailMap[buyer.userId] || "",
          }
        : undefined,
      auctionCount: 1,
    }
  })

  const filtered =
    search.length === 0
      ? mapped
      : mapped.filter((r: any) => {
          const vehicleStr = `${r.year} ${r.make} ${r.model} ${r.trim || ""}`.toLowerCase()
          const buyerStr = `${r.buyer?.firstName || ""} ${r.buyer?.lastName || ""} ${r.buyer?.email || ""}`.toLowerCase()
          return vehicleStr.includes(search) || buyerStr.includes(search) || String(r.id).toLowerCase().includes(search)
        })

  return NextResponse.json({ success: true, requests: filtered })
  } catch (error) {
    console.error("[AdminRequests] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
