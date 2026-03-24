import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { createClient } from "@/lib/supabase/server"

function correlationId() {
  return crypto.randomUUID()
}

function getDateRange(range: string | null, from: string | null, to: string | null) {
  const now = new Date()
  const endDate = to ? new Date(to) : now
  let startDate: Date

  switch (range) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 86400000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 86400000)
      break
    case "mtd":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "qtd": {
      const q = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), q, 1)
      break
    }
    case "ytd":
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    default:
      startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000)
  }

  // Previous period of same length for comparison
  const rangeMs = endDate.getTime() - startDate.getTime()
  const prevEnd = new Date(startDate.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - rangeMs)

  return { startDate, endDate, prevStart, prevEnd }
}

function getTestWorkspaceData() {
  const now = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 86400000)
    return d.toISOString().slice(0, 10)
  })

  return {
    summary: {
      grossRevenue: { value: 125750, change: 12.5 },
      netRevenue: { value: 98200, change: 8.3 },
      totalTransactions: { value: 342, change: 15.1 },
      refundTotal: { value: 4500, change: -5.2 },
      chargebacksTotal: { value: 1200, change: -20.0 },
      pending: { value: 8750, change: 3.4 },
      affiliateCommissionsAccrued: { value: 6800, change: 22.1 },
      affiliateCommissionsPaid: { value: 4200, change: 18.0 },
      dealerFeesCollected: { value: 15600, change: 10.5 },
      refinanceRevenue: { value: 3200, change: 45.0 },
    },
    revenueBreakdown: [
      { name: "Buyer Fees", value: 65000 },
      { name: "Dealer Fees", value: 35000 },
      { name: "Refinance Fees", value: 15000 },
      { name: "Other", value: 10750 },
    ],
    revenueTrend: days.map((date) => ({
      date,
      gross: Math.round(3000 + Math.random() * 2000),
      net: Math.round(2000 + Math.random() * 1500),
    })),
    transactions: Array.from({ length: 20 }, (_, i) => ({
      id: `txn_test_${i}`,
      date: new Date(now.getTime() - i * 86400000).toISOString(),
      type: ["PAYMENT", "PAYMENT", "REFUND", "PAYOUT"][i % 4] as string,
      status: ["SUCCEEDED", "SUCCEEDED", "PENDING", "SUCCEEDED"][i % 4] as string,
      grossAmount: Math.round(500 + Math.random() * 3000),
      stripeFee: Math.round(15 + Math.random() * 90),
      platformFee: Math.round(50 + Math.random() * 200),
      netAmount: Math.round(400 + Math.random() * 2700),
      userId: `user_test_${i % 5}`,
      userType: ["BUYER", "DEALER", "AFFILIATE"][i % 3] as string,
      dealId: i % 2 === 0 ? `deal_test_${i}` : null,
      refinanceId: i % 5 === 0 ? `refi_test_${i}` : null,
      stripePaymentIntentId: `pi_test_${i}`,
      currency: "usd",
    })),
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Unauthorized", correlationId: correlationId() },
      { status: 401 }
    )
  }

  if (isTestWorkspace(user)) {
    return NextResponse.json({ success: true, data: getTestWorkspaceData() })
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json(
        { error: "Forbidden: no workspace", correlationId: correlationId() },
        { status: 403 }
      )
    }

    const { startDate, endDate, prevStart, prevEnd } = getDateRange(range, from, to)
    const supabase = await createClient()

    // Helper: append workspace filter
    const wsFilter = (q: any) => q.eq("workspaceId", wsId)

    // Fetch transactions from the new Transaction table
    let txQuery = wsFilter(supabase
      .from("Transaction")
      .select("*")
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString())
      .order("createdAt", { ascending: false }))

    if (type) txQuery = txQuery.eq("type", type)
    if (status) txQuery = txQuery.eq("status", status)
    if (search) {
      // Sanitize search input to prevent injection in Supabase .or() filter
      const sanitized = search.replace(/[%_'"\\]/g, "")
      if (sanitized) {
        txQuery = txQuery.or(`userId.ilike.%${sanitized}%,stripePaymentIntentId.ilike.%${sanitized}%`)
      }
    }

    // Fetch previous period for comparison
    const prevQuery = wsFilter(supabase
      .from("Transaction")
      .select("type, grossAmount, netAmount, status")
      .gte("createdAt", prevStart.toISOString())
      .lte("createdAt", prevEnd.toISOString()))

    // Fetch chargebacks
    const chargebackQuery = wsFilter(supabase
      .from("Chargeback")
      .select("*")
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString()))

    const prevChargebackQuery = wsFilter(supabase
      .from("Chargeback")
      .select("amount")
      .gte("createdAt", prevStart.toISOString())
      .lte("createdAt", prevEnd.toISOString()))

    // Fetch commissions
    const commAccruedQuery = wsFilter(supabase
      .from("Commission")
      .select("commissionAmount, status")
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString()))

    const prevCommQuery = wsFilter(supabase
      .from("Commission")
      .select("commissionAmount, status")
      .gte("createdAt", prevStart.toISOString())
      .lte("createdAt", prevEnd.toISOString()))

    // Fetch refinance funded
    const refiQuery = wsFilter(supabase
      .from("RefinanceLead")
      .select("commissionAmount, fundedAmount")
      .eq("openroadFunded", true)
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString()))

    const prevRefiQuery = wsFilter(supabase
      .from("RefinanceLead")
      .select("commissionAmount, fundedAmount")
      .eq("openroadFunded", true)
      .gte("createdAt", prevStart.toISOString())
      .lte("createdAt", prevEnd.toISOString()))

    const [txResult, prevResult, cbResult, prevCbResult, commResult, prevCommResult, refiResult, prevRefiResult] =
      await Promise.all([
        txQuery,
        prevQuery,
        chargebackQuery,
        prevChargebackQuery,
        commAccruedQuery,
        prevCommQuery,
        refiQuery,
        prevRefiQuery,
      ])

    const transactions = txResult.data || []
    const prevTransactions = prevResult.data || []
    const chargebacks = cbResult.data || []
    const prevChargebacks = prevCbResult.data || []
    const commissions = commResult.data || []
    const prevCommissions = prevCommResult.data || []
    const refinanceLeads = refiResult.data || []
    const prevRefinanceLeads = prevRefiResult.data || []

    // Calculate summaries
    const sum = (arr: any[], field: string) => arr.reduce((total, record) => total + (record[field] || 0), 0)
    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10

    const grossRevenue = sum(transactions.filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED"), "grossAmount")
    const prevGross = sum(prevTransactions.filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED"), "grossAmount")

    const netRevenue = sum(transactions.filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED"), "netAmount")
    const prevNet = sum(prevTransactions.filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED"), "netAmount")

    const totalTx = transactions.length
    const prevTotalTx = prevTransactions.length

    const refundTotal = sum(transactions.filter((t: any) => t.type === "REFUND"), "grossAmount")
    const prevRefund = sum(prevTransactions.filter((t: any) => t.type === "REFUND"), "grossAmount")

    const cbTotal = sum(chargebacks, "amount")
    const prevCbTotal = sum(prevChargebacks, "amount")

    const pendingTotal = sum(transactions.filter((t: any) => t.status === "PENDING"), "grossAmount")
    const prevPending = sum(prevTransactions.filter((t: any) => t.status === "PENDING"), "grossAmount")

    const commAccrued = sum(commissions, "commissionAmount")
    const prevCommAccrued = sum(prevCommissions, "commissionAmount")
    const commPaid = sum(commissions.filter((c: any) => c.status === "PAID"), "commissionAmount")
    const prevCommPaid = sum(prevCommissions.filter((c: any) => c.status === "PAID"), "commissionAmount")

    const dealerFees = sum(transactions.filter((t: any) => t.userType === "DEALER" && t.type === "PAYMENT"), "platformFee")
    const prevDealerFees = sum(prevTransactions.filter((t: any) => t.userType === "DEALER" && t.type === "PAYMENT"), "platformFee")

    const refiRevenue = sum(refinanceLeads, "commissionAmount")
    const prevRefiRevenue = sum(prevRefinanceLeads, "commissionAmount")

    // Revenue breakdown for donut chart
    const buyerFees = sum(transactions.filter((t: any) => t.userType === "BUYER" && t.type === "PAYMENT"), "platformFee")
    const refinanceFees = refiRevenue
    const otherFees = grossRevenue - buyerFees - dealerFees - refinanceFees

    // Revenue trend (daily)
    const trendMap = new Map<string, { gross: number; net: number }>()
    for (const tx of transactions) {
      if (tx.type !== "PAYMENT" || tx.status !== "SUCCEEDED") continue
      const day = new Date(tx.createdAt).toISOString().slice(0, 10)
      const entry = trendMap.get(day) || { gross: 0, net: 0 }
      entry.gross += tx.grossAmount || 0
      entry.net += tx.netAmount || 0
      trendMap.set(day, entry)
    }
    const revenueTrend = Array.from(trendMap.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          grossRevenue: { value: grossRevenue, change: pctChange(grossRevenue, prevGross) },
          netRevenue: { value: netRevenue, change: pctChange(netRevenue, prevNet) },
          totalTransactions: { value: totalTx, change: pctChange(totalTx, prevTotalTx) },
          refundTotal: { value: refundTotal, change: pctChange(refundTotal, prevRefund) },
          chargebacksTotal: { value: cbTotal, change: pctChange(cbTotal, prevCbTotal) },
          pending: { value: pendingTotal, change: pctChange(pendingTotal, prevPending) },
          affiliateCommissionsAccrued: { value: commAccrued, change: pctChange(commAccrued, prevCommAccrued) },
          affiliateCommissionsPaid: { value: commPaid, change: pctChange(commPaid, prevCommPaid) },
          dealerFeesCollected: { value: dealerFees, change: pctChange(dealerFees, prevDealerFees) },
          refinanceRevenue: { value: refiRevenue, change: pctChange(refiRevenue, prevRefiRevenue) },
        },
        revenueBreakdown: [
          { name: "Buyer Fees", value: buyerFees },
          { name: "Dealer Fees", value: dealerFees },
          { name: "Refinance Fees", value: refinanceFees },
          { name: "Other", value: Math.max(0, otherFees) },
        ],
        revenueTrend,
        transactions,
      },
    })
  } catch (error: any) {
    const cid = correlationId()
    console.error(`[financial-api] ${cid}:`, error?.message || error)
    return NextResponse.json(
      { error: "Internal server error", correlationId: cid },
      { status: 500 }
    )
  }
}
