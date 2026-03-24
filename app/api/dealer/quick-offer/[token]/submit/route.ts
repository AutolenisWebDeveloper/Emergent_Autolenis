import { type NextRequest, NextResponse } from "next/server"
import * as dealerQuickOfferService from "@/lib/services/dealer-quick-offer.service"

export const dynamic = "force-dynamic"

// POST /api/dealer/quick-offer/[token]/submit — Submit a provisional offer
// This route is PUBLIC (no auth required) — accessed via invite link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const body = await req.json()

    // Basic input validation
    if (!body.make && !body.vin) {
      return NextResponse.json(
        { error: "At least a VIN or vehicle make is required" },
        { status: 400 },
      )
    }

    const offer = await dealerQuickOfferService.submitOffer(token, {
      vin: body.vin,
      year: body.year ? Number(body.year) : undefined,
      make: body.make,
      model: body.model,
      trim: body.trim,
      mileage: body.mileage ? Number(body.mileage) : undefined,
      priceCents: body.priceCents ? Number(body.priceCents) : undefined,
      conditionNotes: body.conditionNotes,
      availableDate: body.availableDate,
      notes: body.notes,
    })

    return NextResponse.json({ success: true, data: offer })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit offer"
    const status = message.includes("expired") || message.includes("already been") ? 400 : 500
    console.error("[quick-offer] Submit error:", error)
    return NextResponse.json({ error: message }, { status })
  }
}
