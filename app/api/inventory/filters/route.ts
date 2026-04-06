import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getSupabase()

    // Get unique makes from available inventory
    const { data: makeData } = await supabase
      .from("InventoryItem")
      .select("make")
      .eq("status", "AVAILABLE")
      .not("make", "is", null)

    const makes = [...new Set((makeData || []).map((r: { make: string }) => r.make).filter(Boolean))].sort()

    // Get unique body styles
    const { data: bodyData } = await supabase
      .from("InventoryItem")
      .select("bodyStyle")
      .eq("status", "AVAILABLE")
      .not("bodyStyle", "is", null)

    const bodyStyles = [...new Set((bodyData || []).map((r: { bodyStyle: string }) => r.bodyStyle).filter(Boolean))].sort()

    return NextResponse.json({
      success: true,
      data: { makes, bodyStyles },
    })
  } catch (error: unknown) {
    console.error("[Inventory Filters]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
