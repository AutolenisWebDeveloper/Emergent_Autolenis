import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"
import { z } from "zod"
import { promoteRawListing } from "@/lib/services/inventory-sourcing/promote.service"

const schema = z.object({
  action: z.enum([
    "SUPPRESS",
    "RESTORE",
    "MARK_STALE",
    "PROMOTE_TO_BUYER_VISIBLE",
    "SEND_TO_REVIEW",
    "RENORMALIZE",
  ]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
  const user = await getSessionUser()

  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listingId } = await params
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid action", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = getSupabase()
  const action = parsed.data.action

  const { data: listing, error: listingError } = await supabase
    .from("inventory_listings_canonical")
    .select("*")
    .eq("id", listingId)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (action === "RENORMALIZE") {
    if (!listing.raw_listing_id) {
      return NextResponse.json(
        { error: "Listing has no raw source record" },
        { status: 400 },
      )
    }

    const { data: raw, error: rawError } = await supabase
      .from("scrape_raw_listings")
      .select("*")
      .eq("id", listing.raw_listing_id)
      .single()

    if (rawError || !raw) {
      return NextResponse.json(
        { error: "Raw listing source not found" },
        { status: 404 },
      )
    }

    const result = await promoteRawListing(raw)

    const { error: auditError } = await supabase.from("inventory_admin_events").insert({
      listing_id: listingId,
      action,
      actor_user_id: user.userId,
      payload: { renormalized: true, result },
    })

    if (auditError) {
      console.error("[Admin Inventory Action] Audit event insert failed", {
        listingId,
        action,
        error: auditError.message,
      })
    }

    return NextResponse.json({ success: true, action, result })
  }

  let nextStatus = listing.status

  if (action === "SUPPRESS") nextStatus = "SUPPRESSED"
  if (action === "RESTORE") nextStatus = "ACTIVE"
  if (action === "MARK_STALE") nextStatus = "STALE"
  if (action === "PROMOTE_TO_BUYER_VISIBLE") nextStatus = "BUYER_VISIBLE"
  if (action === "SEND_TO_REVIEW") nextStatus = "REVIEW"

  const { error: updateError } = await supabase
    .from("inventory_listings_canonical")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update listing", details: updateError.message },
      { status: 500 },
    )
  }

  const { error: auditError } = await supabase.from("inventory_admin_events").insert({
    listing_id: listingId,
    action,
    actor_user_id: user.userId,
    payload: {
      previous_status: listing.status,
      next_status: nextStatus,
    },
  })

  if (auditError) {
    console.error("[Admin Inventory Action] Audit event insert failed", {
      listingId,
      action,
      error: auditError.message,
    })
  }

  return NextResponse.json({
    success: true,
    action,
    status: nextStatus,
  })
  } catch (error) {
    console.error("[AdminInventoryAction] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
