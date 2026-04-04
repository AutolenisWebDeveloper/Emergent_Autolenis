import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || undefined
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminPayouts({ status, page, limit }))
    }

    const skip = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase.from("Payout").select(
      `
      id,
      affiliateId,
      amount,
      status,
      requestedAt,
      processedAt,
      transactionId,
      affiliate:Affiliate(
        referralCode,
        bankDetails,
        user:User!Affiliate_userId_fkey(email, firstName, lastName)
      )
    `,
      { count: "exact" },
    )

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: payouts, error, count } = await query
      .order("requestedAt", { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) {
      logger.error("[Admin Payouts Error]", error)
      return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 })
    }

    const stats = {
      pending: (payouts || []).filter((p: any) => p.status === "PENDING").length,
      completed: (payouts || []).filter((p: any) => p.status === "COMPLETED").length,
      totalPending: (payouts || [])
        .filter((p: any) => p.status === "PENDING")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      totalPaid: (payouts || [])
        .filter((p: any) => p.status === "COMPLETED")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
    }

    return NextResponse.json({
      payouts: (payouts || []).map((p: any) => ({
        id: p.id,
        affiliateId: p.affiliateId,
        amount: p.amount,
        status: p.status,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        transactionId: p.transactionId,
        affiliate: p.affiliate ? {
          referralCode: p.affiliate.referralCode,
          bankDetails: p.affiliate.bankDetails,
          user: p.affiliate.user ? {
            email: p.affiliate.user.email,
            firstName: p.affiliate.user.firstName,
            lastName: p.affiliate.user.lastName,
          } : null,
        } : null,
      })),
      stats,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (error) {
    logger.error("[Admin Payouts Error]", error)
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 })
  }
}
