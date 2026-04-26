import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"
import { promoteRawListing } from "@/lib/services/inventory-sourcing/promote.service"
import { z } from "zod"

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

const ACTION_STATUS_MAP: Record<string, string> = {
  SUPPRESS: "SUPPRESSED",
  RESTORE: "ACTIVE",
  MARK_STALE: "STALE",
  PROMOTE_TO_BUYER_VISIBLE: "BUYER_VISIBLE",
  SEND_TO_REVIEW: "REVIEW",
}

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

    // Look up the canonical listing
    const { data: listing, error: listingError } = await supabase
      .from("inventory_listings_canonical")
      .select("id, status, raw_listing_id")
      .eq("id", listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    // Handle RENORMALIZE separately
    if (action === "RENORMALIZE") {
      if (!listing.raw_listing_id) {
        return NextResponse.json({ error: "Listing has no raw source record" }, { status: 400 })
      }

      // Fetch the raw listing
      const { data: rawListing, error: rawError } = await supabase
        .from("inventory_raw_listings")
        .select("*")
        .eq("id", listing.raw_listing_id)
        .single()

      if (rawError || !rawListing) {
        return NextResponse.json({ error: "Raw listing source not found" }, { status: 404 })
      }

      await promoteRawListing(rawListing)

      // Log audit event
      await supabase.from("inventory_admin_events").insert({
        listing_id: listingId,
        action,
        actor_user_id: user.userId,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({ success: true, action })
    }

    // Status transition
    const nextStatus = ACTION_STATUS_MAP[action]

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

    // Log audit event
    await supabase.from("inventory_admin_events").insert({
      listing_id: listingId,
      action,
      actor_user_id: user.userId,
      previous_status: listing.status,
      new_status: nextStatus,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      action,
      previousStatus: listing.status,
      status: nextStatus,
    })
  } catch (error) {
    console.error("[AdminInventoryAction] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
