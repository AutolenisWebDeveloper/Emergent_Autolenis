import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: mockSelectors.operationsReport() })
    }

    const supabase = await createClient()

    const [auctionsResult, offersResult, dealsResult, depositsResult, feesResult] = await Promise.all([
      supabase
        .from("Auction")
        .select("id, status, createdAt, closedAt", { count: "exact" }),
      supabase
        .from("AuctionOffer")
        .select("id, cashOtd, createdAt", { count: "exact" }),
      supabase
        .from("SelectedDeal")
        .select("id, status, createdAt, updatedAt"),
      supabase
        .from("DepositPayment")
        .select("id, amount, status, createdAt"),
      supabase
        .from("ServiceFeePayment")
        .select("id, finalAmount, status, createdAt"),
    ])

    const auctions = auctionsResult.data || []
    const offers = offersResult.data || []
    const deals = dealsResult.data || []
    const deposits = depositsResult.data || []
    const fees = feesResult.data || []

    const totalAuctions = auctionsResult.count || auctions.length
    const totalBids = offersResult.count || offers.length

    const bidAmounts = offers
      .map((o: Record<string, any>) => Number(o.cashOtd) || 0)
      .filter((v: number) => v > 0)

    const avgBid = bidAmounts.length > 0
      ? Math.round(bidAmounts.reduce((s: number, v: number) => s + v, 0) / bidAmounts.length)
      : 0

    const closedAuctions = auctions.filter(
      (a: Record<string, any>) => a.closedAt && a.createdAt
    )
    const avgDaysToClose =
      closedAuctions.length > 0
        ? Math.round(
            closedAuctions.reduce((sum: number, a: Record<string, any>) => {
              const created = new Date(a.createdAt).getTime()
              const closed = new Date(a.closedAt).getTime()
              return sum + (closed - created) / (1000 * 60 * 60 * 24)
            }, 0) / closedAuctions.length
          )
        : 0

    const depositsHeld = deposits.filter(
      (d: Record<string, any>) => d.status === "HELD" || d.status === "held"
    ).length

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalAuctions,
          totalBids,
          avgBid,
          avgDaysToClose,
          depositsHeld,
        },
        lifecycle: deals.map((d: Record<string, any>) => ({
          id: d.id,
          status: d.status,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
        payments: {
          totalDeposits: deposits.length,
          totalFees: fees.length,
          depositsHeld,
        },
      },
    })
  } catch (error) {
    logger.error("[AdminOperationsReport] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
