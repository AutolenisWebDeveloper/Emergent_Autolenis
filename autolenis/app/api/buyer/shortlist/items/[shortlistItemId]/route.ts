import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { ShortlistService } from "@/lib/services/shortlist.service"

// DELETE - Remove specific shortlist item by ID
export async function DELETE(_request: Request, { params }: { params: Promise<{ shortlistItemId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { shortlistItemId } = await params
    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      throw new Error("Buyer profile not found")
    }

    // Find the item and verify ownership
    const { data: item, error: itemError } = await supabase
      .from("ShortlistItem")
      .select(`
        *,
        shortlist:Shortlist!inner(*)
      `)
      .eq("id", shortlistItemId)
      .is("removed_at", null)
      .eq("shortlist.buyerId", buyer.id)
      .eq("shortlist.active", true)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ success: false, error: "Item not found or you don't have access" }, { status: 404 })
    }

    // Soft delete
    const { error: updateError } = await supabase
      .from("ShortlistItem")
      .update({
        removed_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", shortlistItemId)

    if (updateError) {
      throw updateError
    }

    const result = await ShortlistService.getOrCreateShortlist(buyer.id)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[Shortlist Item Delete] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete shortlist item" }, { status: 500 })
  }
}

// PATCH - Update notes for a shortlist item
export async function PATCH(request: Request, { params }: { params: Promise<{ shortlistItemId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { shortlistItemId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      throw new Error("Buyer profile not found")
    }

    const result = await ShortlistService.updateItemNotes(buyer.id, shortlistItemId, body.notes ?? null)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[Shortlist Item Patch] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to update shortlist item" }, { status: 500 })
  }
}
