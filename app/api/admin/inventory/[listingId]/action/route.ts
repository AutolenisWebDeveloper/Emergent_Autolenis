import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"
import { z } from "zod"

const schema = z.object({
  action: z.enum([
    "SUPPRESS",
    "RESTORE",
    "MARK_SOLD",
    "MARK_HOLD",
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

    // Look up the InventoryItem directly
    const { data: listing, error: listingError } = await supabase
      .from("InventoryItem")
      .select("id, status")
      .eq("id", listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    let nextStatus = listing.status

    if (action === "SUPPRESS") nextStatus = "REMOVED"
    if (action === "RESTORE") nextStatus = "AVAILABLE"
    if (action === "MARK_SOLD") nextStatus = "SOLD"
    if (action === "MARK_HOLD") nextStatus = "HOLD"

    const { error: updateError } = await supabase
      .from("InventoryItem")
      .update({
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", listingId)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update inventory item", details: updateError.message },
        { status: 500 },
      )
    }

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
