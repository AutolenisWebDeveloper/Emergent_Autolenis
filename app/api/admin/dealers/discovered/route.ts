import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerDiscoveryService from "@/lib/services/dealer-discovery.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const status = sp.get("status") || undefined
    const zip = sp.get("zip") || undefined
    const page = Number.parseInt(sp.get("page") || "1")
    const perPage = Number.parseInt(sp.get("perPage") || "25")

    const result = await DealerDiscoveryService.getProspects({ status, zip, page, perPage })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealers Discovered Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list discovered dealers", correlationId }, { status: 500 })
  }
}
