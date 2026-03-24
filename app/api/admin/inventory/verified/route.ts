import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventorySearchService from "@/lib/services/inventory-search.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const result = await InventorySearchService.searchInventory({
      source: "verified",
      make: sp.get("make") || undefined,
      model: sp.get("model") || undefined,
      page: Number.parseInt(sp.get("page") || "1"),
      perPage: Number.parseInt(sp.get("perPage") || "25"),
    })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Verified Vehicles Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list verified vehicles", correlationId }, { status: 500 })
  }
}
