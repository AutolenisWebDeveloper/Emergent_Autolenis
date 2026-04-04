import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

// Commission amount per OpenRoad agreement
const COMMISSION_AMOUNT = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { fundedAt, fundedAmount, rawPartnerReference } = body

    if (!fundedAt || !fundedAmount) {
      return NextResponse.json({ error: "Funded date and amount are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: lead, error: leadError } = await supabase
      .from("RefinanceLead")
      .select("id, partner, openroadFunded")
      .eq("id", id)
      .single()

    if (leadError || !lead) {
      console.error("[v0] Mark as funded - lead not found:", leadError)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (lead.openroadFunded) {
      return NextResponse.json({ error: "Lead is already marked as funded" }, { status: 400 })
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from("RefinanceLead")
      .update({
        openroadFunded: true,
        fundedAt: new Date(fundedAt).toISOString(),
        fundedAmount: Number.parseFloat(fundedAmount),
        commissionAmount: COMMISSION_AMOUNT,
        marketingRestriction: "NO_CREDIT_SOLICITATION",
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Mark as funded - update error:", updateError)
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
    }

    const { data: fundedLoan, error: fundedError } = await supabase
      .from("FundedLoan")
      .insert({
        leadId: id,
        partner: lead.partner,
        fundedAt: new Date(fundedAt).toISOString(),
        fundedAmount: Number.parseFloat(fundedAmount),
        commissionAmount: COMMISSION_AMOUNT,
        rawPartnerReference: rawPartnerReference || null,
      })
      .select()
      .single()

    if (fundedError) {
      console.error("[v0] Mark as funded - funded loan creation error:", fundedError)
      return NextResponse.json({ error: "Failed to create funded loan record" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      fundedLoan: fundedLoan,
    })
  } catch (error) {
    console.error("[v0] Mark as funded error:", error)
    return NextResponse.json({ error: "Failed to mark lead as funded" }, { status: 500 })
  }
}
