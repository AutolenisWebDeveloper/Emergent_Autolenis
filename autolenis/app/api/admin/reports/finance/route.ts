import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (isTestWorkspace(user)) {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    return NextResponse.json({ success: true, data: mockSelectors.financeReport({ from, to }) })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null

  const supabase = await createClient()
  const [depositResult, feeResult, payoutResult] = await Promise.all([
    supabase.from("DepositPayment").select("id, amountCents, amount, status, createdAt"),
    supabase.from("ServiceFeePayment").select("id, dealId, remainingCents, amount, status, createdAt"),
    supabase.from("Payout").select("id, dealId, affiliateId, dealerId, amount, status, createdAt"),
  ])

  const ledgerEntries = [
    ...(depositResult.data || []).flatMap((deposit: any) => {
      const amount = deposit.amountCents || Math.round((deposit.amount || 0) * 100)
      const createdAt = deposit.createdAt
      const baseEntry = {
        id: deposit.id,
        dealId: null,
        dealerId: null,
        affiliateId: null,
        createdAt,
      }
      const entries = [
        {
          ...baseEntry,
          type: "deposit",
          amount,
          status: deposit.status === "PAID" ? "posted" : "pending",
        },
      ]
      if (deposit.status === "REFUNDED") {
        entries.push({
          ...baseEntry,
          id: `${deposit.id}-refund`,
          type: "refund",
          amount,
          status: "posted",
        })
      }
      return entries
    }),
    ...(feeResult.data || []).flatMap((fee: any) => {
      const amount = fee.remainingCents || Math.round((fee.amount || 0) * 100)
      const baseEntry = {
        id: fee.id,
        dealId: fee.dealId || null,
        dealerId: null,
        affiliateId: null,
        createdAt: fee.createdAt,
      }
      const entries = [
        {
          ...baseEntry,
          type: "fee",
          amount,
          status: fee.status === "PAID" ? "posted" : "pending",
        },
      ]
      if (fee.status === "REFUNDED") {
        entries.push({
          ...baseEntry,
          id: `${fee.id}-refund`,
          type: "refund",
          amount,
          status: "posted",
        })
      }
      return entries
    }),
    ...(payoutResult.data || []).map((payout: any) => ({
      id: payout.id,
      type: "payout",
      amount: Math.round((payout.amount || 0) * 100),
      dealId: payout.dealId || null,
      dealerId: payout.dealerId || null,
      affiliateId: payout.affiliateId || null,
      createdAt: payout.createdAt,
      status: payout.status === "COMPLETED" ? "posted" : "pending",
    })),
  ].filter((entry) => {
    const timestamp = new Date(entry.createdAt).getTime()
    if (fromDate && timestamp < fromDate.getTime()) return false
    if (toDate && timestamp > toDate.getTime()) return false
    return true
  })

  const depositsReceived = ledgerEntries.filter((entry) => entry.type === "deposit" && entry.status === "posted")
  const platformFees = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted")
  const buyerPaymentsRequested = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "pending")
  const buyerPaymentsReceived = ledgerEntries.filter((entry) => entry.type === "fee" && entry.status === "posted")
  const refunds = ledgerEntries.filter((entry) => entry.type === "refund")
  const payouts = ledgerEntries.filter((entry) => entry.type === "payout")
  const affiliatePayoutsPending = payouts.filter((entry) => entry.affiliateId && entry.status === "pending")
  const affiliatePayoutsPaid = payouts.filter((entry) => entry.affiliateId && entry.status === "posted")
  const dealerPayouts = payouts.filter((entry) => entry.dealerId)

  const totalDeposits = depositsReceived.reduce((sum, entry) => sum + entry.amount, 0)
  const totalFees = platformFees.reduce((sum, entry) => sum + entry.amount, 0)
  const totalRefunds = refunds.reduce((sum, entry) => sum + entry.amount, 0)
  const netRevenue = totalFees - affiliatePayoutsPaid.reduce((sum, entry) => sum + entry.amount, 0) - totalRefunds

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        depositsReceived: totalDeposits,
        buyerPaymentsRequested: buyerPaymentsRequested.reduce((sum, entry) => sum + entry.amount, 0),
        buyerPaymentsReceived: buyerPaymentsReceived.reduce((sum, entry) => sum + entry.amount, 0),
        platformFees: totalFees,
        affiliatePayoutsPending: affiliatePayoutsPending.reduce((sum, entry) => sum + entry.amount, 0),
        affiliatePayoutsPaid: affiliatePayoutsPaid.reduce((sum, entry) => sum + entry.amount, 0),
        dealerPayouts: dealerPayouts.reduce((sum, entry) => sum + entry.amount, 0),
        refunds: totalRefunds,
        netRevenue,
      },
      ledger: ledgerEntries,
    },
  })
  } catch (error) {
    console.error("[AdminFinanceReport] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
