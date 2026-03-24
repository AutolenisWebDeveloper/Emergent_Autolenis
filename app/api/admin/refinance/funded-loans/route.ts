import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = await createClient()

    let query = supabase.from("FundedLoan").select(
      `
      *,
      lead:RefinanceLead(
        firstName,
        lastName,
        email,
        state,
        vehicleYear,
        vehicleMake,
        vehicleModel
      )
    `,
      { count: "exact" },
    )

    if (startDate) {
      query = query.gte("fundedAt", startDate)
    }

    if (endDate) {
      query = query.lte("fundedAt", endDate)
    }

    const {
      data: fundedLoans,
      error,
      count,
    } = await query.order("fundedAt", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Admin funded loans error:", error)
      return NextResponse.json({ error: "Failed to fetch funded loans" }, { status: 500 })
    }

    // Calculate totals
    let totalQuery = supabase.from("FundedLoan").select("fundedAmount, commissionAmount")

    if (startDate) {
      totalQuery = totalQuery.gte("fundedAt", startDate)
    }

    if (endDate) {
      totalQuery = totalQuery.lte("fundedAt", endDate)
    }

    const { data: totalsData } = await totalQuery

    const totals = (totalsData || []).reduce(
      (acc, loan) => ({
        fundedAmount: acc.fundedAmount + (loan.fundedAmount || 0),
        commissionAmount: acc.commissionAmount + (loan.commissionAmount || 0),
      }),
      { fundedAmount: 0, commissionAmount: 0 },
    )

    return NextResponse.json({
      fundedLoans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      totals,
    })
  } catch (error) {
    console.error("Admin funded loans error:", error)
    return NextResponse.json({ error: "Failed to fetch funded loans" }, { status: 500 })
  }
}
