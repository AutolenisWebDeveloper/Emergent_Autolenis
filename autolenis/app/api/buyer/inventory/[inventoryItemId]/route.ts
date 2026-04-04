import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { InventoryService } from "@/lib/services/inventory.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/buyer/inventory/:inventoryItemId - Get vehicle detail for buyer
export async function GET(_req: NextRequest, { params }: { params: Promise<{ inventoryItemId: string }> }) {
  try {
    const { inventoryItemId } = await params
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const item = await InventoryService.getById(inventoryItemId)

    if (!item) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    if (item.status !== "AVAILABLE") {
      return NextResponse.json({ error: "This vehicle is no longer available", status: item.status }, { status: 410 })
    }

    const supabase = await createClient()

    const { data: prequal } = await supabase
      .from("PreQualification")
      .select("*")
      .eq("buyerId", user.userId)
      .gt("expiresAt", new Date().toISOString())
      .eq("prequalStatus", "APPROVED")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()

    const maxBudgetCents = prequal?.maxOtdAmountCents || (prequal?.maxOtd ? Math.round(prequal.maxOtd * 100) : null)
    const withinBudget = maxBudgetCents ? item.priceCents <= maxBudgetCents : null

    return NextResponse.json({
      success: true,
      inventoryItem: item,
      budgetContext: {
        maxBudgetCents,
        withinBudget,
        hasActivePrequal: !!prequal,
      },
    })
  } catch (error) {
    console.error("[v0] Buyer inventory detail error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle details" }, { status: 500 })
  }
}
