import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

function correlationId() {
  return crypto.randomUUID()
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",")
  const body = rows.map((row) => columns.map((col) => escapeCSV(row[col])).join(",")).join("\n")
  return `${header}\n${body}`
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Unauthorized", correlationId: correlationId() },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const type = searchParams.get("type")
  const format = searchParams.get("format") || "csv"

  if (format !== "csv") {
    return NextResponse.json(
      { error: "Only CSV format is currently supported", correlationId: correlationId() },
      { status: 400 }
    )
  }

  if (isTestWorkspace(user)) {
    const testRows = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      type: ["PAYMENT", "REFUND", "PAYOUT"][i % 3],
      status: "SUCCEEDED",
      gross_amount: (500 + i * 100).toFixed(2),
      stripe_fee: (15 + i * 3).toFixed(2),
      platform_fee: (50 + i * 10).toFixed(2),
      net_amount: (435 + i * 87).toFixed(2),
      user_type: ["BUYER", "DEALER", "AFFILIATE"][i % 3],
      stripe_payment_intent_id: `pi_test_${i}`,
      currency: "usd",
    }))

    const columns = ["date", "type", "status", "gross_amount", "stripe_fee", "platform_fee", "net_amount", "user_type", "stripe_payment_intent_id", "currency"]
    const csv = buildCSV(testRows, columns)

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="financial-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from("Transaction")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(5000)

    if (from) query = query.gte("createdAt", new Date(from).toISOString())
    if (to) query = query.lte("createdAt", new Date(to).toISOString())
    if (type) query = query.eq("type", type)

    const { data: transactions } = await query

    const rows = (transactions || []).map((tx: any) => ({
      date: tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 10) : "",
      type: tx.type,
      status: tx.status,
      gross_amount: (tx.grossAmount || 0).toFixed(2),
      stripe_fee: (tx.stripeFee || 0).toFixed(2),
      platform_fee: (tx.platformFee || 0).toFixed(2),
      net_amount: (tx.netAmount || 0).toFixed(2),
      user_id: tx.userId || "",
      user_type: tx.userType || "",
      deal_id: tx.dealId || "",
      refinance_id: tx.refinanceId || "",
      stripe_payment_intent_id: tx.stripePaymentIntentId || "",
      stripe_charge_id: tx.stripeChargeId || "",
      currency: tx.currency,
    }))

    const columns = [
      "date", "type", "status", "gross_amount", "stripe_fee", "platform_fee",
      "net_amount", "user_id", "user_type", "deal_id", "refinance_id",
      "stripe_payment_intent_id", "stripe_charge_id", "currency",
    ]
    const csv = buildCSV(rows, columns)

    // Log audit — must succeed for compliance; failure prevents data export
    const cid = correlationId()
    const { error: auditError } = await supabase.from("FinancialAuditLog").insert({
      adminId: user.userId,
      action: "EXPORT",
      entityType: "Transaction",
      entityId: "bulk",
      metadata: { rowCount: rows.length, format: "csv", from, to, type },
      workspaceId: user.workspace_id || null,
    })
    if (auditError) {
      logger.error("[Financial Export] Audit log write failed", { correlationId: cid, error: auditError })
      return NextResponse.json(
        { error: "Export generated but audit log write failed — export withheld for compliance", correlationId: cid },
        { status: 500 },
      )
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="financial-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    logger.error("[Financial Export] Export failed", { error: error.message })
    return NextResponse.json(
      { error: "Export failed", correlationId: correlationId() },
      { status: 500 }
    )
  }
}
