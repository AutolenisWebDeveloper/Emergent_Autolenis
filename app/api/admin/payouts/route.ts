import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: [] })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data, error } = await supabase
      .from("Payout")
      .select("*, affiliate:Affiliate(*)")
      .order("createdAt", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error("[AdminPayouts GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, message: "Payout created" })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const { affiliateId, amount, notes } = body
    if (!affiliateId || !amount) {
      return NextResponse.json({ error: "affiliateId and amount are required" }, { status: 400 })
    }

    const { data: payout, error } = await supabase
      .from("Payout")
      .insert({
        affiliateId,
        amountCents: Math.round(amount * 100),
        status: "PENDING",
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to create payout" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: payout }, { status: 201 })
  } catch (error) {
    console.error("[AdminPayouts POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
