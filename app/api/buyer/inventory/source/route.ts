import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createSourcingRequest } from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

/**
 * POST /api/buyer/inventory/source
 *
 * "Source this vehicle for me" — buyer submits vehicle criteria and
 * AutoLenis / admin will source matching options.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Must provide either notes or at least make to produce an actionable request
    if (!body.make && !body.notes) {
      return NextResponse.json(
        { error: { code: "MISSING_CRITERIA", message: "Provide at least make or notes for sourcing" } },
        { status: 400 },
      )
    }

    const request = await createSourcingRequest({
      buyer_user_id: user.userId,
      buyer_name: body.buyer_name ?? null,
      buyer_email: body.buyer_email ?? null,
      buyer_phone: body.buyer_phone ?? null,
      buyer_zip: body.buyer_zip ?? null,
      year_min: body.year_min ?? null,
      year_max: body.year_max ?? null,
      make: body.make ?? null,
      model: body.model ?? null,
      trim: body.trim ?? null,
      max_price: body.max_price ?? null,
      max_mileage: body.max_mileage ?? null,
      preferred_zip: body.preferred_zip ?? null,
      preferred_radius: body.preferred_radius ?? null,
      notes: body.notes ?? null,
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Buyer Source Vehicle Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "SOURCE_FAILED", message: "Failed to create sourcing request" }, correlationId },
      { status: 500 },
    )
  }
}
