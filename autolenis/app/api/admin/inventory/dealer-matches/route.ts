import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import {
  createExternalDealerMatch,
  listExternalDealerMatches,
  deactivateExternalDealerMatch,
} from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const dealer_id = (sp.get("dealer_id") || "").trim() || undefined
    const is_active = sp.get("is_active") === "true" ? true : sp.get("is_active") === "false" ? false : undefined
    const limit = Number(sp.get("limit") || 50)
    const offset = Number(sp.get("offset") || 0)

    const result = await listExternalDealerMatches({ dealer_id, is_active, limit, offset })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Dealer Matches List Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "LIST_MATCHES_FAILED", message: "Failed to list dealer matches" }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    if (!body.external_dealer_id || !body.dealer_id) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "external_dealer_id and dealer_id are required" } },
        { status: 400 },
      )
    }

    const match = await createExternalDealerMatch(
      body.external_dealer_id,
      body.dealer_id,
      body.match_type,
      body.confidence_score,
    )
    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Create Dealer Match Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "CREATE_MATCH_FAILED", message: "Failed to create dealer match" }, correlationId },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    if (!body.match_id) {
      return NextResponse.json(
        { error: { code: "MISSING_MATCH_ID", message: "match_id is required" } },
        { status: 400 },
      )
    }

    const result = await deactivateExternalDealerMatch(body.match_id)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Deactivate Dealer Match Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "DEACTIVATE_MATCH_FAILED", message: "Failed to deactivate dealer match" }, correlationId },
      { status: 500 },
    )
  }
}
