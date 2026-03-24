import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET - Fetch buyer's trade-in info for current shortlist
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shortlistId = searchParams.get("shortlistId")

    const query = supabase
      .from("TradeIn")
      .select("*")
      .eq("buyerId", user.userId)
      .order("createdAt", { ascending: false })

    if (shortlistId) {
      query.eq("shortlistId", shortlistId)
    }

    const { data: tradeIn } = await query.limit(1).maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        tradeIn: tradeIn
          ? {
              id: tradeIn.id,
              hasTrade: tradeIn.hasTrade,
              vin: tradeIn.vin,
              mileage: tradeIn.mileage,
              condition: tradeIn.condition,
              photoUrls: tradeIn.photoUrls || [],
              hasLoan: tradeIn.hasLoan,
              estimatedPayoffCents: tradeIn.estimatedPayoffCents,
              stepCompleted: tradeIn.stepCompleted,
              completedAt: tradeIn.completedAt,
            }
          : null,
      },
    })
  } catch (error: any) {
    console.error("[TradeIn API] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch trade-in info" }, { status: 500 })
  }
}

// POST - Create or update trade-in info
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { shortlistId, hasTrade, vin, mileage, condition, photoUrls, hasLoan, estimatedPayoffCents, skipTradeIn } =
      body

    // Validate shortlistId if provided
    if (shortlistId) {
      const { data: shortlist } = await supabase
        .from("Shortlist")
        .select("id")
        .eq("id", shortlistId)
        .eq("buyerId", user.userId)
        .maybeSingle()

      if (!shortlist) {
        return NextResponse.json({ success: false, error: "Shortlist not found" }, { status: 404 })
      }
    }

    const query = supabase.from("TradeIn").select("*").eq("buyerId", user.userId)

    if (shortlistId) {
      query.eq("shortlistId", shortlistId)
    }

    const { data: existing } = await query.maybeSingle()

    const stepCompleted = skipTradeIn || hasTrade !== undefined

    const tradeInData = {
      hasTrade: skipTradeIn ? false : (hasTrade ?? false),
      vin: vin || null,
      mileage: mileage || null,
      condition: condition || null,
      photoUrls: photoUrls || [],
      hasLoan: hasLoan ?? null,
      estimatedPayoffCents: estimatedPayoffCents || null,
      stepCompleted,
      completedAt: stepCompleted ? new Date().toISOString() : null,
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from("TradeIn")
        .update(tradeInData)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        data: { tradeIn: updated },
      })
    } else {
      const { data: created, error } = await supabase
        .from("TradeIn")
        .insert({
          ...tradeInData,
          buyerId: user.userId,
          shortlistId: shortlistId || null,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        data: { tradeIn: created },
      })
    }
  } catch (error: any) {
    console.error("[TradeIn API] POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to save trade-in info" }, { status: 500 })
  }
}
