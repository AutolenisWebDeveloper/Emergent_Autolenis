import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { logger } from "@/lib/logger"

const RECONCILIATION_TOLERANCE = 0.01

function correlationId() {
  return crypto.randomUUID()
}

function getTestReconciliation() {
  return {
    stripe: { gross: 125750, refunds: 4500, chargebacks: 1200 },
    db: { gross: 125750, refunds: 4500, chargebacks: 1200 },
    mismatches: [],
    missingInDb: [],
    missingInStripe: [],
    status: "RECONCILED",
    reconciledAt: new Date().toISOString(),
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Unauthorized", correlationId: correlationId() },
      { status: 401 }
    )
  }

  if (isTestWorkspace(user)) {
    return NextResponse.json({ success: true, data: getTestReconciliation() })
  }

  try {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    // Fetch Stripe charges from last 30 days
    const stripeCharges: { id: string; amount: number; refunded: boolean; disputed: boolean; payment_intent: string | null }[] = []
    let hasMore = true
    let startingAfter: string | undefined
    while (hasMore) {
      const params: any = {
        limit: 100,
        created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
      }
      if (startingAfter) params.starting_after = startingAfter
      const charges = await stripe.charges.list(params)
      for (const c of charges.data) {
        stripeCharges.push({
          id: c.id,
          amount: c.amount / 100,
          refunded: c.refunded,
          disputed: c.disputed,
          payment_intent: typeof c.payment_intent === "string" ? c.payment_intent : null,
        })
      }
      hasMore = charges.has_more
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1]!.id
      } else {
        hasMore = false
      }
    }

    // Fetch DB transactions
    const { data: dbTransactions } = await supabase
      .from("Transaction")
      .select("stripePaymentIntentId, stripeChargeId, grossAmount, type, status")
      .gte("createdAt", thirtyDaysAgo.toISOString())

    const dbTxByPi = new Map<string, any>()
    for (const tx of dbTransactions || []) {
      if (tx.stripePaymentIntentId) dbTxByPi.set(tx.stripePaymentIntentId, tx)
      if (tx.stripeChargeId) dbTxByPi.set(tx.stripeChargeId, tx)
    }

    const stripeGross = stripeCharges.filter((c) => !c.refunded).reduce((s, c) => s + c.amount, 0)
    const stripeRefunds = stripeCharges.filter((c) => c.refunded).reduce((s, c) => s + c.amount, 0)
    const stripeChargebacks = stripeCharges.filter((c) => c.disputed).reduce((s, c) => s + c.amount, 0)

    const dbPayments = (dbTransactions || []).filter((t: any) => t.type === "PAYMENT" && t.status === "SUCCEEDED")
    const dbRefunds = (dbTransactions || []).filter((t: any) => t.type === "REFUND")
    const dbGross = dbPayments.reduce((s: number, t: any) => s + (t.grossAmount || 0), 0)
    const dbRefundTotal = dbRefunds.reduce((s: number, t: any) => s + (t.grossAmount || 0), 0)

    const { data: dbChargebacks } = await supabase
      .from("Chargeback")
      .select("amount")
      .gte("createdAt", thirtyDaysAgo.toISOString())
    const dbCbTotal = (dbChargebacks || []).reduce((s: number, c: any) => s + (c.amount || 0), 0)

    // Find mismatches
    const missingInDb: string[] = []
    const mismatches: { stripeId: string; stripeAmount: number; dbAmount: number }[] = []
    for (const charge of stripeCharges) {
      const key = charge.payment_intent || charge.id
      const dbTx = dbTxByPi.get(key)
      if (!dbTx) {
        missingInDb.push(key)
      } else if (Math.abs(dbTx.grossAmount - charge.amount) > RECONCILIATION_TOLERANCE) {
        mismatches.push({ stripeId: key, stripeAmount: charge.amount, dbAmount: dbTx.grossAmount })
      }
    }

    // Find transactions in DB not in Stripe
    const stripeIds = new Set(stripeCharges.map((c) => c.payment_intent || c.id))
    const missingInStripe = (dbTransactions || [])
      .filter((t: any) => t.stripePaymentIntentId && !stripeIds.has(t.stripePaymentIntentId))
      .map((t: any) => t.stripePaymentIntentId)

    const hasIssues = missingInDb.length > 0 || missingInStripe.length > 0 || mismatches.length > 0 ||
      Math.abs(stripeGross - dbGross) > RECONCILIATION_TOLERANCE

    return NextResponse.json({
      success: true,
      data: {
        stripe: { gross: stripeGross, refunds: stripeRefunds, chargebacks: stripeChargebacks },
        db: { gross: dbGross, refunds: dbRefundTotal, chargebacks: dbCbTotal },
        mismatches,
        missingInDb,
        missingInStripe,
        status: hasIssues ? "MISMATCH" : "RECONCILED",
        reconciledAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    logger.error("Reconciliation failed", { error: error.message })
    return NextResponse.json(
      { error: "Reconciliation failed", correlationId: correlationId() },
      { status: 500 }
    )
  }
}

export async function POST() {
  const user = await getSessionUser()
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden – Super Admin required", correlationId: correlationId() },
      { status: 403 }
    )
  }

  if (isTestWorkspace(user)) {
    return NextResponse.json({ success: true, synced: 0 })
  }

  try {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    let synced = 0

    let hasMore = true
    let startingAfter: string | undefined
    while (hasMore) {
      const params: any = {
        limit: 100,
        created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
      }
      if (startingAfter) params.starting_after = startingAfter
      const charges = await stripe.charges.list(params)
      for (const charge of charges.data) {
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null
        // Use individual .eq() checks instead of .or() to avoid string interpolation
        let existingQuery = supabase
          .from("Transaction")
          .select("id")
          .eq("stripeChargeId", charge.id)
          .limit(1)
          .maybeSingle()
        const { data: byChargeId } = await existingQuery
        let existing = byChargeId
        if (!existing && piId) {
          const { data: byPiId } = await supabase
            .from("Transaction")
            .select("id")
            .eq("stripePaymentIntentId", piId)
            .limit(1)
            .maybeSingle()
          existing = byPiId
        }

        if (!existing) {
          await supabase.from("Transaction").insert({
            stripePaymentIntentId: piId,
            stripeChargeId: charge.id,
            type: charge.refunded ? "REFUND" : "PAYMENT",
            grossAmount: charge.amount / 100,
            stripeFee: 0,
            platformFee: 0,
            netAmount: charge.amount / 100,
            currency: charge.currency,
            status: charge.status === "succeeded" ? "SUCCEEDED" : charge.status === "failed" ? "FAILED" : "PENDING",
            workspaceId: user.workspace_id || null,
          })
          synced++
        }
      }
      hasMore = charges.has_more
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1]!.id
      } else {
        hasMore = false
      }
    }

    // Log audit entry — must succeed for compliance
    const cid = correlationId()
    const { error: auditError } = await supabase.from("FinancialAuditLog").insert({
      adminId: user.userId,
      action: "STRIPE_SYNC",
      entityType: "Transaction",
      entityId: "bulk",
      metadata: { synced, period: "30d" },
      workspaceId: user.workspace_id || null,
    })
    if (auditError) {
      logger.error("[Financial Reconciliation] Audit log write failed", { correlationId: cid, error: auditError })
      return NextResponse.json(
        { error: "Stripe sync completed but audit log write failed", correlationId: cid },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, synced })
  } catch (error: any) {
    logger.error("Stripe sync failed", { error: error.message })
    return NextResponse.json(
      { error: "Sync failed", correlationId: correlationId() },
      { status: 500 }
    )
  }
}
