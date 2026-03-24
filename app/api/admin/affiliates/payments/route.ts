import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
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
    const affiliateId = searchParams.get("affiliateId") || undefined
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminAffiliatePayments({ status, affiliateId, page, limit }))
    }

    const skip = (page - 1) * limit
    const supabase = await createClient()

    let query = supabase.from("Payout").select(
      `
      id,
      affiliateId,
      amount,
      paymentMethod,
      status,
      paymentId,
      paidAt,
      createdAt,
      affiliate:Affiliate(
        referralCode,
        user:User!Affiliate_userId_fkey(email, firstName, lastName)
      )
    `,
      { count: "exact" },
    )

    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (affiliateId) {
      query = query.eq("affiliateId", affiliateId)
    }

    const { data: payments, error, count } = await query
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) {
      const correlationId = randomUUID()
      logger.error("[Admin Affiliate Payments Error]", error, { correlationId })
      return NextResponse.json({ error: "Failed to load payments", correlationId }, { status: 500 })
    }

    return NextResponse.json({
      payments: (payments || []).map((p: any) => ({
        id: p.id,
        affiliateId: p.affiliateId,
        amount: p.amount,
        method: p.paymentMethod || null,
        status: p.status,
        externalTransactionId: p.paymentId || null,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        affiliate: p.affiliate ? {
          referralCode: p.affiliate.referralCode,
          user: p.affiliate.user ? {
            email: p.affiliate.user.email,
            firstName: p.affiliate.user.firstName,
            lastName: p.affiliate.user.lastName,
          } : null,
        } : null,
      })),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (error) {
    const correlationId = randomUUID()
    logger.error("[Admin Affiliate Payments Error]", error, { correlationId })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
