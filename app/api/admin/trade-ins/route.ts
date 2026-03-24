import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET - Admin lists all trade-in submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = 20
    const skip = (page - 1) * limit

    const supabase = await createClient()

    const [tradeInsResult, countResult] = await Promise.all([
      supabase
        .from("TradeIn")
        .select(`
          *,
          buyer:User!TradeIn_buyerId_fkey(
            email,
            buyerProfile:BuyerProfile(firstName, lastName)
          )
        `)
        .order("createdAt", { ascending: false })
        .range(skip, skip + limit - 1),
      supabase.from("TradeIn").select("id", { count: "exact", head: true }),
    ])

    if (tradeInsResult.error) {
      console.error("[Admin TradeIn API] GET error:", tradeInsResult.error)
      return NextResponse.json({ success: false, error: "Failed to fetch trade-ins" }, { status: 500 })
    }

    const total = countResult.count || 0

    return NextResponse.json({
      success: true,
      data: {
        tradeIns: (tradeInsResult.data || []).map((t: any) => ({
          id: t.id,
          buyerId: t.buyerId,
          buyerEmail: t.buyer?.email || "N/A",
          buyerName: t.buyer?.buyerProfile
            ? `${t.buyer.buyerProfile.firstName || ""} ${t.buyer.buyerProfile.lastName || ""}`.trim() || "N/A"
            : "N/A",
          hasTrade: t.hasTrade,
          vin: t.vin,
          mileage: t.mileage,
          condition: t.condition,
          hasLoan: t.hasLoan,
          estimatedPayoffCents: t.estimatedPayoffCents,
          stepCompleted: t.stepCompleted,
          createdAt: t.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    console.error("[Admin TradeIn API] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch trade-ins" }, { status: 500 })
  }
}
