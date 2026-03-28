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
        .select("id, cashOtdCents, cash_otd_cents, createdAt", { count: "exact" }),
      supabase
        .from("SelectedDeal")
        .select("id, status, createdAt, updatedAt"),
      supabase
        .from("DepositPayment")
        .select("id, amountCents, amount, status, createdAt"),
      supabase
        .from("ServiceFeePayment")
        .select("id, remainingCents, amount, status, createdAt"),
    ])

    const auctions = auctionsResult.data || []
    const offers = offersResult.data || []
    const deals = dealsResult.data || []
    const deposits = depositsResult.data || []
    const fees = feesResult.data || []

    const totalAuctions = auctionsResult.count || auctions.length
    const totalBids = offersResult.count || offers.length

    const bidAmounts = offers
      .map((o: Record<string, unknown>) => (o["cashOtdCents"] as number) || (o["cash_otd_cents"] as number) || 0)
      .filter((v: number) => v > 0)
    const avgBid = bidAmounts.length > 0
      ? Math.round(bidAmounts.reduce((sum: number, v: number) => sum + v, 0) / bidAmounts.length)
      : 0

    const completedDeals = deals.filter((d: Record<string, unknown>) => d["status"] === "COMPLETED")
    let avgDaysToClose = 0
    if (completedDeals.length > 0) {
      const totalDays = completedDeals.reduce((sum: number, d: Record<string, unknown>) => {
        const created = new Date(d["createdAt"] as string).getTime()
        const updated = new Date(d["updatedAt"] as string).getTime()
        return sum + Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)))
      }, 0)
      avgDaysToClose = Math.round(totalDays / completedDeals.length)
    }

    const depositsHeld = deposits.filter(
      (d: Record<string, unknown>) => d["status"] === "PAID" || d["status"] === "held" || d["status"] === "HELD"
    ).length

    const lifecycle = [
      { label: "Buyers Signed Up", status: "active", count: deals.length },
      { label: "Auctions Created", status: "created", count: totalAuctions },
      { label: "Offers Received", status: "received", count: totalBids },
      { label: "Deals Selected", status: "selected", count: deals.filter((d: Record<string, unknown>) => d["status"] !== "CANCELLED").length },
      { label: "Deals Completed", status: "completed", count: completedDeals.length },
      { label: "Deals Cancelled", status: "cancelled", count: deals.filter((d: Record<string, unknown>) => d["status"] === "CANCELLED").length },
    ]

    const totalDepositCents = deposits.reduce((sum: number, d: Record<string, unknown>) => {
      return sum + ((d["amountCents"] as number) || Math.round(((d["amount"] as number) || 0) * 100))
    }, 0)

    const totalFeeCents = fees
      .filter((f: Record<string, unknown>) => f["status"] === "PAID")
      .reduce((sum: number, f: Record<string, unknown>) => {
        return sum + ((f["remainingCents"] as number) || Math.round(((f["amount"] as number) || 0) * 100))
      }, 0)

    const payments = {
      deposit: {
        count: deposits.length,
        amountCents: totalDepositCents,
        status: depositsHeld > 0 ? "active" : "none",
      },
      fees: {
        amountCents: totalFeeCents,
        status: totalFeeCents > 0 ? "PAID" : "NONE",
      },
      escrowStatus: depositsHeld > 0 ? "held" : "released",
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: { totalAuctions, totalBids, avgBid, avgDaysToClose, depositsHeld },
        lifecycle,
        payments,
      },
    })
  } catch (error) {
    logger.error("Operations report failed", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate operations report" },
      { status: 500 }
    )
  }
}
