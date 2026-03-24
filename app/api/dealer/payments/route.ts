import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer profile
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id, workspaceId")
      .eq("userId", user.userId)
      .single()

    if (!dealer) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch service fee payments for this dealer's deals
    const { data: deals } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("dealerId", dealer.id)

    const dealIds = deals?.map((d: { id: string }) => d.id) || []

    if (dealIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data: payments } = await supabase
      .from("ServiceFeePayment")
      .select("*")
      .in("dealId", dealIds)
      .order("createdAt", { ascending: false })

    const formatted = (payments || []).map((p: any) => ({
      id: p.id,
      description: `Service Fee — Deal ${p.dealId?.slice(0, 8)}…`,
      amount: p.amount || 0,
      status: p.status || "DUE",
      feeType: p.feeType || "Service Fee",
      dueDate: p.dueDate || p.createdAt,
      paidAt: p.paidAt,
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    console.error("[Dealer Payments] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
