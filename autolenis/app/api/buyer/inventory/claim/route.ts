import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createLead } from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

/**
 * POST /api/buyer/inventory/claim
 *
 * "Claim this vehicle" — buyer expresses interest in an existing canonical listing.
 * Creates a CLAIM-type lead tied to the listing.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    if (!body.listing_id) {
      return NextResponse.json(
        { error: { code: "MISSING_LISTING_ID", message: "listing_id is required to claim a vehicle" } },
        { status: 400 },
      )
    }

    const lead = await createLead(
      {
        listing_id: body.listing_id,
        canonical_vehicle_id: body.canonical_vehicle_id ?? null,
        buyer_user_id: user.userId,
        buyer_name: body.buyer_name ?? null,
        buyer_email: body.buyer_email ?? null,
        buyer_phone: body.buyer_phone ?? null,
        buyer_zip: body.buyer_zip ?? null,
        lead_type: "CLAIM",
        notes: body.notes ?? null,
      },
      user.userId,
    )

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Buyer Claim Vehicle Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "CLAIM_FAILED", message: "Failed to claim vehicle" }, correlationId },
      { status: 500 },
    )
  }
}
