import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["DEALER_USER"])
    const { dealId } = await params
    const body = await request.json()

    const { type, notes, dueDate } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: "type is required" },
        { status: 400 },
      )
    }

    // Verify dealer user
    const supabaseClient = await createClient()
    const { data: dealerUser, error: dealerError } = await supabaseClient
      .from("DealerUser")
      .select("*")
      .eq("userId", session.userId)
      .single()

    if (dealerError || !dealerUser) {
      return NextResponse.json(
        { success: false, error: "Dealer not found" },
        { status: 403 },
      )
    }

    // Verify dealer owns the deal
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId, dealerId")
      .eq("id", dealId)
      .eq("dealerId", dealerUser.dealerId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found or access denied" },
        { status: 404 },
      )
    }

    const { data: docRequest, error: insertError } = await supabase
      .from("InsuranceDocRequest")
      .insert({
        dealId,
        buyerId: deal.buyerId,
        requestedByRole: "DEALER",
        requestedByUserId: session.userId,
        type,
        status: "REQUESTED",
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Dealer DocRequest] Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "Failed to create document request" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: docRequest })
  } catch (error) {
    console.error("[Dealer DocRequest] POST error:", error)
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 400 })
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["DEALER_USER"])
    const { dealId } = await params

    // Verify dealer user
    const supabaseClient = await createClient()
    const { data: dealerUser, error: dealerError } = await supabaseClient
      .from("DealerUser")
      .select("*")
      .eq("userId", session.userId)
      .single()

    if (dealerError || !dealerUser) {
      return NextResponse.json(
        { success: false, error: "Dealer not found" },
        { status: 403 },
      )
    }

    // Verify dealer owns the deal
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("dealerId", dealerUser.dealerId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found or access denied" },
        { status: 404 },
      )
    }

    const { data: requests, error } = await supabase
      .from("InsuranceDocRequest")
      .select("*")
      .eq("dealId", dealId)
      .order("createdAt", { ascending: false })

    if (error) {
      console.error("[Dealer DocRequest] GET error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch document requests" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error("[Dealer DocRequest] GET error:", error)
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 400 })
  }
}
