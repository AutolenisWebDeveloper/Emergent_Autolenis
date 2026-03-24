import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    // Verify the deal belongs to this buyer
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId")
      .eq("id", dealId)
      .eq("buyerId", session.userId)
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
      .eq("buyerId", session.userId)
      .order("createdAt", { ascending: false })

    if (error) {
      console.error("[Buyer DocRequest] GET error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch document requests" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error("[Buyer DocRequest] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch document requests" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params
    const body = await request.json()

    const { requestId, documentUrl } = body

    if (!requestId || !documentUrl) {
      return NextResponse.json(
        { success: false, error: "requestId and documentUrl are required" },
        { status: 400 },
      )
    }

    // Verify the deal belongs to this buyer
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId")
      .eq("id", dealId)
      .eq("buyerId", session.userId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found or access denied" },
        { status: 404 },
      )
    }

    // Verify the doc request exists and belongs to this buyer/deal
    const { data: existingRequest, error: fetchError } = await supabase
      .from("InsuranceDocRequest")
      .select("*")
      .eq("id", requestId)
      .eq("dealId", dealId)
      .eq("buyerId", session.userId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { success: false, error: "Document request not found" },
        { status: 404 },
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("InsuranceDocRequest")
      .update({
        status: "UPLOADED",
        documentUrl,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single()

    if (updateError) {
      console.error("[Buyer DocRequest] Update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update document request" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[Buyer DocRequest] POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload document" }, { status: 500 })
  }
}
