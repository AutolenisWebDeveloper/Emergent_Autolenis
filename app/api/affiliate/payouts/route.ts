import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { isUserAffiliate } from "@/lib/authz/roles"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isUserAffiliate(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // TEST workspace: return deterministic mock payout history + balances.
    if (isTestWorkspace(user as { workspace_mode?: string })) {
      const affiliate = mockDb.affiliateProfiles.find((p: any) => p.userId === user.id)
      const affiliateId = affiliate?.id
      const payouts = (mockDb.payouts || []).filter((p: any) => p.affiliateId === affiliateId)
      const completed = payouts.filter((p: any) => p.status === "COMPLETED")
      const pending = payouts.filter((p: any) => p.status === "PENDING")

      return NextResponse.json({
        payouts: payouts.map((p: any) => ({
          id: p.id,
          amount: (p.amountCents || 0) / 100,
          status: p.status,
          method: p.method || "Mock",
          providerRef: p.id,
          createdAt: p.requestedAt,
          paidAt: p.paidAt || null,
        })),
        stats: {
          completed: completed.reduce((s: number, p: any) => s + (p.amountCents || 0) / 100, 0),
          pending: pending.reduce((s: number, p: any) => s + (p.amountCents || 0) / 100, 0),
        },
        availableBalance: (affiliate?.pendingEarnings || 0) / 100,
        minimumPayout: 50,
      })
    }

    const supabase = await createClient()
    const { data: affiliate, error } = await supabase.from("Affiliate").select("*").eq("userId", user.id).maybeSingle()

    if (error) {
      logger.error("[Affiliate Payouts] DB error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!affiliate) {
      return NextResponse.json({
        payouts: [],
        stats: { completed: 0, pending: 0 },
        availableBalance: 0,
        minimumPayout: 50,
      })
    }

    const { data: payouts, error: payoutsError } = await supabase
      .from("Payout")
      .select("id,amount,status,provider,paymentMethod,paidAt,createdAt,total_amount_cents,totalAmountCents", { count: "exact" })
      .eq("affiliateId", affiliate.id)
      .order("createdAt", { ascending: false })

    if (payoutsError) {
      logger.error("[Affiliate Payouts] Payouts query error:", payoutsError)
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
    }

    const normalized = (payouts || []).map((p: any) => ({
      id: p.id,
      amount: typeof p.amount === "number" ? p.amount : (p.total_amount_cents || p.totalAmountCents || 0) / 100,
      status: p.status,
      method: p.paymentMethod || p.provider || "",
      providerRef: p.id,
      createdAt: p.createdAt,
      paidAt: p.paidAt || null,
    }))

    const completed = normalized.filter((p: any) => p.status === "COMPLETED")
    const pending = normalized.filter((p: any) => p.status !== "COMPLETED")

    return NextResponse.json({
      payouts: normalized,
      stats: {
        completed: completed.reduce((s: number, p: any) => s + (p.amount || 0), 0),
        pending: pending.reduce((s: number, p: any) => s + (p.amount || 0), 0),
      },
      availableBalance: (affiliate.available_balance_cents || (affiliate.pendingEarnings || 0) * 100 || 0) / 100,
      minimumPayout: 50,
    })
  } catch (error: unknown) {
    logger.error("[Affiliate Payouts] Error:", error)
    return NextResponse.json({ error: "Failed to get payouts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isUserAffiliate(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (isTestWorkspace(user as { workspace_mode?: string })) {
      return NextResponse.json({ success: true, payout: { id: `test_payout_${Date.now()}` } })
    }

    const supabase = await createClient()
    const { data: affiliate, error } = await supabase.from("Affiliate").select("*").eq("userId", user.id).maybeSingle()

    if (error) {
      logger.error("[Affiliate Payouts] DB error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    const body = await req.json()
    const { method, details } = body

    // Check minimum balance
    const availableBalance = affiliate.available_balance_cents || (affiliate.pendingEarnings || 0) * 100
    if (availableBalance < 5000) {
      // $50 minimum
      return NextResponse.json({ error: "Minimum payout is $50" }, { status: 400 })
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabase
      .from("Payout")
      .insert({
        affiliateId: affiliate.id,
        amount: availableBalance / 100,
        totalAmountCents: availableBalance,
        total_amount_cents: availableBalance,
        status: "PENDING",
        provider: method || "STRIPE",
        paymentMethod: method || "STRIPE",
        paymentDetails: details,
      })
      .select()
      .single()

    if (payoutError) {
      logger.error("[Affiliate Payouts] Create payout error:", payoutError)
      return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payout,
    })
  } catch (error: unknown) {
    logger.error("[Affiliate Payouts] Error:", error)
    return NextResponse.json({ error: "Failed to request payout" }, { status: 500 })
  }
}
